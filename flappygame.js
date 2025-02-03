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

// Matter.js variables
let engine, world;

window.onload = () => {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
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

  // Initialize Matter.js
  engine = Matter.Engine.create();
  world = engine.world;
  Matter.Engine.run(engine);

  scene.cameras.main.setBackgroundColor('#70c5ce');

  // Create the bird with Matter.js
  bird = Matter.Bodies.rectangle(gameWidth * 0.2, gameHeight / 2, 34, 24, {
    render: {
      sprite: {
        texture: 'https://i.postimg.cc/prdzpSD2/trimmed-image.png',
        xScale: 0.09,
        yScale: 0.09
      }
    },
    label: 'bird'
  });
  Matter.World.add(world, bird);

  // Create pipes with Matter.js
  pipes = [];
  scoreZones = [];

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

  highScore = localStorage.getItem('flappyHighScore') || 0;
  highScoreText.setText('HIGH SCORE: ' + highScore);

  // Add collision detection
  Matter.Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if ((pair.bodyA.label === 'bird' && pair.bodyB.label === 'pipe') || (pair.bodyA.label === 'pipe' && pair.bodyB.label === 'bird')) {
        hitPipe.call(scene);
      }
    }
  });
}

function update() {
  if (gameOver) return;

  // Rotate the bird based on velocity
  bird.angle = bird.velocity.y > 0 ? 20 : -20;

  // Check if the bird touches the bottom of the playable area
  if (bird.position.y > game.scale.height) {
    hitPipe.call(this);
  }

  checkScore();
}

function startGame() {
  gameStarted = true;
  Matter.Body.set(bird, 'isStatic', false);
  titleText.setText('');
  startText.setText('');
  this.time.addEvent({ delay: PIPE_SPAWN_DELAY, loop: true, callback: addPipes, callbackScope: this });
}

function flap() {
  Matter.Body.setVelocity(bird, { x: 0, y: FLAP_STRENGTH });
}

function addPipes() {
  if (gameOver) return;

  const gameHeight = game.scale.height;
  let gapY = Phaser.Math.Between(100, gameHeight - PIPE_GAP - 100);

  let pipeTop = Matter.Bodies.rectangle(game.scale.width, gapY - PIPE_CAP_HEIGHT, PIPE_WIDTH, gapY, { isStatic: false, label: 'pipe' });
  let pipeBottom = Matter.Bodies.rectangle(game.scale.width, gapY + PIPE_GAP + PIPE_CAP_HEIGHT, PIPE_WIDTH, gameHeight - (gapY + PIPE_GAP), { isStatic: false, label: 'pipe' });

  Matter.World.add(world, [pipeTop, pipeBottom]);
  pipes.push(pipeTop, pipeBottom);

  // Move pipes
  Matter.Body.setVelocity(pipeTop, { x: PIPE_SPEED, y: 0 });
  Matter.Body.setVelocity(pipeBottom, { x: PIPE_SPEED, y: 0 });

  // Remove pipes when they go off-screen
  setTimeout(() => {
    Matter.World.remove(world, [pipeTop, pipeBottom]);
    pipes.splice(pipes.indexOf(pipeTop), 1);
    pipes.splice(pipes.indexOf(pipeBottom), 1);
  }, 5000); // Adjust timeout based on pipe speed
}

function checkScore() {
  pipes.forEach(pipe => {
    if (!pipe.passed && pipe.position.x < bird.position.x) {
      pipe.passed = true;
      score++;
      scoreText.setText('SCORE: ' + score);
    }
  });
}

function hitPipe() {
  if (gameOver) return;

  gameOver = true;
  Matter.Engine.clear(engine);

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
  Matter.Body.setPosition(bird, { x: game.scale.width * 0.2, y: game.scale.height / 2 });
  Matter.Body.setVelocity(bird, { x: 0, y: 0 });
  pipes.forEach(pipe => Matter.World.remove(world, pipe));
  pipes = [];
  Matter.Engine.run(engine);
  gameOverText.setText('');
  restartText.setText('');
}
