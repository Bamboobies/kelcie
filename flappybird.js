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
    physics: { 
      default: 'matter', 
      matter: { 
        gravity: { y: GRAVITY },
        debug: false,
        enableSleeping: false
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

  // Initialize Matter physics for bird
  bird = this.matter.add.sprite(gameWidth * 0.2, gameHeight / 2, 'bird');
  bird.setScale(0.0915);
  bird.setOrigin(0.5);
  bird.setBounce(0); // No bounce
  bird.setFriction(0); // No friction
  bird.setMass(1); // Lightweight bird
  bird.body.allowGravity = false; // Disable gravity initially

  pipes = this.matter.world.create();
  scoreZones = this.matter.world.create();

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

  // Matter collision detection for bird and pipes
  this.matter.world.on('collisionstart', (event) => {
    event.pairs.forEach(pair => {
      if ((pair.bodyA.gameObject === bird || pair.bodyB.gameObject === bird) && 
          (pipes.bodies.includes(pair.bodyA) || pipes.bodies.includes(pair.bodyB))) {
        hitPipe.call(scene);
      }
    });
  });

  highScore = localStorage.getItem('flappyHighScore') || 0;
  highScoreText.setText('HIGH SCORE: ' + highScore);

  // Pre-generate pipe texture (pixel-art Mario pipe with wider light center, narrower dark edges, subtler gradient)
  const pipeGraphics = this.add.graphics();
  pipeGraphics.fillStyle(0x00A300, 1); // Base green (unused, overwritten by gradient)
  pipeGraphics.fillRect(0, 0, PIPE_WIDTH, 512);
  // Pixel-art gradient with 16 steps, wider light center, narrower dark edges, subtler colors
  const startColor = 0x5C7A43; // Lighter medium dark green (less dark edges)
  const endColor = 0xA0D22A;   // Medium yellow-green (center, unchanged)
  const pipeSteps = 16;
  const stepWidth = PIPE_WIDTH / pipeSteps;
  for (let i = 0; i < pipeSteps; i++) {
    // Use a flatter bell curve for wider light center, narrower dark edges
    const center = (pipeSteps - 1) / 2;
    const distance = Math.abs(i - center) / center; // 0 at center, 1 at edges
    const factor = Math.pow(Math.sin(distance * Math.PI / 2), 1.5); // Flatter curve (0 at center, 1 at edges, slower transition)
    const color = interpolateColor(endColor, startColor, factor); // Light in wider center, less dark on narrower sides
    pipeGraphics.fillStyle(color, 1);
    pipeGraphics.fillRect(i * stepWidth, 0, stepWidth, 512); // No overlap for pixel-art look
  }
  // Thin dark outline on sides only
  pipeGraphics.lineStyle(1, 0x003300, 1); // Thin dark green outline
  pipeGraphics.lineBetween(1, 0, 1, 512); // Left side
  pipeGraphics.lineBetween(PIPE_WIDTH - 1, 0, PIPE_WIDTH - 1, 512); // Right side
  pipeGraphics.generateTexture('pipeTexture', PIPE_WIDTH, 512);
  pipeGraphics.destroy();
  console.log('Pipe texture exists:', this.textures.exists('pipeTexture'));

  // Pre-generate endcap texture (pixel-art Mario rim with wider light center, narrower dark edges, subtler gradient, fixed)
  const capGraphics = this.add.graphics();
  capGraphics.fillStyle(0x006600, 1); // Base darker green (unused, overwritten by gradient)
  capGraphics.fillRect(0, 0, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  // Pixel-art gradient with 20 steps, wider light center, narrower dark edges, subtler colors (vertical, fixed)
  const capSteps = 20;
  const stepWidthCap = (PIPE_WIDTH + 10) / capSteps;
  for (let i = 0; i < capSteps; i++) {
    // Use a flatter bell curve for wider light center, narrower dark edges
    const center = (capSteps - 1) / 2;
    const distance = Math.abs(i - center) / center; // 0 at center, 1 at edges
    const factor = Math.pow(Math.sin(distance * Math.PI / 2), 1.5); // Flatter curve (0 at center, 1 at edges, slower transition)
    const color = interpolateColor(endColor, startColor, factor); // Light in wider center, less dark on narrower sides
    capGraphics.fillStyle(color, 1);
    // Ensure precise pixel alignment to avoid vertical lines
    const x = Math.floor(i * stepWidthCap); // Floor to avoid floating-point precision issues
    const width = Math.ceil((i + 1) * stepWidthCap) - x; // Calculate exact width, avoiding overlap
    if (width > 0) { // Only draw if width is positive
      capGraphics.fillRect(x, 0, width, PIPE_CAP_HEIGHT); // Use precise pixel positions
    }
  }
  // Thin dark outline
  capGraphics.lineStyle(1, 0x003300, 1); // Thin dark green outline
  capGraphics.strokeRect(1, 1, PIPE_WIDTH + 8, PIPE_CAP_HEIGHT - 2);
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

  if (gameStarted && !gameOver) {
    // Update bird rotation (simulating Arcade behavior)
    bird.rotation = Phaser.Math.Clamp(bird.rotation + (bird.body.velocity.y > 0 ? 0.03 : -0.06), -0.35, 0.35); // Convert to radians

    // Check for ground collision (simulating blocked.down)
    if (bird.y >= gameHeight - bird.displayHeight / 2) {
      hitPipe.call(this);
    }
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
  if (gameStarted && !gameOver) {
    bird.setVelocityY(FLAP_STRENGTH);
  }
}

function addPipes() {
  if (gameOver) return;

  let gameWidth = game.scale.width;
  let gameHeight = game.scale.height;

  let minGapY = 120;
  let maxGapY = gameHeight - PIPE_GAP - 120;
  let gapY = Phaser.Math.Clamp(Phaser.Math.Between(minGapY, maxGapY), minGapY, maxGapY);

  // Top pipe body
  let pipeTopBody = this.matter.add.sprite(gameWidth, gapY - PIPE_CAP_HEIGHT, 'pipeTexture');
  pipeTopBody.setDisplaySize(PIPE_WIDTH, gapY);
  pipeTopBody.setStatic(true); // Static to prevent movement by Matter
  pipeTopBody.body.friction = 0;
  pipeTopBody.body.frictionStatic = 0;
  pipeTopBody.body.restitution = 0; // No bounce
  pipeTopBody.setDepth(5);

  // Bottom pipe body
  let bottomHeight = gameHeight - (gapY + PIPE_GAP + PIPE_CAP_HEIGHT);
  let pipeBottomBody = this.matter.add.sprite(gameWidth, gapY + PIPE_GAP + PIPE_CAP_HEIGHT, 'pipeTexture');
  pipeBottomBody.setDisplaySize(PIPE_WIDTH, bottomHeight);
  pipeBottomBody.setStatic(true);
  pipeBottomBody.body.friction = 0;
  pipeBottomBody.body.frictionStatic = 0;
  pipeBottomBody.body.restitution = 0;
  pipeBottomBody.setDepth(5);

  // Top pipe endcap
  let pipeTopCap = this.matter.add.sprite(gameWidth + PIPE_WIDTH / 2, gapY, 'capTexture');
  pipeTopCap.setDisplaySize(PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  pipeTopCap.setStatic(true);
  pipeTopCap.body.friction = 0;
  pipeTopCap.body.frictionStatic = 0;
  pipeTopCap.body.restitution = 0;
  pipeTopCap.setDepth(5);

  // Bottom pipe endcap
  let pipeBottomCap = this.matter.add.sprite(gameWidth + PIPE_WIDTH / 2, gapY + PIPE_GAP, 'capTexture');
  pipeBottomCap.setDisplaySize(PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  pipeBottomCap.setStatic(true);
  pipeBottomCap.body.friction = 0;
  pipeBottomCap.body.frictionStatic = 0;
  pipeBottomCap.body.restitution = 0;
  pipeBottomCap.setDepth(5);

  // Score zone (using Matter body for collision detection)
  let scoreZone = this.matter.add.rectangle(gameWidth + PIPE_WIDTH / 2, gapY + PIPE_GAP / 2, 10, PIPE_GAP, {
    isStatic: true,
    friction: 0,
    frictionStatic: 0,
    restitution: 0,
    isSensor: true // Sensor for score detection, no physical collision
  });
  scoreZone.gameObject = this.add.rectangle(gameWidth + PIPE_WIDTH / 2, gapY + PIPE_GAP / 2, 10, PIPE_GAP, 0xff0000, 0).setDepth(5);
  scoreZone.passed = false;

  pipes.add(pipeTopBody);
  pipes.add(pipeBottomBody);
  pipes.add(pipeTopCap);
  pipes.add(pipeBottomCap);
  scoreZones.add(scoreZone);

  // Apply velocity for pipe movement (Matter uses velocity instead of Arcade setVelocityX)
  [pipeTopBody, pipeBottomBody, pipeTopCap, pipeBottomCap, scoreZone].forEach(obj => {
    obj.setVelocityX(PIPE_SPEED);
    obj.setIgnoreGravity(true); // Ignore gravity for static pipes
  });
}

function checkScore() {
  scoreZones.getChildren().forEach(scoreZone => {
    if (!scoreZone.passed && scoreZone.position.x < bird.x) {
      scoreZone.passed = true;
      score++;
      scoreText.setText('SCORE: ' + score);
    }
  });
}

function hitPipe() {
  if (gameOver) return;

  gameOver = true;
  this.matter.pause(); // Pause Matter physics

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
  bird.setVelocity(0, 0);
  bird.body.allowGravity = false; // Disable gravity temporarily
  pipes.clear(true, true);
  scoreZones.clear(true, true);
  this.matter.resume(); // Resume Matter physics
  gameStarted = false; // Reset game state to require tap to start
  bird.body.allowGravity = false; // Ensure gravity is off until start
  startText.setText('TAP TO START');
  gameOverText.setText('');
  restartText.setText('');
}
