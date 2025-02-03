// === GAME SETTINGS ===
const GRAVITY = 800;
const FLAP_STRENGTH = -300;
const PIPE_SPEED = -200;
const PIPE_GAP = 250;
const PIPE_WIDTH = 80;
const PIPE_CAP_HEIGHT = 20;
const PIPE_SPAWN_DELAY = 2000;

let game, bird, pipes, scoreZones, scoreText, highScoreText;
let startText, gameOverText, restartText;
let score = 0, highScore = 0, gameStarted = false, gameOver = false;

window.onload = () => {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY }, debug: false } },
    scene: { preload, create, update }
  });
};

function preload() {
  // Load the bird image
  this.load.image('bird', 'https://i.postimg.cc/prdzpSD2/trimmed-image.png');
}

function create() {
  const scene = this;
  const gameWidth = game.scale.width;
  const gameHeight = game.scale.height;

  // Background color
  scene.cameras.main.setBackgroundColor('#70c5ce');

  // Bird (Image)
  bird = this.physics.add.sprite(gameWidth * 0.2, gameHeight / 2, 'bird').setOrigin(0.5).setScale(0.3);
  bird.body.setCollideWorldBounds(true);
  bird.body.allowGravity = false;

  // Pipes Group
  pipes = this.physics.add.group();

  // Score Zones Group
  scoreZones = this.physics.add.group();

  // UI Text
  const textStyle = { fontFamily: '"Press Start 2P", sans-serif', fontSize: '16px', fill: '#fff' };

  startText = this.add.text(gameWidth / 2, gameHeight / 2, 'TAP TO START', textStyle).setOrigin(0.5);
  gameOverText = this.add.text(gameWidth / 2, gameHeight / 2, '', textStyle).setOrigin(0.5);
  restartText = this.add.text(gameWidth / 2, gameHeight / 2 + 50, '', textStyle).setOrigin(0.5);

  scoreText = this.add.text(20, 20, 'SCORE: 0', textStyle);
  highScoreText = this.add.text(20, 50, 'HIGH SCORE: 0', textStyle);

  // Input to Start / Restart
  this.input.on('pointerdown', () => {
    if (!gameStarted) startGame.call(scene);
    else if (gameOver) restartGame.call(scene);
    else flap();
  });

  // Collision Detection (with pipe bodies and caps)
  this.physics.add.collider(bird, pipes, hitPipe, null, this);

  // Load High Score
  highScore = localStorage.getItem('flappyHighScore') || 0;
  highScoreText.setText('HIGH SCORE: ' + highScore);
}

function update() {
  if (gameOver) return;

  // Rotate the bird based on velocity
  bird.angle = bird.body.velocity.y > 0 ? 20 : -20;

  // Check if the bird hits the bottom of the canvas
  if (bird.y >= game.scale.height) {
    hitPipe.call(this);
  }

  checkScore();
}

function startGame() {
  gameStarted = true;
  bird.body.allowGravity = true;
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

  // Pipe Shafts (Green)
  let pipeTopBody = this.add.rectangle(game.scale.width, gapY - PIPE_CAP_HEIGHT, PIPE_WIDTH, gapY, 0x008000).setOrigin(0, 1);
  let pipeBottomBody = this.add.rectangle(game.scale.width, gapY + PIPE_GAP + PIPE_CAP_HEIGHT, PIPE_WIDTH, gameHeight - (gapY + PIPE_GAP), 0x008000).setOrigin(0, 0);

  // Pipe Caps (Darker Green) - Centered
  let pipeTopCap = this.add.rectangle(game.scale.width + PIPE_WIDTH / 2, gapY, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT, 0x006600).setOrigin(0.5, 1);
  let pipeBottomCap = this.add.rectangle(game.scale.width + PIPE_WIDTH / 2, gapY + PIPE_GAP, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT, 0x006600).setOrigin(0.5, 0);

  // Score Zone (Invisible Rectangle)
  let scoreZone = this.add.rectangle(game.scale.width + PIPE_WIDTH / 2, gapY + PIPE_GAP / 2, 10, PIPE_GAP, 0xff0000, 0).setOrigin(0.5);

  // Add physics
  this.physics.add.existing(pipeTopBody);
  this.physics.add.existing(pipeBottomBody);
  this.physics.add.existing(pipeTopCap);
  this.physics.add.existing(pipeBottomCap);
  this.physics.add.existing(scoreZone);

  // Make pipes immovable (so the bird can't move them)
  pipeTopBody.body.immovable = true;
  pipeBottomBody.body.immovable = true;
  pipeTopCap.body.immovable = true;
  pipeBottomCap.body.immovable = true;

  // Add to groups
  pipes.add(pipeTopBody);
  pipes.add(pipeBottomBody);
  pipes.add(pipeTopCap);
  pipes.add(pipeBottomCap);
  scoreZones.add(scoreZone);

  // Move pipes and score zones
  let allPipes = [pipeTopBody, pipeBottomBody, pipeTopCap, pipeBottomCap, scoreZone];
  allPipes.forEach(pipe => {
    pipe.body.setVelocityX(PIPE_SPEED);
    pipe.body.allowGravity = false;
    pipe.body.checkWorldBounds = true;
    pipe.body.outOfBoundsKill = true;
  });

  // Score Zone Settings
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

  // Show Game Over Text
  gameOverText.setText('GAME OVER');
  restartText.setText('TAP TO RESTART');

  // Save High Score
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
