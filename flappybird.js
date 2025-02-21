// === GAME SETTINGS ===
const GRAVITY = 900;
const FLAP_STRENGTH = -300;
const PIPE_SPEED = -200;
const PIPE_GAP = 175;
const PIPE_WIDTH = 80;
const PIPE_CAP_HEIGHT = 20;
const PIPE_SPAWN_DELAY = 1550;
const BACKGROUND_SPEED = -10;

let game, bird, pipes, scoreZones, scoreText, highScoreText;
let titleText, startText, gameOverText, restartText;
let score = 0, highScore = 0, gameStarted = false, gameOver = false;
let background1, background2;

window.onload = () => {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY }, debug: false } },
    scene: { preload, create, update }
  });
};

function preload() {
  this.load.image('bird', 'https://i.postimg.cc/prdzpSD2/trimmed-image.png');
  this.load.image('background', 'https://i.ibb.co/2XWRWxZ/1739319234354.jpg');
}

function create() {
  const scene = this;
  const gameWidth = game.scale.width;
  const gameHeight = game.scale.height;

  const imageWidth = this.textures.get('background').getSourceImage().width;
  const imageHeight = this.textures.get('background').getSourceImage().height;
  const scaleFactor = gameHeight / imageHeight;
  const scaledWidth = imageWidth * scaleFactor;

  background1 = this.add.sprite(0, 0, 'background').setOrigin(0, 0);
  background2 = this.add.sprite(scaledWidth, 0, 'background').setOrigin(0, 0);
  background1.setScale(scaleFactor);
  background2.setScale(scaleFactor);

  const overlay = this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0xffffff, 0.3).setOrigin(0.5, 0.5);
  overlay.setDepth(-1);

  bird = this.physics.add.sprite(gameWidth * 0.2, gameHeight / 2, 'bird').setOrigin(0.5).setScale(0.0915);
  bird.body.setCollideWorldBounds(true);
  bird.body.allowGravity = false;

  pipes = this.physics.add.group();
  scoreZones = this.physics.add.group();

  const textStyle = { fontFamily: '"Press Start 2P", sans-serif', fontSize: '20px', fill: '#fff' };
  const titleFontSize = Math.min(gameWidth * 0.075, 32);
  titleText = this.add.text(gameWidth / 2, gameHeight * 0.3, 'FLAPPY SHRIMP', { 
    fontFamily: '"Press Start 2P", sans-serif', 
    fontSize: `${titleFontSize}px`, 
    fill: '#ffcc00' 
  }).setOrigin(0.5);

  startText = this.add.text(gameWidth / 2, gameHeight * 0.5, 'TAP TO START', textStyle).setOrigin(0.5).setDepth(10);
  gameOverText = this.add.text(gameWidth / 2, gameHeight * 0.5, '', textStyle).setOrigin(0.5).setDepth(10);
  restartText = this.add.text(gameWidth / 2, gameHeight * 0.6, '', textStyle).setOrigin(0.5).setDepth(10);

  scoreText = this.add.text(20, 20, 'SCORE: 0', textStyle).setDepth(10);
  highScoreText = this.add.text(20, 50, 'HIGH SCORE: ' + highScore, textStyle).setDepth(10);

  this.input.on('pointerdown', () => {
    if (!gameStarted) startGame.call(scene);
    else if (gameOver) restartGame.call(scene);
    else flap();
  });

  this.physics.add.collider(bird, pipes, hitPipe, null, this);

  highScore = localStorage.getItem('flappyHighScore') || 0;
  highScoreText.setText('HIGH SCORE: ' + highScore);

  // Pre-generate pipe texture (coral-like with gradient and wavy lines)
  const pipeGraphics = this.add.graphics();
  // Gradient base: dark coral to lighter coral
  pipeGraphics.fillGradientStyle(0xFF5733, 0xFF5733, 0xFF8C66, 0xFF8C66, 1); // Top dark, bottom light
  pipeGraphics.fillRect(0, 0, PIPE_WIDTH, 512);
  // Add wavy white lines for coral texture
  pipeGraphics.lineStyle(2, 0xFFFFFF, 0.7);
  for (let y = 0; y < 512; y += 20) {
    pipeGraphics.beginPath();
    pipeGraphics.moveTo(0, y);
    for (let x = 0; x <= PIPE_WIDTH; x += 5) {
      pipeGraphics.lineTo(x, y + Math.sin(x / 10) * 5);
    }
    pipeGraphics.strokePath();
  }
  pipeGraphics.generateTexture('pipeTexture', PIPE_WIDTH, 512);
  pipeGraphics.destroy();
  console.log('Pipe texture exists:', this.textures.exists('pipeTexture'));

  // Pre-generate endcap texture (seashell-like with gradient and ridges)
  const capGraphics = this.add.graphics();
  // Gradient base: dark gray to light gray
  capGraphics.fillGradientStyle(0x808080, 0x808080, 0xD3D3D3, 0xD3D3D3, 1); // Top dark, bottom light
  capGraphics.fillRect(0, 0, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  // Add ridges for seashell effect
  capGraphics.lineStyle(2, 0xFFFFFF, 0.8);
  capGraphics.lineBetween(0, PIPE_CAP_HEIGHT * 0.25, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT * 0.25);
  capGraphics.lineBetween(0, PIPE_CAP_HEIGHT * 0.75, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT * 0.75);
  capGraphics.generateTexture('capTexture', PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  capGraphics.destroy();
  console.log('Cap texture exists:', this.textures.exists('capTexture'));
}

function update() {
  if (gameOver || !gameStarted) return;

  background1.x += BACKGROUND_SPEED * (1 / 60);
  background2.x += BACKGROUND_SPEED * (1 / 60);

  if (background1.x + background1.displayWidth <= 0) {
    background1.x = background2.x + background2.displayWidth;
  }
  if (background2.x + background2.displayWidth <= 0) {
    background2.x = background1.x + background1.displayWidth;
  }

  bird.angle = Phaser.Math.Clamp(bird.angle + (bird.body.velocity.y > 0 ? 2 : -4), -20, 20);

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

  let gameWidth = game.scale.width;
  let gameHeight = game.scale.height;

  let minGapY = 120;
  let maxGapY = gameHeight - PIPE_GAP - 120;
  let gapY = Phaser.Math.Clamp(Phaser.Math.Between(minGapY, maxGapY), minGapY, maxGapY);

  // Top pipe body
  let pipeTopBody = this.physics.add.sprite(gameWidth, gapY - PIPE_CAP_HEIGHT, 'pipeTexture').setOrigin(0, 1).setDepth(5);
  pipeTopBody.setDisplaySize(PIPE_WIDTH, gapY);
  pipeTopBody.body.setSize(PIPE_WIDTH, gapY);
  pipeTopBody.body.immovable = true;

  // Bottom pipe body
  let bottomHeight = gameHeight - (gapY + PIPE_GAP + PIPE_CAP_HEIGHT);
  let pipeBottomBody = this.physics.add.sprite(gameWidth, gapY + PIPE_GAP + PIPE_CAP_HEIGHT, 'pipeTexture').setOrigin(0, 0).setDepth(5);
  pipeBottomBody.setDisplaySize(PIPE_WIDTH, bottomHeight);
  pipeBottomBody.body.setSize(PIPE_WIDTH, bottomHeight);
  pipeBottomBody.body.immovable = true;

  // Top pipe endcap
  let pipeTopCap = this.physics.add.sprite(gameWidth + PIPE_WIDTH / 2, gapY, 'capTexture').setOrigin(0.5, 1).setDepth(5);
  pipeTopCap.setDisplaySize(PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  pipeTopCap.body.setSize(PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  pipeTopCap.body.immovable = true;

  // Bottom pipe endcap
  let pipeBottomCap = this.physics.add.sprite(gameWidth + PIPE_WIDTH / 2, gapY + PIPE_GAP, 'capTexture').setOrigin(0.5, 0).setDepth(5);
  pipeBottomCap.setDisplaySize(PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  pipeBottomCap.body.setSize(PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  pipeBottomCap.body.immovable = true;

  let scoreZone = this.add.rectangle(gameWidth + PIPE_WIDTH / 2, gapY + PIPE_GAP / 2, 10, PIPE_GAP, 0xff0000, 0).setOrigin(0.5).setDepth(5);
  this.physics.add.existing(scoreZone);

  pipes.add(pipeTopBody);
  pipes.add(pipeBottomBody);
  pipes.add(pipeTopCap);
  pipes.add(pipeBottomCap);
  scoreZones.add(scoreZone);

  let allPipes = [pipeTopBody, pipeBottomBody, pipeTopCap, pipeBottomCap, scoreZone];
  allPipes.forEach(pipe => {
    pipe.body.setVelocityX(PIPE_SPEED);
    pipe.body.allowGravity = false;
    pipe.body.checkWorldBounds = true;
    pipe.body.outOfBoundsKill = true;
  });

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
  scoreText.setText('SCORE: ' + score);
  bird.setPosition(game.scale.width * 0.2, game.scale.height / 2);
  bird.body.setVelocity(0, 0);
  pipes.clear(true, true);
  scoreZones.clear(true, true);
  this.physics.resume();
  gameOverText.setText('');
  restartText.setText('');
}
