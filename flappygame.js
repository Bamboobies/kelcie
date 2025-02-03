// === GAME SETTINGS ===
const GRAVITY = 900;
const FLAP_STRENGTH = -300;
const PIPE_SPEED = -200;
const PIPE_GAP = 175;
const PIPE_WIDTH = 80;
const PIPE_CAP_HEIGHT = 20;
const PIPE_SPAWN_DELAY = 1550;

let game, bird, pipes, scoreZones, scoreText, highScoreText;
let titleText, startText, gameOverText, restartText;
let score = 0, highScore = 0, gameStarted = false, gameOver = false;

window.onload = () => {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY }, debug: false } },
    plugins: {
      scene: [
        {
          key: 'PixelPerfectCollision',
          plugin: PhaserPluginPixelPerfect, // Use the plugin
          mapping: 'pixelPerfect' // Map it to `this.pixelPerfect`
        }
      ]
    },
    scene: { preload, create, update }
  });
};

function preload() {
  this.load.image('bird', 'https://i.postimg.cc/prdzpSD2/trimmed-image.png');
  this.load.image('pipe', 'assets/pipe.png'); // Load pipe image for pixel-perfect collision
}

function create() {
  const scene = this;
  const gameWidth = game.scale.width;
  const gameHeight = game.scale.height;

  scene.cameras.main.setBackgroundColor('#70c5ce');

  bird = this.physics.add.sprite(gameWidth * 0.2, gameHeight / 2, 'bird').setOrigin(0.5).setScale(0.09);
  bird.body.setCollideWorldBounds(true);
  bird.body.allowGravity = false;

  // Enable pixel-perfect collision for the bird
  this.pixelPerfect.enable(bird);

  pipes = this.physics.add.group();
  scoreZones = this.physics.add.group();

  const textStyle = { fontFamily: '"Press Start 2P", sans-serif', fontSize: '20px', fill: '#fff' };

  titleText = this.add.text(gameWidth / 2, gameHeight * 0.3, 'FLAPPY SHRIMP', { fontFamily: '"Press Start 2P", sans-serif', fontSize: '32px', fill: '#ffcc00' }).setOrigin(0.5);
  startText = this.add.text(gameWidth / 2, gameHeight * 0.5, 'TAP TO START', textStyle).setOrigin(0.5);
  gameOverText = this.add.text(gameWidth / 2, gameHeight * 0.5, '', textStyle).setOrigin(0.5);
  restartText = this.add.text(gameWidth / 2, gameHeight * 0.6, '', textStyle).setOrigin(0.5);

  scoreText = this.add.text(20, 20, 'SCORE: 0', textStyle);
  highScoreText = this.add.text(20, 50, 'HIGH SCORE: 0', textStyle);

  this.input.on('pointerdown', () => {
    if (!gameStarted) startGame.call(scene);
    else if (gameOver) restartGame.call(scene);
    else flap();
  });

  this.physics.world.on('worldstep', () => {
    if (gameOver) return;

    pipes.getChildren().forEach(pipe => {
      if (this.pixelPerfect.check(bird, pipe)) { // Use pixel-perfect collision
        hitPipe.call(this);
      }
    });
  });

  highScore = localStorage.getItem('flappyHighScore') || 0;
  highScoreText.setText('HIGH SCORE: ' + highScore);
}

function update() {
  if (gameOver) return;

  // Rotate the bird based on velocity
  bird.angle = bird.body.velocity.y > 0 ? 20 : -20;

  // Check if the bird touches the bottom of the playable area
  if (bird.body.blocked.down) {
    hitPipe.call(this);
  }

  checkScore();
}

function startGame() {
  gameStarted = true;
  bird.body.allowGravity = true;
  titleText.setText('');
  startText.setText('');
  this.time.addEvent({ delay: PIPE_SPAWN_DELAY, loop: true, callback: addPipes, callbackScope: this });
}

function flap() {
  bird.body.setVelocityY(FLAP_STRENGTH);
}

function addPipes() {
  if (gameOver) return;

  const gameHeight = game.scale.height;
  let gapY = Phaser.Math.Between(100, gameHeight - PIPE_GAP - 100);

  // Create pipes using an image for pixel-perfect collision
  let pipeTop = this.add.sprite(game.scale.width, gapY - PIPE_CAP_HEIGHT, 'pipe').setOrigin(0, 1);
  let pipeBottom = this.add.sprite(game.scale.width, gapY + PIPE_GAP + PIPE_CAP_HEIGHT, 'pipe').setOrigin(0, 0);

  this.physics.add.existing(pipeTop);
  this.physics.add.existing(pipeBottom);

  pipeTop.body.setVelocityX(PIPE_SPEED);
  pipeBottom.body.setVelocityX(PIPE_SPEED);

  pipeTop.body.immovable = true;
  pipeBottom.body.immovable = true;

  pipes.add(pipeTop);
  pipes.add(pipeBottom);

  // Enable pixel-perfect collision for pipes
  this.pixelPerfect.enable(pipeTop);
  this.pixelPerfect.enable(pipeBottom);

  // Add score zone
  let scoreZone = this.add.rectangle(game.scale.width + PIPE_WIDTH / 2, gapY + PIPE_GAP / 2, 10, PIPE_GAP, 0xff0000, 0).setOrigin(0.5);
  this.physics.add.existing(scoreZone);
  scoreZone.body.setVelocityX(PIPE_SPEED);
  scoreZone.body.allowGravity = false;
  scoreZone.body.checkWorldBounds = true;
  scoreZone.body.outOfBoundsKill = true;

  scoreZones.add(scoreZone);
  scoreZone.passed = false;
}

function checkScore() {
  scoreZones.getChildren().forEach(scoreZone => {
    if (!scoreZone.passed && scoreZone.x < bird.x) {
      scoreZone.passed = true;
      score++;
      scoreText.setText('SCORE: ' + score);
    }
  });
}

function hitPipe() {
  if (gameOver) return;

  gameOver = true;
  this.physics.pause();

  gameOverText.setText('GAME OVER');
  restartText.setText('TAP TO RESTART');

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('flappyHighScore', highScore);
    highScoreText.setText('HIGH SCORE: ' + highScore);
  }
}

function restartGame() {
  gameOver = false;
  score = 0;
  scoreText.setText('SCORE: 0');
  bird.setPosition(game.scale.width * 0.2, game.scale.height / 2);
  bird.body.setVelocity(0, 0);
  pipes.clear(true, true);
  scoreZones.clear(true, true);
  this.physics.resume();
  gameOverText.setText('');
  restartText.setText('');
}
