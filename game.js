const canvas = document.querySelector("canvas")
const ctx = canvas.getContext("2d")

//====================
// Screen scaling
//====================
const BASE_WIDTH = 400
const BASE_HEIGHT = 700

let scale = 1

function resize(){

  scale = Math.floor(Math.min(
    window.innerWidth / BASE_WIDTH,
    window.innerHeight / BASE_HEIGHT
  ))

  if(scale < 1){
    scale = 1
  }

  canvas.width = BASE_WIDTH
  canvas.height = BASE_HEIGHT

  canvas.style.width = BASE_WIDTH * scale + "px"
  canvas.style.height = BASE_HEIGHT * scale + "px"

  ctx.imageSmoothingEnabled = false
}

window.addEventListener("resize", resize)
resize()

//====================
// INPUT STATE SYSTEM
//====================
const inputState = {
  touches: {},
  keys: {}
}

function getPos(e){

  const rect = canvas.getBoundingClientRect()

  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  }
}

// POINTER DOWN
canvas.addEventListener("pointerdown", (e) => {

  const p = getPos(e)

  inputState.touches[e.pointerId] = {
    x: p.x,
    y: p.y,

    down: true,
    pressed: true,
    released: false
  }

})

// POINTER MOVE
canvas.addEventListener("pointermove", (e) => {

  const t = inputState.touches[e.pointerId]
  if(!t) return

  const p = getPos(e)

  t.x = p.x
  t.y = p.y

})

// POINTER UP
canvas.addEventListener("pointerup", (e) => {

  const t = inputState.touches[e.pointerId]
  if(!t) return

  t.down = false
  t.released = true

})

// POINTER CANCEL
canvas.addEventListener("pointercancel", (e) => {

  const t = inputState.touches[e.pointerId]
  if(!t) return

  t.down = false
  t.pressed = false
  t.released = true

})

// KEYBOARD
window.addEventListener("keydown", (e) => {
  inputState.keys[e.code] = true
})

window.addEventListener("keyup", (e) => {
  inputState.keys[e.code] = false
})

//=================
//UTILS
//=================
function clamp(value, min, max){
  return Math.max(min, Math.min(max, value))
}

function to01(v){
  return v / 100
}

function to100(v){
  return v * 100
}

//====================
// INPUT API
//====================
const input = {

  down(rect){

    for(const id in inputState.touches){
      const t = inputState.touches[id]

      if(
        t.x >= rect.x &&
        t.x <= rect.x + rect.w &&
        t.y >= rect.y &&
        t.y <= rect.y + rect.h
      ){
        if(t.down) return true
      }
    }

    return false
  },

  press(rect){

    for(const id in inputState.touches){
      const t = inputState.touches[id]

      if(
        t.x >= rect.x &&
        t.x <= rect.x + rect.w &&
        t.y >= rect.y &&
        t.y <= rect.y + rect.h
      ){
        if(t.pressed) return true
      }
    }

    return false
  },

  release(rect){

    for(const id in inputState.touches){
      const t = inputState.touches[id]

      if(
        t.x >= rect.x &&
        t.x <= rect.x + rect.w &&
        t.y >= rect.y &&
        t.y <= rect.y + rect.h
      ){
        if(t.released) return true
      }
    }

    return false
  },

  key(code){
    return !!inputState.keys[code]
  }
}

// RESET INPUT
function resetInput(){

  for(const id in inputState.touches){
    const t = inputState.touches[id]

    t.pressed = false
    t.released = false

    if(!t.down){
      delete inputState.touches[id]
    }
  }

}

//==============================
//SPRITES GRID SISTEM(SGS) API
//==============================
const sgs = {

  drawSprite(sprite, x, y, size, camera,colors){

    for(let row = 0; row < sprite.length; row++){
      for(let col = 0; col < sprite[row].length; col++){

        const pixel = sprite[row][col]

        if(pixel === 0) continue

        ctx.fillStyle = colors[pixel]

        ctx.fillRect(
  Math.round(((x + col * size) - camera.x) * camera.zoom),
  Math.round(((y + row * size) - camera.y) * camera.zoom),
  Math.ceil(size * camera.zoom),
  Math.ceil(size * camera.zoom)
)
      }
    }
  },
  getPixelBounds(sprite, size) {

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  let hasPixel = false;

  for (let y = 0; y < sprite.length; y++) {
    for (let x = 0; x < sprite[y].length; x++) {

      if (sprite[y][x] !== 0) {

        hasPixel = true;

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixel) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  return {
    x: minX * size,
    y: minY * size,
    w: (maxX - minX + 1) * size,
    h: (maxY - minY + 1) * size
  };
}
}

//Sprites Animation
const anim = {

  create(sprites, frameDelay){

    return {
      sprites,
      frameDelay,
      frame: 0,
      timer: 0,
      playing: false,
      current: null
    }

  },

  play(a){
    a.playing = true
  },

  stop(a){
    a.playing = false
  },

  set(a, name){

  if(!a.sprites[name]){
    console.warn("Animação não existe:", name)
    return
  }

  // se já estiver nessa animação, não faz nada
  if(a.current === a.sprites[name]) return

  a.current = a.sprites[name]
  a.frame = 0
  a.timer = 0

},

  update(a, dt){

    if(!a.playing || !a.current) return

    a.timer += dt

    if(a.timer >= a.frameDelay){
      a.timer = 0
      a.frame++

      if(a.frame >= a.current.length){
        a.frame = 0
      }
    }

  },

  getFrame(a){

    if(!a.current) return null

    return a.current[a.frame]
  }

}

//camera
const camera = {
  x: 0,
  y: 0,
  zoom: 1
}

//==================
//SISTEM SOUND API
//==================
const audio = new AudioContext();

const sound = {  

  beep(type = "square", freq = 440, volume = 0.2, time = 0.1) {  

    if (audio.state === "suspended") audio.resume();  

    const osc = audio.createOscillator();  
    const gain = audio.createGain();  

    osc.type = type;  
    osc.frequency.value = freq;  
    gain.gain.value = volume;  

    osc.connect(gain);  
    gain.connect(audio.destination);  

    osc.start();  

    setTimeout(() => {  
      osc.stop();  
    }, time * 1000);  
  },  

  music: {  
    sequence: [],  
    index: 0,  
    timer: 0,  
    playing: false,  

    play(seq) {  
      this.sequence = seq;  
      this.index = 0;  
      this.timer = 0;  
      this.playing = true;  
    },  

    update(dt) {  

      if (!this.playing) return;  

      if (this.index >= this.sequence.length) {  
        this.playing = false;  
        return;  
      }  

      const note = this.sequence[this.index];  

      this.timer += dt;  

      if (this.timer >= note.delay) {  

        this.timer = 0;  

        sound.beep(
          note.type,
          note.freq,
          note.volume,
          note.time
        )

        this.index++
      }
    }
  }
}

//========
//UI API
//========
const ui = {

  button(a){

    ctx.fillStyle = a.color

    ctx.beginPath()

    ctx.roundRect(
      a.x,
      a.y,
      a.w,
      a.h,
      a.r
    )

    ctx.fill()

    if(a.border_color){

      ctx.strokeStyle = a.border_color
      ctx.lineWidth = a.border_size || 2
      ctx.stroke()
    }

    ctx.closePath()

    if(a.text){

      ctx.font = a.font || "20px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = a.text_color || "white"

      ctx.fillText(
        a.text,
        a.x + a.w / 2,
        a.y + a.h / 2
      )
    }
  },

  bar(a){

    let value = clamp(a.value, 0, 1)

    ctx.fillStyle = a.bg || "#222"

    ctx.beginPath()

    ctx.roundRect(
      a.x,
      a.y,
      a.w,
      a.h,
      a.r || 0
    )

    ctx.fill()

    ctx.fillStyle = a.color || "lime"

    ctx.beginPath()

    ctx.roundRect(
      a.x,
      a.y,
      a.w * value,
      a.h,
      a.r || 0
    )

    ctx.fill()

    if(a.border_color){

      ctx.strokeStyle = a.border_color
      ctx.lineWidth = a.border_size || 2
      ctx.stroke()
    }

    ctx.closePath()
  }
}

//===========
//DEGUB API
//===========
const debug = {

  hitboxAll(a,camera){

    for(let b of a){

      ctx.save()

      ctx.strokeStyle = "lime"
      ctx.lineWidth = 2

      ctx.strokeRect(
        (b.x - camera.x) * camera.zoom,
        (b.y - camera.y) * camera.zoom,
        b.w * camera.zoom,
        b.h * camera.zoom
      )

      ctx.restore()
    }
  },
  hitbox(a,camera){
    ctx.save()

      ctx.strokeStyle = "lime"
      ctx.lineWidth = 2

      ctx.strokeRect(
        (a.x - camera.x) * camera.zoom,
        (a.y - camera.y) * camera.zoom,
        a.w * camera.zoom,
        a.h * camera.zoom
      )

      ctx.restore()
  },
  position(a){
    let c = 10
    ctx.fillText(`x:${a.x}`,100,c)
    ctx.fillText(`y:${a.y}`,100,c + 30)
  }
}
//=========
//Logics API
//=========
const logics = {
  hitbox(a,b){
   return(    
      a.x + a.w > b.x &&    
      a.x < b.x + b.w &&    
      a.y < b.y + b.h &&    
      a.y + a.h > b.y)    
  },
  
  gravity(a, dt){
    
    a.lastY = a.y
    a.yV += a.gV * dt 
    a.y += a.yV * dt
    if(a.y > 10000){
      a.yV = 0
      a.x = a.respawnX
      a.y = a.respawnY
    }
  },
  limitChao(a, b){

  if(

    a.x + a.w > b.x &&
    a.x < b.x + b.w &&

    a.yV >= 0 &&

    a.lastY + a.h <= b.y &&
    a.y + a.h >= b.y

  ){

    a.y = b.y - a.h
    a.yV = 0
    a.grounded = true

  }
},
perseguir(inimigo, alvo, speed){

  const dx = alvo.x - inimigo.x
  const dy = alvo.y - inimigo.y

  const dist = Math.hypot(dx, dy)

  if(dist > 0){

    inimigo.xV = (dx / dist) * speed
    inimigo.yV = (dy / dist) * speed

  }
}
}
//==============
//ENTITIES API
//==============
class Entity {
  constructor(a){
    this.data = a
    this.x = a.x ?? 0;
    this.y = a.y ?? 0;
    this.w = (a.w ?? 0);
    this.h = (a.h ?? 0);
    this.respawnX = a.respawnX ?? canvas.width/ 2;
    this.respawnY = a.respawnY ?? canvas.height/2;
    this.xV = 0;
    this.yV = 0;
    this.gV = a.gV ?? 500;
    this.lastY = 0;
    this.grounded = a.grounded ?? false;
    
    this.active = a.active ?? true;

    this.size = a.size ?? 6;
    this.colors = a.colors;
    this.anim = a.anim ?? null;
    this.camera = a.camera ?? cameraPlayer;
    
    this.superficie = a.superficie ?? null;
  }

  update(dt){

  this.grounded = false;

  let frame = this.anim ? anim.getFrame(this.anim) : null;

  if(frame){
    this.w = frame[0].length * this.size;
    this.h = frame.length * this.size;
  }

  logics.gravity(this, dt)

  if(this.superficie){
    logics.limitChao(this, this.superficie);
  }

  // MOVIMENTO
  this.x += this.xV * dt;

  // PIXEL PERFECT
  this.x = Math.round(this.x)
  this.y = Math.round(this.y)
}
  draw(){

    if(this.anim){

      anim.update(this.anim, ge.deltaTime)

      const frame = anim.getFrame(this.anim)

      sgs.drawSprite(
        frame,
        this.x,
        this.y,
        this.size,
        this.camera,
        this.colors
      )
    }
  }
  reset(){
  const a = this.data;

  this.x = a.x ?? 0;
  this.y = a.y ?? 0;

  this.xV = 0;
  this.yV = 0;

  this.lastY = 0;
  this.grounded = a.grounded ?? false;

  this.anim = null;
}
}
//========================
//GORILLA ENGINE(GE(1.4))
//========================
class Engine {

  constructor(){

    this.ui = ui
    this.debug = debug
    this.sound = sound
    this.sgs = sgs
    this.anim = anim
    this.buttons = []
    this.entities = []

    this.scenes = {}
    this.nowScene = null

    this.loop = this.loop.bind(this)

    this.deltaTime = 0
    this.lastTime = 0
  }

  addEntity(a){
    this.entities.push(a)
    
    return a
  }
  
  drawEntities(){

    for(let e of this.entities){

      if(e.active === false) continue

      if(e.draw){
        e.draw()
      }
    }
  }

  updateEntities(dt){

    for(let e of this.entities){

      if(e.active === false) continue

      if(e.update){
        e.update(dt)
      }
    }
  }

  addScene(name,scene){
    this.scenes[name] = scene
  }

  setScene(scene){

  for(let e of this.entities){
    if(e.reset){
      e.reset()
    }
  }

  for(let e of this.buttons){
    e.active = false;
    e.acao = () => {
      alert("ação não definida")
    }
  }

  cameraPlayer.x = 0
  cameraPlayer.y = 0
  cameraPlayer.zoom = 1

  this.nowScene = scene
  this.scenes[scene]?.info?.()
}
  
    
  
  addButton(a){
    this.buttons.push(a)
    
    return a
  }
  
  drawButtons(){
    for(let e of this.buttons){
      if(e.active === false) continue;
      if(e.draw){
      e.draw();
      }
    }
  }

  loop(time){

    this.deltaTime = (time - this.lastTime) / 1000
    this.lastTime = time

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    )

    let a = this.scenes[this.nowScene]

    a?.update?.(this.deltaTime)

    sound.music.update(this.deltaTime)

    this.updateEntities(this.deltaTime)

    a?.draw?.()

    this.drawEntities()
    this.drawButtons();

    resetInput()
    
    

    requestAnimationFrame(this.loop)
  }
}

const ge = new Engine

//===========
//WORKSPACE
//===========

//Ui space
let Btn_1 = {

  x: 275,
  y: 600,
  w: 100,
  h: 50,
  r: 10,
  
  active: false,
  
  color: "red",
  border_color: "white",
  text: "B",
  
  acao(){
    
  },
  
  draw(){
    ui.button(this)
  }
}
let Btn_2 = {

  x: 150,
  y: 600,
  w: 100,
  h: 50,
  r: 10,
  
  active: false,
  
  color: "blue",
  border_color: "white",
  text: "X",
  
  acao(){
    
  },
  
  draw(){
    ui.button(this)
  }
}
let Btn_3 = {

  x: 25,
  y: 600,
  w: 100,
  h: 50,
  r: 10,
  
  active: false,
  
  color: "green",
  border_color: "white",
  text: "Y",
  
  acao(){
    
  },
  
  draw(){
    ui.button(this)
  }
}

let Btn_4 = {

  x: 150,
  y: 600,
  w: 100,
  h: 50,
  r: 10,
  
  active: false,
  
  color: "green",
  border_color: "white",
  text: "Continue",
  
  acao(){
    
  },
  
  draw(){
    ui.button(this)
  }
}
//Palhetas e Cameras
const cameraPlayer = {
  x: 0,
  y: 0,
  zoom: 1,
  follow(target, smooth = 0.1){

  const targetX = target.x + target.w / 2
  const targetY = target.y + target.h / 2

  const desiredX = targetX - canvas.width / 2
  const desiredY = targetY - canvas.height / 2

  this.x += (desiredX - this.x) * smooth
  this.y += (desiredY - this.y) * smooth

  // PIXEL PERFECT
  this.x = Math.round(this.x)
  this.y = Math.round(this.y)
}
}  

//Environment space
let cena_007 = {
  chao: {
    x: 0,
    y: 500,
    w: 1000,
    h: 700
  },
  update(){
    
  },
  draw(){

  ctx.fillStyle = "blue"
  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  )

  ctx.fillStyle = "#674835f5"
  ctx.fillRect(
    (this.chao.x - cameraPlayer.x) * cameraPlayer.zoom,
    (this.chao.y - cameraPlayer.y) * cameraPlayer.zoom,
    this.chao.w * cameraPlayer.zoom,
    this.chao.h * cameraPlayer.zoom
  )

  ctx.fillStyle = "#5dd174f5"

  ctx.fillRect(
    (0 - cameraPlayer.x) * cameraPlayer.zoom,
    (500 - cameraPlayer.y) * cameraPlayer.zoom,
    1000 * cameraPlayer.zoom,
    25 * cameraPlayer.zoom
  )
}
}

let scene_gameOver = {
  chao: {
    x: 0,
    y: 500,
    w: canvas.width,
    h: canvas.height
  },
  draw(){
    ctx.fillStyle = "blue"
    ctx.fillRect(
      0,0,
      (canvas.width - cameraPlayer.x) * cameraPlayer.zoom,
      (canvas.height - cameraPlayer.y) * cameraPlayer.zoom
      )
    ctx.fillStyle = "gray"
    ctx.font = "30px Arial"
    ctx.fillText(
      `score:${Math.round(time)}`,
      canvas.width/2,270
      )
    ctx.fillStyle = "red"
    ctx.font = "30px Arial"
    ctx.fillText(
      "GAME OVER",
      canvas.width / 2,
      300
      )
    ctx.fillStyle = "#674835f5"
    ctx.fillRect(
      (this.chao.x - cameraPlayer.x) * cameraPlayer.zoom,
      (this.chao.y - cameraPlayer.y) * cameraPlayer.zoom,
      this.chao.w,
      this.chao.h
      )
    ctx.fillStyle = "#5dd174f5"
    ctx.fillRect(
      (this.chao.x - cameraPlayer.x) * cameraPlayer.zoom,
      (this.chao.y - cameraPlayer.y) * cameraPlayer.zoom,
      this.chao.w,
      30
      )
  }
}
//Entities space
let player = {
  x: 100,
  y: 100,
  w: 0,
  h: 0,
  respawnX: 300,
  respawnY: -500,
  active: false,
  grounded: true,
  superficie: cena_007.chao,
  size: 6,
  colors: {
    1: "red",
    2: "green",
    3: "blue",
    4: "#ffffff"
  },
  anim: null,
  camera: cameraPlayer,
  
  gV: 500,
  yV: 0,
  xV: 0,
  
  sprites: {
    idle: [
      [
      [2,2,2,2,2],
      [2,4,4,4,2],
      [2,4,4,4,2],
      [2,4,4,4,2],
      [2,2,2,2,2],
      ],
      [
      [2,2,2,2,2],
      [2,4,4,4,2],
      [2,4,4,4,2],
      [2,4,4,4,2],
      [2,2,2,2,2],
      ]
    
    ],
    runRight:  [
      [
      [2,2,2,2,2],
      [2,2,4,4,2],
      [2,2,2,4,2],
      [2,2,4,4,2],
      [2,2,2,2,2],
      ],
      [
      [2,2,2,2,2],
      [2,2,4,4,2],
      [2,2,2,4,2],
      [2,2,4,4,2],
      [2,2,2,2,2],
      ]
    
    ],
    runLeft:[
    [
    [2,2,2,2,2],
    [2,4,4,2,2],
    [2,4,2,2,2],
    [2,4,4,2,2],
    [2,2,2,2,2],
    ],
    [
    [2,2,2,2,2],
    [2,4,4,2,2],
    [2,4,2,2,2],
    [2,4,4,2,2],
    [2,2,2,2,2],
    ]
    ]
  },
  reset(){
    this.active = false;
  }
}
let enemy = {
  x: 1000,
  y: 100,
  w: 30,
  h: 30,
  active: false,
  grounded: true,
  
  state: "idleTutorial",

  superficie: cena_007.chao,

  size: 6,

  colors: {
    1: "white",
    2: "purple",
    4: "black",
    5: "#fad69c",
    6: "#fa9afc"
  },

  camera: cameraPlayer,

  gV: 500,

  sprites: {
    idleTutorial: [
      [
      [2,2,2,2,2,2,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,2,2,2,2,2,2],
      ],
      [
      [2,2,2,2,2,2,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,2,2,2,2,2,2],
      ]
    ],
    loser: [
      [
      [2,2,2,2,2,2,2],
      [2,4,6,6,6,4,2],
      [2,4,5,5,5,4,2],
      [2,4,5,5,5,4,2],
      [2,5,5,5,5,5,2],
      [2,5,5,4,5,5,2],
      [2,2,2,2,2,2,2],
      ],
      [
      [2,2,2,2,2,2,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,4,4,4,4,4,2],
      [2,2,2,2,2,2,2],
      ]
      ]
  }
}


//Scenes space
let time = 0
let scene_test = {

  info(){
  player_Ent.active = true;
  enemy_Ent.active = true;
  
  player_Ent.anim = anim.create(player.sprites, 0.2)
  anim.set(player_Ent.anim,"idle")
  anim.play(player_Ent.anim)
  
  enemy_Ent.anim = anim.create(enemy.sprites, 0.2)
  anim.set(enemy_Ent.anim,"idleTutorial")
  anim.play(enemy_Ent.anim)
  
  Btn_1.active = true;
  
  Btn_2.active = true;
  
  Btn_3.active = true;
  Btn_3.acao = () => {
    if(player_Ent.grounded){
      player_Ent.yV = -400
      sound.music.play([
{
  type: "square",freq: 500, 
  volume: 0.1, time: 0.01, delay: 0
},
{
  type: "square",
  freq: 140,
  volume: 0.2,
  time: 0.02,
  delay: 0.3
},
{
  type: "triangle",
  freq: 90,
  volume: 0.1,
  time: 0.04,
  delay: 0.5
}
      ])
    }
  }
  
  Btn_1.acao = () => {
    anim.set(player_Ent.anim,"runRight")
    player_Ent.xV += 400
    
  }
  Btn_2.acao = () => {
    anim.set(player_Ent.anim,"runLeft")
    player_Ent.xV -= 400
  }
  Btn_2.text = "Left"
  Btn_1.text = "Right"
  Btn_3.text = "Up"
  
  Btn_2.color = "blue";
  Btn_3.color = "green";
  Btn_1.color = "red";
  Btn_1.x = 270;
},


  update(){
    time += ge.deltaTime
    Btn_2.color = "blue";
    Btn_3.color = "green";
    Btn_1.color = "red"
    
    player_Ent.xV = 0
    cameraPlayer.zoom = 0.5
    cameraPlayer.follow(player_Ent,0.05)
    logics.perseguir(enemy_Ent,player_Ent,
    300)
    anim.set(player_Ent.anim,"idle")
    if(input.down(Btn_3) || input.key("ArrowUp")
    || input.key("KeyW")){
      Btn_3.acao();
    }
    if(input.down(Btn_1) || input.key("ArrowRight") ||
    input.key("KeyA")){
      Btn_1.acao();
    }
    if(input.down(Btn_2) || input.key("ArrowLeft")
    || input.key("KeyD")){
      Btn_2.acao();
    }
    if(input.press(Btn_2)){
      sound.music.play([
{
  type: "square",freq: 500, 
  volume: 0.1, time: 0.01, delay: 0
},
{
  type: "square",
  freq: 140,
  volume: 0.2,
  time: 0.02,
  delay: 0.3
},
{
  type: "triangle",
  freq: 90,
  volume: 0.1,
  time: 0.04,
  delay: 0.5
}
      ])
    }
    if(input.press(Btn_1)){
      sound.music.play([
{
  type: "square",freq: 500, 
  volume: 0.1, time: 0.01, delay: 0
},
{
  type: "square",
  freq: 140,
  volume: 0.2,
  time: 0.02,
  delay: 0.3
},
{
  type: "triangle",
  freq: 90,
  volume: 0.1,
  time: 0.04,
  delay: 0.5
}
      ])
    }
  if(input.down(Btn_2) && input.down(Btn_1)){
    anim.set(player_Ent.anim,"idle")
  }
  if(logics.hitbox(enemy_Ent,player_Ent)||
    player_Ent.y > 9000){
    sound.music.play([
      {
      type: "square", freq: 100, volume: 1,
      time: 0.1, delay: 0
      }
      ])
    ge.setScene("008")
  }

  },

  draw(){
    cena_007.draw();
    
    
  }
}
 let cena_gameOver = {
   info(){
     enemy_Ent.active = true;
     
     enemy_Ent.anim = anim.create(enemy.sprites, 0.5)
    enemy_Ent.x = 200
    enemy_Ent.y = 450
    anim.set(enemy_Ent.anim,"loser")
    anim.play(enemy_Ent.anim)
    anim.update(enemy_Ent.anim,0)
    enemy_Ent.superficie = scene_gameOver.chao
    
    Btn_4.active = true;
    
    
 
    Btn_4.acao = () => {
      ge.setScene("007")
      time = 0
    }
   },
   update(){

     
     if(input.press(Btn_4)){
       Btn_4.acao();
     }
     
     if(input.key("space")){
     Btn_4.acao();
     }
   },
   draw(){
  scene_gameOver.draw();
  if(time > 30){
    anim.set(enemy_Ent.anim)
  }

  }
}
//adds to Engine
ge.addScene("007",scene_test)
ge.addScene("008",cena_gameOver)
let player_Ent = ge.addEntity(new Entity(player))

let enemy_Ent = ge.addEntity(new Entity(enemy))
ge.addButton(Btn_1)
ge.addButton(Btn_2)
ge.addButton(Btn_3)
ge.addButton(Btn_4)
//Motor
ge.setScene("007")
requestAnimationFrame(ge.loop)