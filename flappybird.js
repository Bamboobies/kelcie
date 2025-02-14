// === GAME SETTINGS ===
const GRAVITY = 900
const FLAP_STRENGTH = -300
const PIPE_SPEED = -200
const PIPE_GAP = 175
const PIPE_WIDTH = 80
const PIPE_CAP_HEIGHT = 20
const PIPE_SPAWN_DELAY = 1550
const BACKGROUND_SPEED = -10

let game, bird, pipes, scoreZones, scoreText, highScoreText
let titleText, startText, gameOverText, restartText
let score = 0, highScore = 0, gameStarted = false, gameOver = false
let background1, background2

window.onload = () => {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY }, debug: false } },
    scene: { preload, create, update }
  })
}

function preload() {
  this.load.image('bird', 'https://i.postimg.cc/prdzpSD2/trimmed-image.png')
  this.load.image('background', 'https://i.ibb.co/2XWRWxZ/1739319234354.jpg')
}

function create() {
  const scene = this
  const gameWidth = game.scale.width
  const gameHeight = game.scale.height

  // Background setup
  const imageWidth = this.textures.get('background').getSourceImage().width
  const imageHeight = this.textures.get('background').getSourceImage().height
  const scaleFactor = gameHeight / imageHeight
  const scaledWidth = imageWidth * scaleFactor

  background1 = this.add.sprite(0, 0, 'background').setOrigin(0, 0)
  background2 = this.add.sprite(scaledWidth, 0, 'background').setOrigin(0, 0)
  background1.setScale(scaleFactor)
  background2.setScale(scaleFactor)

  bird = this.physics.add.sprite(gameWidth * 0.2, gameHeight / 2, 'bird').setOrigin(0.5).setScale(0.0915)
  bird.body.setCollideWorldBounds(true)
  bird.body.allowGravity = false

  pipes = this.physics.add.group()
  scoreZones = this.physics.add.group()

  const textStyle = { fontFamily: '"Press Start 2P", sans-serif', fontSize: '20px', fill: '#fff' }
  const titleFontSize = Math.min(gameWidth * 0.075, 32)

  titleText = this.add.text(gameWidth / 2, gameHeight * 0.3, 'FLAPPY SHRIMP', { 
    fontFamily: '"Press Start 2P", sans-serif', fontSize: `${titleFontSize}px`, fill: '#ffcc00' 
  }).setOrigin(0.5)

  startText = this.add.text(gameWidth / 2, gameHeight * 0.5, 'TAP TO START', textStyle).setOrigin(0.5).setDepth(10)
  gameOverText = this.add.text(gameWidth / 2, gameHeight * 0.5, '', textStyle).setOrigin(0.5).setDepth(10)
  restartText = this.add.text(gameWidth / 2, gameHeight * 0.6, '', textStyle).setOrigin(0.5).setDepth(10)

  scoreText = this.add.text(20, 20, 'SCORE: 0', textStyle).setDepth(10)
  highScoreText = this.add.text(20, 50, 'HIGH SCORE: 0', textStyle).setDepth(10)

  this.input.on('pointerdown', () => {
    if (!gameStarted) startGame.call(scene)
    else if (gameOver) restartGame.call(scene)
    else flap()
  })

  this.physics.add.collider(bird, pipes, hitPipe, null, this)

  highScore = localStorage.getItem('flappyHighScore') || 0
  highScoreText.setText('HIGH SCORE: ' + highScore)

  createPipeTextures(this) // Create the pipe textures once
}

function update() {
  if (gameOver || !gameStarted) return

  background1.x += BACKGROUND_SPEED * (1 / 60)
  background2.x += BACKGROUND_SPEED * (1 / 60)

  if (background1.x + background1.displayWidth <= 0) background1.x = background2.x + background2.displayWidth
  if (background2.x + background2.displayWidth <= 0) background2.x = background1.x + background1.displayWidth

  bird.angle = Phaser.Math.Clamp(bird.angle + (bird.body.velocity.y > 0 ? 2 : -4), -20, 20)

  if (bird.body.blocked.down) hitPipe.call(this)

  checkScore()
}

function startGame() {
  gameStarted = true
  bird.body.allowGravity = true
  titleText.setText('')
  startText.setText('')
  addPipes() // Ensure pipes spawn immediately
  this.time.addEvent({ delay: PIPE_SPAWN_DELAY, loop: true, callback: addPipes, callbackScope: this })
}

function flap() {
  bird.body.setVelocityY(FLAP_STRENGTH)
}

function addPipes() {
  let gameWidth = game.scale.width
  let gapY = Phaser.Math.Between(120, game.scale.height - PIPE_GAP - 120)

  let pipeTop = this.physics.add.sprite(gameWidth, gapY, 'pipe').setOrigin(0, 1).setDepth(5)
  let pipeBottom = this.physics.add.sprite(gameWidth, gapY + PIPE_GAP, 'pipe').setOrigin(0, 0).setFlipY(true).setDepth(5)

  let topCap = this.physics.add.sprite(gameWidth, gapY, 'pipeCap').setOrigin(0, 1).setDepth(6)
  let bottomCap = this.physics.add.sprite(gameWidth, gapY + PIPE_GAP, 'pipeCap').setOrigin(0, 0).setFlipY(true).setDepth(6)

  pipes.addMultiple([pipeTop, pipeBottom, topCap, bottomCap])

  let allPipes = [pipeTop, pipeBottom, topCap, bottomCap]
  allPipes.forEach(pipe => {
    pipe.body.setVelocityX(PIPE_SPEED)
    pipe.body.allowGravity = false
    pipe.body.immovable = true
  })
}

function createPipeTextures(scene) {
  let graphics = scene.add.graphics()

  graphics.fillStyle(0x007700, 1)
  graphics.fillRect(0, 0, PIPE_WIDTH, 400)
  graphics.fillStyle(0x005500, 1)
  graphics.fillRect(10, 0, PIPE_WIDTH - 20, 400)
  graphics.lineStyle(3, 0x000000, 1)
  graphics.strokeRect(0, 0, PIPE_WIDTH, 400)

  graphics.generateTexture('pipe', PIPE_WIDTH, 400)
  graphics.clear()

  graphics.fillStyle(0x004400, 1)
  graphics.fillRect(0, 0, PIPE_WIDTH, PIPE_CAP_HEIGHT)
  graphics.lineStyle(2, 0x000000, 1)
  graphics.strokeRect(0, 0, PIPE_WIDTH, PIPE_CAP_HEIGHT)

  graphics.generateTexture('pipeCap', PIPE_WIDTH, PIPE_CAP_HEIGHT)
  graphics.destroy()
}

function hitPipe() {
  if (gameOver) return

  gameOver = true
  this.physics.pause()
  gameOverText.setText('GAME OVER')
  restartText.setText('TAP TO RESTART')
}

function restartGame() {
  gameOver = false
  score = 0
  scoreText.setText('SCORE: 0')
  bird.setPosition(game.scale.width * 0.2, game.scale.height / 2)
  bird.body.setVelocity(0, 0)
  pipes.clear(true, true)
  scoreZones.clear(true, true)
  this.physics.resume()
  gameOverText.setText('')
  restartText.setText('')
}
