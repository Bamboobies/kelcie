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
    scene: { preload, create, update }
  });
};

function preload() {
  this.load.image('bird', 'https://i.postimg.cc/prdzpSD2/trimmed-image.png');
}

function create() {
  const scene = this;
  const gameWidth = game.scale.width;
  const gameHeight = game.scale.height;

  scene.cameras.main.setBackgroundColor('#70c5ce');

  bird = this.physics.add.sprite(gameWidth * 0.2, gameHeight / 2, 'bird').setOrigin(0.5).setScale(0.09);
  bird.body.setCollideWorldBounds(true);
  bird.body.allowGravity = false;

  // Create a BitmapMask for the bird
  const birdMask = this.make.sprite({ key: 'bird', add: false }).setScale(0.09);
  bird.mask = new Phaser.Display.Masks.BitmapMask(this, birdMask);

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
      if (checkPixelCollision(bird, pipe)) {
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

  let pipeTopBody = this.add.rectangle(game.scale.width, gapY - PIPE_CAP_HEIGHT, PIPE_WIDTH, gapY, 0x008000).setOrigin(0, 1);
  let pipeBottomBody = this.add.rectangle(game.scale.width, gapY + PIPE_GAP + PIPE_CAP_HEIGHT, PIPE_WIDTH, gameHeight - (gapY + PIPE_GAP), 0x008000).setOrigin(0, 0);

  let pipeTopCap = this.add.rectangle(game.scale.width + PIPE_WIDTH / 2, gapY, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT, 0x006600).setOrigin(0.5, 1);
  let pipeBottomCap = this.add.rectangle(game.scale.width + PIPE_WIDTH / 2, gapY + PIPE_GAP, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT, 0x006600).setOrigin(0.5, 0);

  let scoreZone = this.add.rectangle(game.scale.width + PIPE_WIDTH / 2, gapY + PIPE_GAP / 2, 10, PIPE_GAP, 0xff0000, 0).setOrigin(0.5);

  this.physics.add.existing(pipeTopBody);
  this.physics.add.existing(pipeBottomBody);
  this.physics.add.existing(pipeTopCap);
  this.physics.add.existing(pipeBottomCap);
  this.physics.add.existing(scoreZone);

  pipeTopBody.body.immovable = true;
  pipeBottomBody.body.immovable = true;
  pipeTopCap.body.immovable = true;
  pipeBottomCap.body.immovable = true;

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
  scoreText.setText('SCORE: 0');
  bird.setPosition(game.scale.width * 0.2, game.scale.height / 2);
  bird.body.setVelocity(0, 0);
  pipes.clear(true, true);
  scoreZones.clear(true, true);
  this.physics.resume();
  gameOverText.setText('');
  restartText.setText('');
}

function checkPixelCollision(sprite1, sprite2) {
  const ctx = game.context; // Use a temporary canvas context for pixel checks

  // Draw sprite1 onto the canvas
  ctx.clearRect(0, 0, game.scale.width, game.scale.height);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sprite1.texture.getSourceImage(), sprite1.x - sprite1.width / 2, sprite1.y - sprite1.height / 2, sprite1.width, sprite1.height);
  ctx.restore();

  // Draw sprite2 onto the canvas
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(sprite2.texture.getSourceImage(), sprite2.x - sprite2.width / 2, sprite2.y - sprite2.height / 2, sprite2.width, sprite2.height);
  ctx.restore();

  // Check for overlapping non-transparent pixels
  const imageData = ctx.getImageData(0, 0, game.scale.width, game.scale.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] > 0) { // Check alpha channel
      return true; // Collision detected
    }
  }

  return false; // No collision
}
