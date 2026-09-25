// Import Supabase correctly as an ES Module in the browser
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@+esm';

const SUPABASE_URL = 'https://qifbjgbzgpgssnygidnp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__U3W_syaAWEnDZBi2hmKFw_k5iM1cxX';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const statusDiv = document.getElementById('status');
const policyToggle = document.getElementById('policyToggle');
const policyBox = document.getElementById('policyBox');

if (policyToggle) {
  policyToggle.addEventListener('click', (e) => {
    e.preventDefault();
    policyBox.style.display = policyBox.style.display === 'none' ? 'block' : 'none';
  });
}

let gameInterval;
let isRunning = false;
let score = 0;
let sessionId = 'session_' + Math.random().toString(36).substring(2, 9);

const player = { x: 180, y: 420, width: 40, height: 60, speed: 20 };
const enemy = { x: Math.random() * (canvas.width - 40), y: -60, width: 40, height: 60, speed: 4 };

document.addEventListener('keydown', (e) => {
  if (!isRunning) return;
  if (e.key === 'ArrowLeft' && player.x > 0) player.x -= player.speed;
  if (e.key === 'ArrowRight' && player.x < canvas.width - player.width) player.x += player.speed;
});

leftBtn.addEventListener('click', () => { if (isRunning && player.x > 0) player.x -= player.speed; });
rightBtn.addEventListener('click', () => { if (isRunning && player.x < canvas.width - player.width) player.x += player.speed; });
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
  enemy.y += enemy.speed;
  if (enemy.y > canvas.height) {
    enemy.y = -60;
    enemy.x = Math.random() * (canvas.width - 40);
    score += 10;
    statusDiv.innerText = `Game Running... Score: ${score}`;
  }

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
  ctx.fillStyle = '#007bff';
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.fillStyle = '#dc3545';
  ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
}

async function endGame() {
  clearInterval(gameInterval);
  isRunning = false;
  statusDiv.innerText = `Game Over! Final Score: ${score}`;
  await saveCompliantSessionData(score);
}

async function getAnonymizedIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    const ip = data.ip;
    if (ip.includes('.')) {
      return ip.split('.').slice(0, 3).join('.') + '.0';
    }
    return 'anonymized-ipv6';
  } catch (err) {
    return 'unavailable';
  }
}

async function getBatteryPercentage() {
  if ('getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      return `${Math.round(battery.level * 100)}%`;
    } catch (e) {
      return 'Unavailable';
    }
  }
  return 'Not Supported';
}

async function saveCompliantSessionData(finalScore) {
  try {
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
    const browserLanguage = navigator.language || 'Unknown';
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const anonymizedIp = await getAnonymizedIP();
    const batteryPercentage = await getBatteryPercentage();

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
          browser_language: browserLanguage,
          anonymized_ip: anonymizedIp,
          battery_percentage: batteryPercentage
        }
      ]);

    if (error) {
      console.error('Supabase Error:', error.message);
    } else {
      console.log('Compliant session data logged successfully!');
    }
  } catch (err) {
    console.error('Error logging session:', err);
  }
}
