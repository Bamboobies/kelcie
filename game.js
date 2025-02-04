const config = {
  type: Phaser.AUTO,
  width: 400,
  height: 600,
  backgroundColor: '#87CEEB', // Light blue background
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1 },
      enableSleeping: true
    }
  },
  scene: {
    preload,
    create,
    update
  }
}

const PIPE_GAP = 150
const PIPE_SPEED = -2
const PIPE_SPAWN_INTERVAL = 2000

let bird
let pipes = []
let isGameOver = false

const game = new Phaser.Game(config)

function preload() {}

function create() {
  // Create the bird
  bird = this.matter.add.rectangle(100, 300, 30, 30, {
    restitution: 0.5,
    frictionAir: 0.02
  })

  this.input.on('pointerdown', flap, this)
  this.input.keyboard.on('keydown-SPACE', flap, this)

  // Spawn pipes at intervals
  this.time.addEvent({
    delay: PIPE_SPAWN_INTERVAL,
    callback: spawnPipes,
    callbackScope: this,
    loop: true
  })
}

function update() {
  if (isGameOver) return

  // Check if bird hits the ground
  if (bird.position.y > config.height || bird.position.y < 0) {
    gameOver.call(this)
  }

  // Move pipes
  pipes.forEach(pipe => {
    Matter.Body.setVelocity(pipe.body, { x: PIPE_SPEED, y: 0 })
    if (pipe.body.position.x < -50) {
      pipe.destroy()
      pipes.shift()
    }
  })
}

function flap() {
  if (isGameOver) return
  Matter.Body.setVelocity(bird, { x: 0, y: -5 })
}

function spawnPipes() {
  let pipeX = config.width + 50
  let pipeY = Phaser.Math.Between(100, 400)

  let topPipe = this.matter.add.rectangle(pipeX, pipeY - PIPE_GAP / 2 - 200, 80, 200, { isStatic: true })
  let bottomPipe = this.matter.add.rectangle(pipeX, pipeY + PIPE_GAP / 2, 80, 200, { isStatic: true })

  let topCap = this.matter.add.rectangle(pipeX, pipeY - PIPE_GAP / 2, 80, 20, { isStatic: true })
  let bottomCap = this.matter.add.rectangle(pipeX, pipeY + PIPE_GAP / 2 + 200, 80, 20, { isStatic: true })

  pipes.push(topPipe, bottomPipe, topCap, bottomCap)

  // Coloring pipes green
  this.add.rectangle(pipeX, pipeY - PIPE_GAP / 2 - 200, 80, 200, 0x008000)
  this.add.rectangle(pipeX, pipeY + PIPE_GAP / 2, 80, 200, 0x008000)
  this.add.rectangle(pipeX, pipeY - PIPE_GAP / 2, 80, 20, 0x006600)
  this.add.rectangle(pipeX, pipeY + PIPE_GAP / 2 + 200, 80, 20, 0x006600)
}

function gameOver() {
  isGameOver = true
  this.matter.world.pause()
}
