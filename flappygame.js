// === GAME SETTINGS ===
const GRAVITY = 1.5;
const FLAP_STRENGTH = -5;
const PIPE_SPEED = -3;
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
    physics: {
      default: 'matter', // Switch to Matter Physics
      matter: {
        gravity: { y: GRAVITY },
        debug: false // Set to true to see physics bodies
      }
    },
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

  // Create the bird with Matter Physics
  bird = this.matter.add.sprite(gameWidth * 0.2, gameHeight / 2, 'bird').setOrigin(0.5).setScale(0.09);
  bird.setCollideWorldBounds(true);
  bird.setIgnoreGravity(false);

  pipes = this.matter.add.group();
  scoreZones = this.matter.add.group();

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

  this.matter.world.on('collisionstart', (event) => {
    event.pairs.forEach(pair => {
      if (pair.bodyA === bird.body || pair.bodyB === bird.body) {
        hitPipe.call(scene);
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
  if (bird.y > game.scale.height) {
    hitPipe.call(this);
  }

  checkScore();
}

function startGame() {
  gameStarted = true;
  bird.setIgnoreGravity(false);
  titleText.setText('');
  startText.setText('');
  this.time.addEvent({ delay: PIPE_SPAWN_DELAY, loop: true, callback: addPipes, callbackScope: this });
}

function flap() {
  bird.setVelocityY(FLAP_STRENGTH);
}

function addPipes() {
  if (gameOver) return;

  const gameHeight = game.scale.height;
  let gapY = Phaser.Math.Between(100, gameHeight - PIPE_GAP - 100);

  let pipeTopBody = this.matter.add.rectangle(game.scale.width, gapY - PIPE_CAP_HEIGHT, PIPE_WIDTH, gapY, { isStatic: true });
  let pipeBottomBody = this.matter.add.rectangle(game.scale.width, gapY + PIPE_GAP + PIPE_CAP_HEIGHT, PIPE_WIDTH, gameHeight - (gapY + PIPE_GAP), { isStatic: true });

  pipes.add(pipeTopBody);
  pipes.add(pipeBottomBody);

  [pipeTopBody, pipeBottomBody].forEach(pipe => {
    pipe.setVelocityX(PIPE_SPEED);
    pipe.setIgnoreGravity(true);
  });
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
  this.matter.pause();

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
  bird.setVelocity(0, 0);
  pipes.clear(true, true);
  scoreZones.clear(true, true);
  this.matter.resume();
  gameOverText.setText('');
  restartText.setText('');
}
