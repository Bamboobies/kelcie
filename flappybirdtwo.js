// === GAME SETTINGS ===
const GRAVITY = 900
const FLAP_STRENGTH = -300
const PIPE_SPEED = -200
const PIPE_GAP = 175
const PIPE_WIDTH = 80
const PIPE_CAP_HEIGHT = 20
const PIPE_SPAWN_DELAY = 1550

let game, bird, pipes, scoreZones, scoreText, highScoreText
let titleText, startText, gameOverText, restartText
let score = 0, highScore = 0, gameStarted = false, gameOver = false

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
}

function create() {
  const scene = this
  const gameWidth = game.scale.width
  const gameHeight = game.scale.height

  scene.cameras.main.setBackgroundColor('#70c5ce')

  bird = this.physics.add.sprite(gameWidth * 0.2, gameHeight / 2, 'bird').setOrigin(0.5).setScale(0.0915)
  bird.body.setCollideWorldBounds(true)
  bird.body.allowGravity = false

  pipes = this.physics.add.group()
  scoreZones = this.physics.add.group()

  const textStyle = { fontFamily: '"Press Start 2P", sans-serif', fontSize: '20px', fill: '#fff' }

  // Dynamically adjust the font size for "Flappy Shrimp" based on screen width
  const titleFontSize = Math.min(gameWidth * 0.075, 32) // Adjust the multiplier (0.1) as needed
  titleText = this.add.text(gameWidth / 2, gameHeight * 0.3, 'FLAPPY SHRIMP', { 
    fontFamily: '"Press Start 2P", sans-serif', 
    fontSize: `${titleFontSize}px`, 
    fill: '#ffcc00' 
  }).setOrigin(0.5)

  startText = this.add.text(gameWidth / 2, gameHeight * 0.5, 'TAP TO START', textStyle).setOrigin(0.5).setDepth(10)
  gameOverText = this.add.text(gameWidth / 2, gameHeight * 0.5, '', textStyle).setOrigin(0.5).setDepth(10)
  restartText = this.add.text(gameWidth / 2, gameHeight * 0.6, '', textStyle).setOrigin(0.5).setDepth(10)

  scoreText = this.add.text(20, 20, 'SCORE: 0', textStyle).setDepth(10)
  highScoreText = this.add.text(20, 50, 'HIGH SCORE: 0', textStyle).setDepth(10)
  let goalText = this.add.text(20, 80, 'GOAL: 20', textStyle).setDepth(10)

  this.input.on('pointerdown', () => {
    if (!gameStarted) startGame.call(scene)
    else if (gameOver) restartGame.call(scene)
    else flap()
  })

  this.physics.add.collider(bird, pipes, hitPipe, null, this)

  highScore = localStorage.getItem('flappyHighScore') || 0
  highScoreText.setText('HIGH SCORE: ' + highScore)
}

function update() {
  if (gameOver) return

  // Smoother rotation
  bird.angle = Phaser.Math.Clamp(bird.angle + (bird.body.velocity.y > 0 ? 2 : -4), -20, 20)

  if (bird.body.blocked.down) {
    hitPipe.call(this)
  }

  checkScore()
}

function startGame() {
  gameStarted = true
  bird.body.allowGravity = true
  titleText.setText('')
  startText.setText('')
  this.time.addEvent({ delay: PIPE_SPAWN_DELAY, loop: true, callback: addPipes, callbackScope: this })
}

function flap() {
  bird.body.setVelocityY(FLAP_STRENGTH)
}

function addPipes() {
  if (gameOver) return

  let gameWidth = game.scale.width
  let gameHeight = game.scale.height

  // Improved pipe gap positioning
  let minGapY = 120
  let maxGapY = gameHeight - PIPE_GAP - 120
  let gapY = Phaser.Math.Clamp(Phaser.Math.Between(minGapY, maxGapY), minGapY, maxGapY)

  let pipeTopBody = this.add.rectangle(gameWidth, gapY - PIPE_CAP_HEIGHT, PIPE_WIDTH, gapY, 0x008000).setOrigin(0, 1).setDepth(5)
  let pipeBottomBody = this.add.rectangle(gameWidth, gapY + PIPE_GAP + PIPE_CAP_HEIGHT, PIPE_WIDTH, gameHeight - (gapY + PIPE_GAP), 0x008000).setOrigin(0, 0).setDepth(5)

  let pipeTopCap = this.add.rectangle(gameWidth + PIPE_WIDTH / 2, gapY, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT, 0x006600).setOrigin(0.5, 1).setDepth(5)
  let pipeBottomCap = this.add.rectangle(gameWidth + PIPE_WIDTH / 2, gapY + PIPE_GAP, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT, 0x006600).setOrigin(0.5, 0).setDepth(5)

  let scoreZone = this.add.rectangle(gameWidth + PIPE_WIDTH / 2, gapY + PIPE_GAP / 2, 10, PIPE_GAP, 0xff0000, 0).setOrigin(0.5).setDepth(5)

  this.physics.add.existing(pipeTopBody)
  this.physics.add.existing(pipeBottomBody)
  this.physics.add.existing(pipeTopCap)
  this.physics.add.existing(pipeBottomCap)
  this.physics.add.existing(scoreZone)

  pipeTopBody.body.immovable = true
  pipeBottomBody.body.immovable = true
  pipeTopCap.body.immovable = true
  pipeBottomCap.body.immovable = true

  pipes.add(pipeTopBody)
  pipes.add(pipeBottomBody)
  pipes.add(pipeTopCap)
  pipes.add(pipeBottomCap)
  scoreZones.add(scoreZone)

  let allPipes = [pipeTopBody, pipeBottomBody, pipeTopCap, pipeBottomCap, scoreZone]
  allPipes.forEach(pipe => {
    pipe.body.setVelocityX(PIPE_SPEED)
    pipe.body.allowGravity = false
    pipe.body.checkWorldBounds = true
    pipe.body.outOfBoundsKill = true
  })

  scoreZone.passed = false
}

function checkScore() {
  scoreZones.getChildren().forEach(scoreZone => {
    if (!scoreZone.passed && scoreZone.x < bird.x) {
      scoreZone.passed = true
      score++
      scoreText.setText('SCORE: ' + score)

      // Check if the score reaches 20
      if (score >= 20) {
        // Store that the player has reached the goal
        localStorage.setItem('reachedGoal', true)
      }
    }
  })
}

function hitPipe() {
  if (gameOver) return

  gameOver = true
  this.physics.pause()

  gameOverText.setText('GAME OVER')
  restartText.setText('TAP TO RESTART')

  if (score > highScore) {
    highScore = score
    localStorage.setItem('flappyHighScore', highScore)
    highScoreText.setText('HIGH SCORE: ' + highScore)
  }

  // Check if the player reached the goal (score >= 20)
  if (localStorage.getItem('reachedGoal') === 'true') {
    // Show the congratulations message
    let congratsText = this.add.text(game.scale.width / 2, game.scale.height / 2, 
      'CONGRATULATIONS!\nYou reached 20 points!', 
      { fontFamily: '"Press Start 2P", sans-serif', fontSize: '20px', fill: '#ffcc00', align: 'center' }
    ).setOrigin(0.5)

    // Redirect after 3 seconds
    this.time.delayedCall(3000, () => {
      window.location.href = 'https://kelcie.net/survey.html'
    })

    // Clear the goal flag
    localStorage.removeItem('reachedGoal')
  }
}

function hitPipe() {
  if (gameOver) return

  gameOver = true
  this.physics.pause()

  gameOverText.setText('GAME OVER')
  restartText.setText('TAP TO RESTART')

  if (score > highScore) {
    highScore = score
    localStorage.setItem('flappyHighScore', highScore)
    highScoreText.setText('HIGH SCORE: ' + highScore)
  }
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
