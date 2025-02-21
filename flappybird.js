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
  highScoreText = this.add.text(20, 50, 'HIGH SCORE: 0', textStyle).setDepth(10);

  this.input.on('pointerdown', () => {
    if (!gameStarted) startGame.call(scene);
    else if (gameOver) restartGame.call(scene);
    else flap();
  });

  this.physics.add.collider(bird, pipes, hitPipe, null, this);

  highScore = localStorage.getItem('flappyHighScore') || 0;
  highScoreText.setText('HIGH SCORE: ' + highScore);
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

  // Graphics object for drawing textures
  const graphics = this.add.graphics();

  // Top pipe body with coral-like texture
  let topHeight = gapY - PIPE_CAP_HEIGHT;
  let pipeTopBody = this.physics.add.sprite(gameWidth, 0, null).setOrigin(0, 0).setDepth(5); // Invisible sprite for physics
  pipeTopBody.body.setSize(PIPE_WIDTH, topHeight);
  pipeTopBody.body.immovable = true;
  graphics.fillStyle(0xFF5733, 1); // Coral base color
  graphics.fillRect(gameWidth, 0, PIPE_WIDTH, topHeight);
  // Add wavy texture
  graphics.lineStyle(2, 0xFFFFFF, 0.5); // White wavy lines
  for (let y = 0; y < topHeight; y += 20) {
    graphics.beginPath();
    graphics.moveTo(gameWidth, y);
    graphics.lineTo(gameWidth + PIPE_WIDTH, y + Math.sin(y / 10) * 10);
    graphics.strokePath();
  }
  pipeTopBody.graphics = graphics; // Store graphics for movement

  // Bottom pipe body with coral-like texture
  let bottomY = gapY + PIPE_GAP + PIPE_CAP_HEIGHT;
  let bottomHeight = gameHeight - bottomY;
  let pipeBottomBody = this.physics.add.sprite(gameWidth, bottomY, null).setOrigin(0, 0).setDepth(5);
  pipeBottomBody.body.setSize(PIPE_WIDTH, bottomHeight);
  pipeBottomBody.body.immovable = true;
  const bottomGraphics = this.add.graphics();
  bottomGraphics.fillStyle(0xFF5733, 1);
  bottomGraphics.fillRect(gameWidth, bottomY, PIPE_WIDTH, bottomHeight);
  // Add wavy texture
  bottomGraphics.lineStyle(2, 0xFFFFFF, 0.5);
  for (let y = bottomY; y < bottomY + bottomHeight; y += 20) {
    bottomGraphics.beginPath();
    bottomGraphics.moveTo(gameWidth, y);
    bottomGraphics.lineTo(gameWidth + PIPE_WIDTH, y + Math.sin(y / 10) * 10);
    bottomGraphics.strokePath();
  }
  pipeBottomBody.graphics = bottomGraphics;

  // Top pipe endcap with gradient texture
  let pipeTopCap = this.physics.add.sprite(gameWidth + PIPE_WIDTH / 2, gapY, null).setOrigin(0.5, 1).setDepth(5);
  pipeTopCap.body.setSize(PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  pipeTopCap.body.immovable = true;
  const topCapGraphics = this.add.graphics();
  topCapGraphics.fillStyle(0xFFFFFF, 1); // White base for seashell
  topCapGraphics.fillRect(gameWidth, gapY - PIPE_CAP_HEIGHT, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  topCapGraphics.fillStyle(0xD3D3D3, 0.7); // Light gray gradient
  topCapGraphics.fillRect(gameWidth, gapY - PIPE_CAP_HEIGHT, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT / 2);
  pipeTopCap.graphics = topCapGraphics;

  // Bottom pipe endcap with gradient texture
  let pipeBottomCap = this.physics.add.sprite(gameWidth + PIPE_WIDTH / 2, gapY + PIPE_GAP, null).setOrigin(0.5, 0).setDepth(5);
  pipeBottomCap.body.setSize(PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  pipeBottomCap.body.immovable = true;
  const bottomCapGraphics = this.add.graphics();
  bottomCapGraphics.fillStyle(0xFFFFFF, 1);
  bottomCapGraphics.fillRect(gameWidth, gapY + PIPE_GAP, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  bottomCapGraphics.fillStyle(0xD3D3D3, 0.7);
  bottomCapGraphics.fillRect(gameWidth, gapY + PIPE_GAP + PIPE_CAP_HEIGHT / 2, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT / 2);
  pipeBottomCap.graphics = bottomCapGraphics;

  // Score zone (unchanged)
  let scoreZone = this.add.rectangle(gameWidth + PIPE_WIDTH / 2, gapY + PIPE_GAP / 2, 10, PIPE_GAP, 0xff0000, 0)
    .setOrigin(0.5)
    .setDepth(5);
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
    // Update graphics position in update loop
    pipe.updateGraphics = () => {
      if (pipe.graphics) {
        pipe.graphics.x = pipe.body.x - gameWidth; // Adjust for initial offset
      }
    };
  });

  scoreZone.passed = false;
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

  // Update graphics positions for all pipes
  pipes.getChildren().forEach(pipe => {
    if (pipe.updateGraphics) pipe.updateGraphics();
  });

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
