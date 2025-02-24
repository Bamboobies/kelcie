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
let birdCollisionMask;

window.onload = () => {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    physics: { 
      default: 'arcade', 
      arcade: { 
        gravity: { y: GRAVITY }, 
        debug: false, 
        fps: 120 // Increase physics update rate for tighter checks
      } 
    },
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

  birdCollisionMask = createCollisionMask(bird);

  // Hybrid collision: Arcade Physics collider with pixel-perfect refinement
  this.physics.add.collider(bird, pipes, (birdSprite, pipeSprite) => {
    if (pixelPerfectCollision(birdSprite, pipeSprite)) {
      hitPipe.call(this);
    }
  }, null, this);

  highScore = localStorage.getItem('flappyHighScore') || 0;
  highScoreText.setText('HIGH SCORE: ' + highScore);

  function interpolateColor(color1, color2, factor) {
    const r1 = (color1 >> 16) & 0xFF;
    const g1 = (color1 >> 8) & 0xFF;
    const b1 = color1 & 0xFF;
    const r2 = (color2 >> 16) & 0xFF;
    const g2 = (color2 >> 8) & 0xFF;
    const b2 = color2 & 0xFF;
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    return (r << 16) + (g << 8) + b;
  }

  const pipeGraphics = this.add.graphics();
  pipeGraphics.fillStyle(0x00A300, 1);
  pipeGraphics.fillRect(0, 0, PIPE_WIDTH, 512);
  const startColor = 0x5C7A43;
  const endColor = 0xA0D22A;
  const pipeSteps = 16;
  const stepWidth = PIPE_WIDTH / pipeSteps;
  for (let i = 0; i < pipeSteps; i++) {
    const center = (pipeSteps - 1) / 2;
    const distance = Math.abs(i - center) / center;
    const factor = Math.pow(Math.sin(distance * Math.PI / 2), 1.5);
    const color = interpolateColor(endColor, startColor, factor);
    pipeGraphics.fillStyle(color, 1);
    pipeGraphics.fillRect(i * stepWidth, 0, stepWidth, 512);
  }
  pipeGraphics.lineStyle(1, 0x003300, 1);
  pipeGraphics.lineBetween(1, 0, 1, 512);
  pipeGraphics.lineBetween(PIPE_WIDTH - 1, 0, PIPE_WIDTH - 1, 512);
  pipeGraphics.generateTexture('pipeTexture', PIPE_WIDTH, 512);
  pipeGraphics.destroy();

  const capGraphics = this.add.graphics();
  capGraphics.fillStyle(0x006600, 1);
  capGraphics.fillRect(0, 0, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  const capSteps = 20;
  const stepWidthCap = (PIPE_WIDTH + 10) / capSteps;
  for (let i = 0; i < capSteps; i++) {
    const center = (capSteps - 1) / 2;
    const distance = Math.abs(i - center) / center;
    const factor = Math.pow(Math.sin(distance * Math.PI / 2), 1.5);
    const color = interpolateColor(endColor, startColor, factor);
    capGraphics.fillStyle(color, 1);
    const x = Math.floor(i * stepWidthCap);
    const width = Math.ceil((i + 1) * stepWidthCap) - x;
    capGraphics.fillRect(x, 0, width, PIPE_CAP_HEIGHT);
  }
  capGraphics.lineStyle(1, 0x003300, 1);
  capGraphics.strokeRect(1, 1, PIPE_WIDTH + 8, PIPE_CAP_HEIGHT - 2);
  capGraphics.generateTexture('capTexture', PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  capGraphics.destroy();
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

  let pipeTopBody = this.physics.add.sprite(gameWidth, gapY - PIPE_CAP_HEIGHT, 'pipeTexture').setOrigin(0, 1).setDepth(5);
  pipeTopBody.setDisplaySize(PIPE_WIDTH, gapY);
  pipeTopBody.body.setSize(PIPE_WIDTH, gapY);
  pipeTopBody.body.immovable = true;

  let bottomHeight = gameHeight - (gapY + PIPE_GAP + PIPE_CAP_HEIGHT);
  let pipeBottomBody = this.physics.add.sprite(gameWidth, gapY + PIPE_GAP + PIPE_CAP_HEIGHT, 'pipeTexture').setOrigin(0, 0).setDepth(5);
  pipeBottomBody.setDisplaySize(PIPE_WIDTH, bottomHeight);
  pipeBottomBody.body.setSize(PIPE_WIDTH, bottomHeight);
  pipeBottomBody.body.immovable = true;

  let pipeTopCap = this.physics.add.sprite(gameWidth + PIPE_WIDTH / 2, gapY, 'capTexture').setOrigin(0.5, 1).setDepth(5);
  pipeTopCap.setDisplaySize(PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  pipeTopCap.body.setSize(PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  pipeTopCap.body.immovable = true;

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

// Create collision mask with validation
function createCollisionMask(sprite) {
  const texture = sprite.texture.getSourceImage();
  const frame = sprite.frame;
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(texture, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
  const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
  const mask = new Uint8Array(frame.width * frame.height);
  let nonTransparentCount = 0;
  for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
    mask[j] = imageData.data[i + 3] > 0 ? 1 : 0;
    if (mask[j] === 1) nonTransparentCount++;
  }
  console.log('Mask created: ', frame.width, 'x', frame.height, 'Non-transparent pixels:', nonTransparentCount);
  return { mask, width: frame.width, height: frame.height };
}

// Simplified and precise pixel-perfect collision
function pixelPerfectCollision(birdSprite, pipeSprite) {
  const bounds1 = birdSprite.getBounds();
  const bounds2 = pipeSprite.getBounds();

  // Use Arcade Physics bounds directly for initial overlap
  const intersection = Phaser.Geom.Rectangle.Intersection(bounds1, bounds2);
  if (intersection.width <= 0 || intersection.height <= 0) return false;

  const scaleX = birdSprite.scaleX;
  const scaleY = birdSprite.scaleY;

  const birdX = birdSprite.x - (birdSprite.width * scaleX * 0.5);
  const birdY = birdSprite.y - (birdSprite.height * scaleY * 0.5);

  const x1 = Math.floor((intersection.x - birdX) / scaleX);
  const y1 = Math.floor((intersection.y - birdY) / scaleY);
  const width = Math.ceil(intersection.width / scaleX);
  const height = Math.ceil(intersection.height / scaleY);

  const startX = Math.max(0, x1);
  const startY = Math.max(0, y1);
  const endX = Math.min(birdCollisionMask.width, x1 + width);
  const endY = Math.min(birdCollisionMask.height, y1 + height);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = y * birdCollisionMask.width + x;
      if (birdCollisionMask.mask[index] === 1) {
        // Pipes are solid, so any overlap with a non-transparent pixel is a hit
        return true;
      }
    }
  }

  return false;
}
