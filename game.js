const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#87CEEB',
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

let bird
let pipes = []
let isGameOver = false
let isGameStarted = false
let startText, restartText

const PIPE_GAP = 200
const PIPE_SPEED = -3
const PIPE_SPAWN_INTERVAL = 1800

const game = new Phaser.Game(config)

function preload() {}

function create() {
  this.scale.on('resize', resizeGame, this)

  startText = this.add.text(config.width / 2, config.height / 2, 'Tap to Start', {
    fontSize: '32px',
    fill: '#fff'
  }).setOrigin(0.5)

  restartText = this.add.text(config.width / 2, config.height / 2 + 100, 'Tap to Restart', {
    fontSize: '32px',
    fill: '#fff'
  }).setOrigin(0.5).setVisible(false)

  this.input.on('pointerdown', startGame, this)
  this.input.keyboard.on('keydown-SPACE', startGame, this)
}

function startGame() {
  if (isGameStarted) return
  isGameStarted = true
  startText.setVisible(false)

  bird = this.matter.add.rectangle(config.width / 4, config.height / 2, 40, 40, {
    restitution: 0.5,
    frictionAir: 0.02
  })

  this.input.on('pointerdown', flap, this)
  this.input.keyboard.on('keydown-SPACE', flap, this)

  this.time.addEvent({
    delay: PIPE_SPAWN_INTERVAL,
    callback: spawnPipes,
    callbackScope: this,
    loop: true
  })
}

function update() {
  if (!isGameStarted || isGameOver) return

  if (bird.position.y > config.height || bird.position.y < 0) {
    gameOver.call(this)
  }

  pipes.forEach(pipe => {
    Matter.Body.setVelocity(pipe.body, { x: PIPE_SPEED, y: 0 })
    if (pipe.body.position.x < -100) {
      pipe.destroy()
      pipes.shift()
    }
  })
}

function flap() {
  if (isGameOver) return
  Matter.Body.setVelocity(bird, { x: 0, y: -7 })
}

function spawnPipes() {
  let pipeX = config.width + 50
  let pipeY = Phaser.Math.Between(150, config.height - 150)

  let topPipe = this.matter.add.rectangle(pipeX, pipeY - PIPE_GAP / 2 - 250, 100, 250, { isStatic: true })
  let bottomPipe = this.matter.add.rectangle(pipeX, pipeY + PIPE_GAP / 2, 100, 250, { isStatic: true })

  let topCap = this.matter.add.rectangle(pipeX, pipeY - PIPE_GAP / 2, 100, 20, { isStatic: true })
  let bottomCap = this.matter.add.rectangle(pipeX, pipeY + PIPE_GAP / 2 + 250, 100, 20, { isStatic: true })

  pipes.push(topPipe, bottomPipe, topCap, bottomCap)

  this.add.rectangle(pipeX, pipeY - PIPE_GAP / 2 - 250, 100, 250, 0x008000)
  this.add.rectangle(pipeX, pipeY + PIPE_GAP / 2, 100, 250, 0x008000)
  this.add.rectangle(pipeX, pipeY - PIPE_GAP / 2, 100, 20, 0x006600)
  this.add.rectangle(pipeX, pipeY + PIPE_GAP / 2 + 250, 100, 20, 0x006600)
}

function gameOver() {
  isGameOver = true
  this.matter.world.pause()
  restartText.setVisible(true)

  this.input.once('pointerdown', restartGame, this)
  this.input.keyboard.once('keydown-SPACE', restartGame, this)
}

function restartGame() {
  this.scene.restart()
  isGameOver = false
  isGameStarted = false
}

function resizeGame() {
  game.scale.resize(window.innerWidth, window.innerHeight)
}
