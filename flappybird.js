// === GAME SETTINGS ===
const GRAVITY = 900;
const FLAP_STRENGTH = -300;
const PIPE_SPEED = -200;
const PIPE_GAP = 175;
const PIPE_WIDTH = 80;
const PIPE_CAP_HEIGHT = 20;
const PIPE_SPAWN_DELAY = 1550;
const BACKGROUND_SPEED = -10;

let game, bird, ghostBird, pipes, scoreZones, scoreText, highScoreText;
let titleText, startText, gameOverText, restartText, shrimpSelectButton, shrimpSelectText;
let shrimpMenuContainer, shrimpMenuOptions = [];
let score = 0, highScore = 0, gameStarted = false, gameOver = false;
let background1, background2;
let birdCollisionMask;
let birdLastX, birdLastY;
let scoreSound, deathSound, flapSound;
let shrimpVariants = [
  { name: 'Normal', key: 'bird', tint: null, unlockScore: 0 },
  { name: 'Bronze', key: 'birdWhite', tint: 0xCD7F32, unlockScore: 25 },
  { name: 'Silver', key: 'birdWhite', tint: 0xC0C0C0, unlockScore: 50 },
  { name: 'Gold', key: 'birdWhite', tint: 0xDAA520, unlockScore: 100 },
  { name: 'Blue', key: 'birdWhite', tint: 0x1E90FF, unlockScore: 250 },
  { name: 'Lavender', key: 'birdWhite', tint: 0xDA70D6, unlockScore: 500 }
];
let selectedShrimpIndex = 0;
let menuVisible = false;

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
  this.load.image('birdWhite', 'https://i.ibb.co/1G273Kkc/whiteshrimp-2.png');
  this.load.image('background', 'https://i.ibb.co/2XWRWxZ/1739319234354.jpg');
  this.load.audio('score', 'score.wav');
  this.load.audio('death', 'death.wav');
  this.load.audio('flap', 'flap.wav');
}

function create() {
  const scene = this;
  const gameWidth = game.scale.width;
  const gameHeight = game.scale.height;

  const imageWidth = this.textures.get('background').getSourceImage().width;
  const imageHeight = this.textures.get('background').getSourceImage().height;
  const scaleFactor = gameHeight / imageHeight;
  const scaledWidth = imageWidth * scaleFactor;

  background1 = this.add.sprite(0, 0, 'background').setOrigin(0, 0).setScale(scaleFactor);
  background2 = this.add.sprite(scaledWidth, 0, 'background').setOrigin(0, 0).setScale(scaleFactor);

  const overlay = this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0xffffff, 0.3).setOrigin(0.5, 0.5).setDepth(-1);

  bird = this.physics.add.sprite(gameWidth * 0.2, gameHeight / 2, shrimpVariants[selectedShrimpIndex].key).setOrigin(0.5).setScale(0.0915);
  bird.body.allowGravity = false;
  bird.setDepth(10);
  if (shrimpVariants[selectedShrimpIndex].tint) bird.setTint(shrimpVariants[selectedShrimpIndex].tint);
  birdLastX = bird.x;
  birdLastY = bird.y;

  ghostBird = this.add.sprite(bird.x, bird.y, shrimpVariants[selectedShrimpIndex].key).setOrigin(0.5).setScale(0.0915);
  ghostBird.setAlpha(0.3);
  ghostBird.setDepth(11);
  if (shrimpVariants[selectedShrimpIndex].tint) ghostBird.setTint(shrimpVariants[selectedShrimpIndex].tint);
  ghostBird.visible = false;

  pipes = this.physics.add.group();
  scoreZones = this.add.group();

  const textStyle = { fontFamily: '"Press Start 2P", sans-serif', fontSize: '20px', fill: '#fff' };
  const titleFontSize = Math.min(gameWidth * 0.075, 32);
  titleText = this.add.text(gameWidth / 2, gameHeight * 0.3, 'FLAPPY SHRIMP', { 
    fontFamily: '"Press Start 2P", sans-serif', 
    fontSize: `${titleFontSize}px`, 
    fill: '#ffcc00' 
  }).setOrigin(0.5);

  startText = this.add.text(gameWidth / 2, gameHeight * 0.5, 'TAP TO START', textStyle).setOrigin(0.5).setDepth(10);
  startText.setInteractive();
  startText.on('pointerdown', () => {
    if (!gameStarted && !menuVisible) startGame.call(scene);
  });

  gameOverText = this.add.text(gameWidth / 2, gameHeight * 0.5, '', textStyle).setOrigin(0.5).setDepth(10);
  restartText = this.add.text(gameWidth / 2, gameHeight * 0.6, '', textStyle).setOrigin(0.5).setDepth(10);
  restartText.setInteractive();
  restartText.on('pointerdown', () => {
    if (gameOver && bird.y > game.scale.height + bird.displayHeight && !menuVisible) restartGame.call(scene);
  });

  scoreText = this.add.text(20, 20, 'SCORE: 0', textStyle).setDepth(10);
  highScoreText = this.add.text(20, 50, 'HIGH SCORE: ' + highScore, textStyle).setDepth(10);

  shrimpSelectButton = this.add.rectangle(gameWidth - 80, gameHeight - 30, 100, 40, 0x006400).setOrigin(0.5).setDepth(10);
  shrimpSelectText = this.add.text(gameWidth - 80, gameHeight - 30, 'Shrimp', {
    fontFamily: '"Press Start 2P", sans-serif',
    fontSize: '16px',
    fill: '#fff'
  }).setOrigin(0.5).setDepth(11);
  shrimpSelectButton.setInteractive();
  shrimpSelectButton.on('pointerdown', () => {
    toggleShrimpMenu.call(this);
  });
  shrimpSelectButton.visible = true; // Start screen only
  shrimpSelectText.visible = true;

  this.input.on('pointerdown', () => {
    if (gameStarted && !gameOver && !menuVisible) flap();
  });

  birdCollisionMask = createCollisionMask(bird);

  this.physics.add.overlap(bird, pipes, (birdSprite, pipeSprite) => {
    if (optimizedPixelPerfectCollision(birdSprite, pipeSprite)) hitPipe.call(this);
  }, null, this);

  highScore = localStorage.getItem('flappyHighScore') || 0;
  highScoreText.setText('HIGH SCORE: ' + highScore);

  scoreSound = this.sound.add('score', { volume: 1.5 });
  deathSound = this.sound.add('death');
  flapSound = this.sound.add('flap', { volume: 0.7 });

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
  if (!gameStarted) return;

  if (!gameOver) {
    background1.x += BACKGROUND_SPEED * (1 / 60);
    background2.x += BACKGROUND_SPEED * (1 / 60);
    if (background1.x + background1.displayWidth <= 0) background1.x = background2.x + background2.displayWidth;
    if (background2.x + background2.displayWidth <= 0) background2.x = background1.x + background1.displayWidth;

    bird.angle = Phaser.Math.Clamp(bird.angle + (bird.body.velocity.y > 0 ? 2 : -4), -20, 20);
    birdLastX = bird.x;
    birdLastY = bird.y;

    scoreZones.getChildren().forEach(zone => {
      if (!zone || zone.x + zone.width < 0) {
        zone.destroy();
        return;
      }
      zone.x += PIPE_SPEED * (1 / 60);
      if (!zone.passed && zone.x + zone.width + 40 < bird.x) {
        zone.passed = true;
        score++;
        scoreText.setText('SCORE: ' + score);
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('flappyHighScore', highScore);
          highScoreText.setText('HIGH SCORE: ' + highScore);
        }
        scoreSound.play();
      }
    });

    pipes.getChildren().forEach(pipe => {
      if (pipe.x + pipe.width < 0) pipe.destroy();
    });

    if (bird.y + bird.displayHeight / 2 >= game.scale.height) hitPipe.call(this);
  }

  if (gameOver && ghostBird.visible) {
    ghostBird.y -= 4;
    if (ghostBird.y < -ghostBird.displayHeight) ghostBird.visible = false;
  }

  if (gameOver && bird.y > game.scale.height + bird.displayHeight) showRestartScreen.call(this);
}

function startGame() {
  gameStarted = true;
  bird.body.allowGravity = true;
  titleText.setText('');
  startText.setText('');
  shrimpSelectButton.visible = false;
  shrimpSelectText.visible = false;
  if (shrimpMenuContainer) {
    shrimpMenuContainer.destroy();
    shrimpMenuContainer = null;
  }
  menuVisible = false;
  this.time.addEvent({ delay: PIPE_SPAWN_DELAY, loop: true, callback: addPipes, callbackScope: this });
}

function flap() {
  bird.body.setVelocityY(FLAP_STRENGTH);
  flapSound.play();
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

  let scoreZone = this.add.rectangle(gameWidth + PIPE_WIDTH + 160, gapY + PIPE_GAP / 2, 20, PIPE_GAP, 0xff0000, 0).setOrigin(0.5).setDepth(5);
  scoreZone.passed = false;

  pipes.addMultiple([pipeTopBody, pipeBottomBody, pipeTopCap, pipeBottomCap]);
  pipes.children.iterate(pipe => {
    pipe.body.setVelocityX(PIPE_SPEED);
    pipe.body.allowGravity = false;
    pipe.body.checkWorldBounds = true;
    pipe.body.outOfBoundsKill = true;
  });

  scoreZones.add(scoreZone);
}

function hitPipe() {
  if (gameOver) return;

  gameOver = true;
  pipes.setVelocityX(0);
  shrimpSelectButton.visible = false;
  shrimpSelectText.visible = false;
  if (shrimpMenuContainer) {
    shrimpMenuContainer.destroy();
    shrimpMenuContainer = null;
  }
  menuVisible = false;

  ghostBird.setPosition(bird.x, bird.y);
  ghostBird.angle = bird.angle;
  ghostBird.visible = true;
  deathSound.play();
}

function showRestartScreen() {
  gameOverText.setText('GAME OVER');
  restartText.setText('TAP TO RESTART');
  shrimpSelectButton.visible = true;
  shrimpSelectText.visible = true;
}

function restartGame() {
  gameOver = false;
  score = 0;
  scoreText.setText('SCORE: ' + score);
  bird.setPosition(game.scale.width * 0.2, game.scale.height / 2);
  bird.body.setVelocity(0, 0);
  bird.angle = 0;
  pipes.clear(true, true); // Cleanup here after tap
  scoreZones.clear(true, true); // Cleanup here after tap
  gameOverText.setText('');
  restartText.setText('');
  shrimpSelectButton.visible = false;
  shrimpSelectText.visible = false;
  if (shrimpMenuContainer) {
    shrimpMenuContainer.destroy();
    shrimpMenuContainer = null;
  }
  menuVisible = false;
  birdLastX = bird.x;
  birdLastY = bird.y;
}

function toggleShrimpMenu(forceHide = null) {
  if (forceHide === false || (forceHide === null && menuVisible)) {
    if (shrimpMenuContainer) {
      shrimpMenuContainer.destroy();
      shrimpMenuContainer = null;
    }
    menuVisible = false;
  } else if (forceHide === true || (forceHide === null && !menuVisible && (!gameStarted || (gameOver && bird.y > game.scale.height + bird.displayHeight)))) {
    createShrimpMenu.call(this);
    menuVisible = true;
  }
}

function createShrimpMenu() {
  const gameWidth = game.scale.width;
  const gameHeight = game.scale.height;

  shrimpMenuContainer = this.add.container(gameWidth / 2, gameHeight / 2).setDepth(20);
  const menuBg = this.add.rectangle(0, 0, 400, 250, 0x444444).setOrigin(0.5);
  menuBg.setStrokeStyle(2, 0xFFFFFF);
  shrimpMenuContainer.add(menuBg);

  shrimpMenuOptions = [];
  const unlockedVariants = shrimpVariants.filter(variant => highScore >= variant.unlockScore);
  unlockedVariants.forEach((variant, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const xPos = -120 + col * 120;
    const yPos = -70 + row * 140;

    const sprite = this.add.sprite(xPos, yPos - 15, variant.key).setOrigin(0.5).setScale(0.0915);
    if (variant.tint) sprite.setTint(variant.tint);

    const text = this.add.text(xPos, yPos + 25, variant.name, {
      fontFamily: '"Press Start 2P", sans-serif',
      fontSize: '16px',
      fill: '#fff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    const option = this.add.rectangle(xPos, yPos, 100, 50, 0x000000, 0).setOrigin(0.5);
    option.setInteractive();
    option.on('pointerdown', () => {
      selectedShrimpIndex = shrimpVariants.indexOf(variant);
      bird.setTexture(variant.key);
      if (variant.tint) bird.setTint(variant.tint);
      else bird.clearTint();
      ghostBird.setTexture(variant.key);
      if (variant.tint) ghostBird.setTint(variant.tint);
      else ghostBird.clearTint();
      toggleShrimpMenu.call(this, false);
    });
    option.on('pointerover', () => sprite.setScale(0.1));
    option.on('pointerout', () => sprite.setScale(0.0915));

    shrimpMenuContainer.add([sprite, text, option]);
    shrimpMenuOptions.push({ sprite, text, hitbox: option });
  });
}

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
  return { mask, width: frame.width, height: frame.height };
}

function optimizedPixelPerfectCollision(birdSprite, pipeSprite) {
  const scaleX = birdSprite.scaleX;
  const scaleY = birdSprite.scaleY;
  const maskWidth = birdCollisionMask.width;
  const maskHeight = birdCollisionMask.height;
  const angle = Phaser.Math.DegToRad(birdSprite.angle);

  const currentBounds = new Phaser.Geom.Rectangle(birdSprite.body.x, birdSprite.body.y, birdSprite.body.width, birdSprite.body.height);
  const lastBounds = new Phaser.Geom.Rectangle(birdLastX - (birdSprite.body.width * 0.5), birdLastY - (birdSprite.body.height * 0.5), birdSprite.body.width, birdSprite.body.height);
  const pipeBounds = new Phaser.Geom.Rectangle(pipeSprite.body.x, pipeSprite.body.y, pipeSprite.body.width, pipeSprite.body.height);

  const vx = birdSprite.body.velocity.x * (1 / 60) * 2;
  const vy = birdSprite.body.velocity.y * (1 / 60) * 2;
  const sweptBounds = Phaser.Geom.Rectangle.Union(currentBounds, lastBounds);
  Phaser.Geom.Rectangle.Inflate(sweptBounds, Math.abs(vx), Math.abs(vy));

  const intersection = Phaser.Geom.Rectangle.Intersection(sweptBounds, pipeBounds);
  if (intersection.width <= 0 || intersection.height <= 0) return false;

  const cosAngle = Math.cos(-angle);
  const sinAngle = Math.sin(-angle);

  const x1 = Math.floor((intersection.x - birdSprite.body.x) / scaleX);
  const y1 = Math.floor((intersection.y - birdSprite.body.y) / scaleY);
  const width = Math.ceil(intersection.width / scaleX);
  const height = Math.ceil(intersection.height / scaleY);

  const startX = Math.max(0, x1);
  const startY = Math.max(0, y1);
  const endX = Math.min(maskWidth, x1 + width);
  const endY = Math.min(maskHeight, y1 + height);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const relX = x - maskWidth * 0.5;
      const relY = y - maskHeight * 0.5;
      const rotatedX = relX * cosAngle - relY * sinAngle + maskWidth * 0.5;
      const rotatedY = relX * sinAngle + relY * cosAngle + maskHeight * 0.5;

      const rx = Math.floor(rotatedX);
      const ry = Math.floor(rotatedY);
      if (rx >= 0 && rx < maskWidth && ry >= 0 && ry < maskHeight) {
        if (birdCollisionMask.mask[ry * maskWidth + rx] === 1) return true;
      }
    }
  }

  const dx = birdSprite.x - birdLastX + vx;
  const dy = birdSprite.y - birdLastY + vy;
  if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(distance * 3));
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i <= steps; i++) {
      const interpX = birdLastX + stepX * i;
      const interpY = birdLastY + stepY * i;
      const interpBounds = new Phaser.Geom.Rectangle(interpX - (birdSprite.body.width * 0.5), interpY - (birdSprite.body.height * 0.5), birdSprite.body.width, birdSprite.body.height);

      if (Phaser.Geom.Rectangle.Overlaps(interpBounds, pipeBounds)) {
        const x1 = Math.floor((pipeBounds.x - interpX + (birdSprite.body.width * 0.5)) / scaleX);
        const y1 = Math.floor((pipeBounds.y - interpY + (birdSprite.body.height * 0.5)) / scaleY);
        const width = Math.ceil(pipeBounds.width / scaleX);
        const height = Math.ceil(pipeBounds.height / scaleY);

        const startX = Math.max(0, x1);
        const startY = Math.max(0, y1);
        const endX = Math.min(maskWidth, x1 + width);
        const endY = Math.min(maskHeight, y1 + height);

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const relX = x - maskWidth * 0.5;
            const relY = y - maskHeight * 0.5;
            const rotatedX = relX * cosAngle - relY * sinAngle + maskWidth * 0.5;
            const rotatedY = relX * sinAngle + relY * cosAngle + maskHeight * 0.5;

            const rx = Math.floor(rotatedX);
            const ry = Math.floor(rotatedY);
            if (rx >= 0 && rx < maskWidth && ry >= 0 && ry < maskHeight) {
              if (birdCollisionMask.mask[ry * maskWidth + rx] === 1) return true;
            }
          }
        }
      }
    }
  }

  return false;
}
