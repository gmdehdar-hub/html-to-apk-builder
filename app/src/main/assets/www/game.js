// Cyber Dash Canvas Game for Android APK
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreVal');
const bestEl = document.getElementById('bestVal');
const startScreen = document.getElementById('startScreen') || document.getElementById('start-screen');
const gameOverScreen = document.getElementById('gameOverScreen') || document.getElementById('game-over-screen');
const finalScoreVal = document.getElementById('finalScoreVal');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const jumpBtn = document.getElementById('jumpBtn');
const duckBtn = document.getElementById('duckBtn');

// Sound synthesis using Web Audio API (Zero external assets, works 100% offline)
let audioCtx = null;
function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'jump') {
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.14);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'score') {
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'crash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    console.log('Audio fallback');
  }
}

function triggerHaptic(duration = 40) {
  if (navigator.vibrate) {
    try { navigator.vibrate(duration); } catch(e) {}
  }
}

let width, height;
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let state = 'menu'; // menu, playing, gameover
let score = 0;
let bestScore = parseInt(localStorage.getItem('cyber_dash_best') || '0', 10);
bestEl.textContent = bestScore;

// Player entity
const player = {
  x: 70,
  y: 0,
  w: 36,
  h: 46,
  vy: 0,
  isGrounded: false,
  isDucking: false,
  color: '#10b981'
};

const groundY = () => height - 80;
let obstacles = [];
let particles = [];
let gameSpeed = 5;
let spawnTimer = 0;

function jump() {
  if (state !== 'playing') return;
  if (player.isGrounded) {
    player.vy = -13.5;
    player.isGrounded = false;
    playSound('jump');
    triggerHaptic(20);
    createParticles(player.x + player.w/2, player.y + player.h, '#10b981', 8);
  }
}

function setDucking(duck) {
  if (state !== 'playing') return;
  player.isDucking = duck;
  player.h = duck ? 24 : 46;
}

function createParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      size: Math.random() * 4 + 2,
      color,
      life: 1
    });
  }
}

function startGame() {
  state = 'playing';
  score = 0;
  gameSpeed = 5.5;
  obstacles = [];
  particles = [];
  player.y = groundY() - player.h;
  player.vy = 0;
  player.isGrounded = true;
  scoreEl.textContent = '0';
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
}

function gameOver() {
  state = 'gameover';
  playSound('crash');
  triggerHaptic([60, 40, 90]);
  createParticles(player.x + 20, player.y + 20, '#ef4444', 25);
  finalScoreVal.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('cyber_dash_best', bestScore);
    bestEl.textContent = bestScore;
  }
  gameOverScreen.classList.remove('hidden');
}

// Input bindings
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); });
jumpBtn.addEventListener('mousedown', jump);
duckBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setDucking(true); });
duckBtn.addEventListener('touchend', (e) => { e.preventDefault(); setDucking(false); });
duckBtn.addEventListener('mousedown', () => setDucking(true));
duckBtn.addEventListener('mouseup', () => setDucking(false));

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') jump();
  if (e.code === 'ArrowDown') setDucking(true);
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') setDucking(false);
});

// Game Loop
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  ctx.clearRect(0, 0, width, height);

  // Background grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  for (let x = (now * -0.05) % 40; x < width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }

  // Ground line
  const gy = groundY();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(width, gy);
  ctx.stroke();

  if (state === 'playing') {
    // Gravity & Physics
    player.vy += 32 * dt;
    player.y += player.vy;
    if (player.y >= gy - player.h) {
      player.y = gy - player.h;
      player.vy = 0;
      player.isGrounded = true;
    }

    // Spawning obstacles
    spawnTimer += dt;
    if (spawnTimer > 1.8 - Math.min(score * 0.02, 0.7)) {
      spawnTimer = 0;
      const isFlying = Math.random() > 0.65;
      obstacles.push({
        x: width + 20,
        y: isFlying ? gy - 58 : gy - 40,
        w: isFlying ? 36 : 28,
        h: isFlying ? 18 : 40,
        type: isFlying ? 'drone' : 'barrier',
        passed: false
      });
    }

    // Move & draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= gameSpeed * 60 * dt;

      // Obstacle render
      ctx.fillStyle = obs.type === 'drone' ? '#f59e0b' : '#ef4444';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.shadowBlur = 0;

      // Collision check
      if (
        player.x < obs.x + obs.w &&
        player.x + player.w > obs.x &&
        player.y < obs.y + obs.h &&
        player.y + player.h > obs.y
      ) {
        gameOver();
        break;
      }

      // Score count
      if (!obs.passed && obs.x + obs.w < player.x) {
        obs.passed = true;
        score += 10;
        scoreEl.textContent = score;
        playSound('score');
        gameSpeed += 0.08;
      }

      if (obs.x < -60) obstacles.splice(i, 1);
    }
  }

  // Draw Player
  ctx.fillStyle = player.color;
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 12;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  // Visor
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(player.x + (player.isDucking ? 16 : 18), player.y + 8, 12, 6);
  ctx.shadowBlur = 0;

  // Draw Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt * 1.5;
    if (p.life <= 0) {
      particles.splice(i, 1);
    } else {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1.0;

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
