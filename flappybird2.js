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
  const titleFontSize = Math.min(gameWidth * 0.1, 32) // Adjust the multiplier (0.1) as needed
  titleText = this.add.text(gameWidth / 2, gameHeight * 0.3, 'FLAPPY SHRIMP', { 
    fontFamily: '"Press Start 2P", sans-serif', 
    fontSize: `${titleFontSize}px`, 
    fill: '#ffcc00' 
  }).setOrigin(0.5)

  startText = this.add.text(gameWidth / 2, gameHeight * 0.5, 'TAP TO START', textStyle).setOrigin(0.5)
  gameOverText = this.add.text(gameWidth / 2, gameHeight * 0.5, '', textStyle).setOrigin(0.5)
  restartText = this.add.text(gameWidth / 2, gameHeight * 0.6, '', textStyle).setOrigin(0.5)

  scoreText = this.add.text(20, 20, 'SCORE: 0', textStyle)
  highScoreText = this.add.text(20, 50, 'HIGH SCORE: 0', textStyle)
  let goalText = this.add.text(20, 80, 'GOAL: 20', textStyle)

  this.input.on('pointerdown', () => {
    if (!gameStarted) startGame.call(scene)
    else if (gameOver) restartGame.call(scene)
    else flap()
  })

  this.physics.add.collider(bird, pipes, hitPipe, null, this)

  highScore = localStorage.getItem('flappyHighScore') || 0
  highScoreText.setText('HIGH SCORE: ' + highScore)
}
