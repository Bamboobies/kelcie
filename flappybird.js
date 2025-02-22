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
let shrimpButton, shrimpMenu, selectedShrimp = 'bird'; // Track selected shrimp type

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
  // Preload new shrimp variations
  this.load.image('bronzeShrimp', generateShrimpTexture(this, 'bronze'));
  this.load.image('silverShrimp', generateShrimpTexture(this, 'silver'));
  this.load.image('goldShrimp', generateShrimpTexture(this, 'gold'));
}

// Helper function to generate shrimp texture with overlays
function generateShrimpTexture(scene, type) {
  const graphics = scene.add.graphics();
  const baseTexture = scene.textures.get('bird').getSourceImage();
  graphics.fillStyle(0x000000, 0); // Transparent background
  graphics.fillRect(0, 0, baseTexture.width, baseTexture.height);
  
  // Apply overlay based on type
  let overlayColor;
  switch (type) {
    case 'bronze':
      overlayColor = 0xCD7F32; // Bronze color (e.g., #CD7F32)
      break;
    case 'silver':
      overlayColor = 0xC0C0C0; // Silver color (e.g., #C0C0C0)
      break;
    case 'gold':
      overlayColor = 0xFFD700; // Gold color (e.g., #FFD700)
      break;
  }
  
  graphics.fillStyle(overlayColor, 0.5); // Semi-transparent overlay
  graphics.fillRect(0, 0, baseTexture.width, baseTexture.height);
  graphics.generateTexture(`${type}Shrimp`, baseTexture.width, baseTexture.height);
  graphics.destroy();
  return `${type}Shrimp`;
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

  // Initialize bird with the selected shrimp type
  bird = this.physics.add.sprite(gameWidth * 0.2, gameHeight / 2, selectedShrimp).setOrigin(0.5).setScale(0.0915);
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

  // Shrimp button in bottom-right corner
  shrimpButton = this.add.text(gameWidth - 80, gameHeight - 30, 'Shrimp', {
    fontFamily: '"Press Start 2P", sans-serif',
    fontSize: '16px',
    fill: '#fff',
    backgroundColor: '#000000',
    padding: { x: 10, y: 5 }
  }).setOrigin(0.5).setInteractive().setDepth(10);
  shrimpButton.on('pointerdown', () => showShrimpMenu.call(scene));

  this.input.on('pointerdown', () => {
    if (!gameStarted) startGame.call(scene);
    else if (gameOver) restartGame.call(scene);
    else flap();
  });

  this.physics.add.collider(bird, pipes, hitPipe, null, this);

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

  // Pre-generate endcap texture (pixel-art Mario rim with wider light center, narrower dark edges, subtler gradient)
  const capGraphics = this.add.graphics();
  capGraphics.fillStyle(0x006600, 1); // Base darker green (unused, overwritten by gradient)
  capGraphics.fillRect(0, 0, PIPE_WIDTH + 10, PIPE_CAP_HEIGHT);
  // Pixel-art gradient with 20 steps, wider light center, narrower dark edges, subtler colors (vertical)
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

// Function to show shrimp selection menu
function showShrimpMenu() {
  if (shrimpMenu) return; // Prevent multiple menus

  const scene = this;
  const gameWidth = game.scale.width;
  const gameHeight = game.scale.height;

  // Create a semi-transparent background for the menu
  const menuBg = this.add.rectangle(gameWidth / 2, gameHeight / 2, 300, 400, 0x000000, 0.7).setOrigin(0.5).setDepth(20);
  shrimpMenu = this.add.group();

  // Add title
  const menuTitle = this.add.text(gameWidth / 2, gameHeight / 2 - 150, 'Choose Your Shrimp', {
    fontFamily: '"Press Start 2P", sans-serif',
    fontSize: '20px',
    fill: '#fff'
  }).setOrigin(0.5).setDepth(21);
  shrimpMenu.add(menuTitle);

  // Shrimp options (original, bronze, silver, gold)
  const shrimpTypes = ['bird', 'bronzeShrimp', 'silverShrimp', 'goldShrimp'];
  const shrimpYPositions = [-50, 0, 50, 100];
  shrimpTypes.forEach((type, index) => {
    const shrimp = this.add.image(gameWidth / 2 - 50, gameHeight / 2 + shrimpYPositions[index], type)
      .setScale(0.0915).setOrigin(0.5).setInteractive().setDepth(21);
    shrimpMenu.add(shrimp);

    // Highlight selected shrimp
    if (type === selectedShrimp) {
      const highlight = this.add.rectangle(shrimp.x, shrimp.y, shrimp.displayWidth + 10, shrimp.displayHeight + 10, 0x00FF00, 0.5)
        .setOrigin(0.5).setDepth(20);
      shrimpMenu.add(highlight);
    }

    // Handle shrimp selection
    shrimp.on('pointerdown', () => {
      selectedShrimp = type;
      shrimpMenu.getChildren().forEach(child => {
        if (child.type === 'Rectangle' && child.isTintable) {
          child.destroy(); // Remove old highlights
        }
      });
      const newHighlight = this.add.rectangle(shrimp.x, shrimp.y, shrimp.displayWidth + 10, shrimp.displayHeight + 10, 0x00FF00, 0.5)
        .setOrigin(0.5).setDepth(20);
      shrimpMenu.add(newHighlight);

      // Update bird sprite if game isn't active
      if (!gameStarted && !gameOver) {
        bird.destroy();
        bird = scene.physics.add.sprite(gameWidth * 0.2, gameHeight / 2, selectedShrimp).setOrigin(0.5).setScale(0.0915);
        bird.body.setCollideWorldBounds(true);
        bird.body.allowGravity = false;
        scene.physics.add.collider(bird, pipes, hitPipe, null, scene);
      }
    });
  });

  // Close button
  const closeButton = this.add.text(gameWidth / 2, gameHeight / 2 + 150, 'Close', {
    fontFamily: '"Press Start 2P", sans-serif',
    fontSize: '16px',
    fill: '#fff',
    backgroundColor: '#000000',
    padding: { x: 10, y: 5 }
  }).setOrigin(0.5).setInteractive().setDepth(21);
  closeButton.on('pointerdown', () => {
    shrimpMenu.clear(true, true);
    shrimpMenu = null;
  });
  shrimpMenu.add(closeButton);
}
