// Initialize Supabase Client directly in the browser
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const statusDiv = document.getElementById('status');

let gameInterval;
let isRunning = false;
let score = 0;
let sessionId = 'session_' + Math.random().toString(36).substring(2, 9);

// Player Car
const player = {
  x: 180,
  y: 420,
  width: 40,
  height: 60,
  speed: 20
};

// Enemy Car
const enemy = {
  x: Math.random() * (canvas.width - 40),
  y: -60,
  width: 40,
  height: 60,
  speed: 4
};

// Keyboard Controls
document.addEventListener('keydown', (e) => {
  if (!isRunning) return;
  if (e.key === 'ArrowLeft' && player.x > 0) player.x -= player.speed;
  if (e.key === 'ArrowRight' && player.x < canvas.width - player.width) player.x += player.speed;
});

// Touch / Button Controls
leftBtn.addEventListener('click', () => {
  if (isRunning && player.x > 0) player.x -= player.speed;
});

rightBtn.addEventListener('click', () => {
  if (isRunning && player.x < canvas.width - player.width) player.x += player.speed;
});

startBtn.addEventListener('click', startGame);

function startGame() {
  if (isRunning) return;
  isRunning = true;
  score = 0;
  player.x = 180;
  enemy.y = -60;
  enemy.x = Math.random() * (canvas.width - 40);
  statusDiv.innerText = "Game Running... Score: 0";
  
  gameInterval = setInterval(updateGame, 1000 / 30);
}

function updateGame() {
  // Move Enemy
  enemy.y += enemy.speed;
  if (enemy.y > canvas.height) {
    enemy.y = -60;
    enemy.x = Math.random() * (canvas.width - 40);
    score += 10;
    statusDiv.innerText = `Game Running... Score: ${score}`;
  }

  // Collision Check
  if (
    player.x < enemy.x + enemy.width &&
    player.x + player.width > enemy.x &&
    player.y < enemy.y + enemy.height &&
    player.y + player.height > enemy.y
  ) {
    endGame();
  }

  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Player (Blue)
  ctx.fillStyle = '#007bff';
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw Enemy (Red)
  ctx.fillStyle = '#dc3545';
  ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
}

async function endGame() {
  clearInterval(gameInterval);
  isRunning = false;
  statusDiv.innerText = `Game Over! Final Score: ${score}`;

  // Send session details to Supabase table
  await saveSessionData(score);
}

async function saveSessionData(finalScore) {
  try {
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const { data, error } = await supabase
      .from('game_sessions')
      .insert([
        {
          session_id: sessionId,
          score: finalScore,
          distance_traveled: finalScore * 1.5,
          preferred_theme: preferredTheme
        }
      ]);

    if (error) {
      console.error('Supabase Error:', error.message);
    } else {
      console.log('Session saved successfully to Supabase!');
    }
  } catch (err) {
    console.error('Error logging session:', err);
  }
}
