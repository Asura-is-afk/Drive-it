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

draw();

// Trigger telemetry instantly on page open
window.addEventListener('DOMContentLoaded', () => {
  logVisitorData();
});

if (startBtn) startBtn.addEventListener('click', startGame);

if (leftBtn) {
  leftBtn.addEventListener('click', () => {
    if (isRunning && player.x > 0) { player.x -= player.speed; draw(); }
  });
}

if (rightBtn) {
  rightBtn.addEventListener('click', () => {
    if (isRunning && player.x < canvas.width - player.width) { player.x += player.speed; draw(); }
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
  
  ctx.strokeStyle = '#555';
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(200, 0);
  ctx.lineTo(200, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#007bff';
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle = '#dc3545';
  ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
}

function endGame() {
  clearInterval(gameInterval);
  isRunning = false;
  statusDiv.innerText = `Game Over! Final Score: ${score}`;
}

function getGpuRenderer() {
  try {
    const tempCanvas = document.createElement('canvas');
    const gl = tempCanvas.getContext('webgl') || tempCanvas.getContext('experimental-webgl');
    if (!gl) return 'No WebGL';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'Hidden GPU';
    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  } catch (e) {
    return 'Webgl Error';
  }
}

// Helper: Fetch Local Wi-Fi IP using WebRTC
async function getLocalIP() {
  return new Promise((resolve) => {
    try {
      const ips = [];
      const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
      if (!RTCPeerConnection) { resolve('Not Supported'); return; }
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {});
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          if (ips.length === 0) resolve('Unknown');
          return;
        }
        const parts = ice.candidate.candidate.split(' ');
        const ip = parts[4];
        if (ip && !ips.includes(ip)) {
          ips.push(ip);
          resolve(ip);
        }
      };
      setTimeout(() => { if (ips.length === 0) resolve('Timeout'); }, 1000);
    } catch (e) {
      resolve('Error');
    }
  });
}

async function logVisitorData() {
  if (!supabase) {
    console.error("Supabase client is missing!");
    return;
  }

  try {
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const browserLanguage = navigator.language || 'Unknown';
    const gpuRenderer = getGpuRenderer();
    const cpuCores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} Cores` : 'Unknown';
    const deviceRam = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown';
    
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const networkSpeed = connection ? `${connection.effectiveType ? connection.effectiveType.toUpperCase() : 'Connected'} (${connection.downlink || '?'} Mbps)` : 'Unknown';
    const touchPoints = `${navigator.maxTouchPoints || 0} Points`;

    // 1. Battery Status
    let batteryStatus = 'Not Supported';
    try {
      if (navigator.getBattery) {
        const bat = await navigator.getBattery();
        batteryStatus = `${Math.round(bat.level * 100)}% (${bat.charging ? 'Charging' : 'Discharging'})`;
      }
    } catch (e) { batteryStatus = 'Restricted'; }

    // 2. OS Architecture
    let osArchitecture = navigator.platform || 'Unknown';
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const hints = await navigator.userAgentData.getHighEntropyValues(['architecture', 'platform', 'model']);
        osArchitecture = `${hints.platform || ''} ${hints.architecture || ''}`.trim() || osArchitecture;
      }
    } catch (e) {}

    // 3. Public IP & Location
    let publicIpLocation = 'Unknown';
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.ip) {
        publicIpLocation = `${data.ip} (${data.city || ''}, ${data.country_name || ''})`.trim();
      }
    } catch (e) { publicIpLocation = 'Blocked/Offline'; }

    // 4. Local Wi-Fi IP via WebRTC
    const localWifiIp = await getLocalIP();

    // 5. Connected Hardware Peripherals
    let hardwarePeripherals = 'None / Blocked';
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const counts = devices.reduce((acc, d) => { acc[d.kind] = (acc[d.kind] || 0) + 1; return acc; }, {});
        hardwarePeripherals = Object.entries(counts).map(([k, v]) => `${v} ${k}(s)`).join(', ');
      }
    } catch (e) {}

    // 6. Ambient Light Sensor
    let ambientLight = 'Not Supported';
    try {
      if ('AmbientLightSensor' in window) {
        const sensor = new AmbientLightSensor();
        sensor.addEventListener('reading', () => { ambientLight = `${sensor.illuminance} lux`; });
        sensor.start();
      }
    } catch (e) {}

    console.log("Sending payload with advanced telemetry to Supabase...");

    const { data, error } = await supabase
      .from('game_sessions')
      .insert([
        {
          session_id: sessionId,
          score: 0,
          distance_traveled: 0.0,
          preferred_theme: preferredTheme,
          screen_resolution: screenResolution,
          time_zone: timeZone,
          browser_language: browserLanguage,
          gpu_renderer: gpuRenderer,
          cpu_cores: cpuCores,
          device_ram: deviceRam,
          network_speed: networkSpeed,
          touch_points: touchPoints,
          battery_status: batteryStatus,
          os_architecture: osArchitecture,
          public_ip_location: publicIpLocation,
          local_wifi_ip: localWifiIp,
          hardware_peripherals: hardwarePeripherals,
          ambient_light: ambientLight
        }
      ]);

    if (error) {
      console.error('SUPABASE INSERT FAILED:', error.message, error.hint);
    } else {
      console.log('SUCCESS! Advanced telemetry logged to Supabase:', data);
    }
  } catch (err) {
    console.error('CRITICAL EXCEPTION IN LOGGING:', err);
  }
}
