// Use explicit versioned ES module import for mobile compatibility
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://qifbjgbzgpgssnygidnp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__U3W_syaAWEnDZBi2hmKFw_k5iM1cxX';

let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error("Supabase init error:", e);
}

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

const player = { x: 180, y: 420, width: 40, height: 60, speed: 20 };
const enemy = { x: 180, y: 50, width: 40, height: 60, speed: 4 };

// Draw initial state immediately so the screen isn't just a blank box
draw();

// Button and Key Listeners
if (startBtn) {
  startBtn.addEventListener('click', startGame);
}

if (leftBtn) {
  leftBtn.addEventListener('click', () => {
    if (isRunning && player.x > 0) {
      player.x -= player.speed;
      draw();
    }
  });
}

if (rightBtn) {
  rightBtn.addEventListener('click', () => {
    if (isRunning && player.x < canvas.width - player.width) {
      player.x += player.speed;
      draw();
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (!isRunning) return;
  if (e.key === 'ArrowLeft' && player.x > 0) player.x -= player.speed;
  if (e.key === 'ArrowRight' && player.x < canvas.width - player.width) player.x += player.speed;
  draw();
});

function startGame() {
  if (isRunning) return;
  isRunning = true;
  score = 0;
  player.x = 180;
  enemy.y = -60;
  enemy.x = Math.random() * (canvas.width - 40);
  statusDiv.innerText = "Game Running... Score: 0";
  
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(updateGame, 1000 / 30);
}

function updateGame() {
  enemy.y += enemy.speed;
  if (enemy.y > canvas.height) {
    enemy.y = -60;
    enemy.x = Math.random() * (canvas.width - 40);
    score += 10;
    statusDiv.innerText = `Game Running... Score: ${score}`;
  }

  // Collision detection
  if (
    player.x < enemy.x + enemy.width &&
    player.x + player.width > enemy.x &&
    player.y < enemy.y + enemy.height &&
    player.y + player.height > enemy.y
  ) {
    endGame();
    return;
  }

  draw();
}

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw road lines or background element
  ctx.strokeStyle = '#555';
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(200, 0);
  ctx.lineTo(200, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw player car (blue)
  ctx.fillStyle = '#007bff';
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw enemy car (red)
  ctx.fillStyle = '#dc3545';
  ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
}

function endGame() {
  clearInterval(gameInterval);
  isRunning = false;
  statusDiv.innerText = `Game Over! Final Score: ${score}. Saving...`;
  saveSessionToSupabase(score);
}

async function saveSessionToSupabase(finalScore) {
  if (!supabase) {
    statusDiv.innerText = `Game Over! Score: ${finalScore} (Supabase not initialized)`;
    return;
  }

  try {
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
    const browserLanguage = navigator.language || 'Unknown';

    const { data, error } = await supabase
      .from('game_sessions')
      .insert([
        {
          session_id: sessionId,
          score: finalScore,
          distance_traveled: finalScore * 1.5,
          preferred_theme: preferredTheme,
          screen_resolution: screenResolution,
          time_zone: timeZone,
          browser_language: browserLanguage
        }
      ]);

    if (error) {
      console.error('Supabase Insert Error:', error.message);
      statusDiv.innerText = `Game Over! Score: ${finalScore} (Save failed)`;
    } else {
      statusDiv.innerText = `Game Over! Score: ${finalScore} (Saved to Supabase!)`;
    }
  } catch (err) {
    console.error('Network exception:', err);
    statusDiv.innerText = `Game Over! Score: ${finalScore} (Network error)`;
  }
}
