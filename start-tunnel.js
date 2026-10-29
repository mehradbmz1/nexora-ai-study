import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CLOUDFLARED_PATH = 'C:\\Users\\EXO\\.gemini\\antigravity\\scratch\\cloudflare-vpn\\cloudflared.exe';
const LOG_FILE = path.resolve('tunnel.log');
const URL_FILE = path.resolve('tunnel-url.txt');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf-8');
  console.log(msg);
}

log('Starting Robust Cloudflare Tunnel Supervisor for Nexora...');

let currentProcess = null;
let currentPublicUrl = null;
let healthCheckTimer = null;
let isRestarting = false;

function startCloudflared() {
  if (isRestarting) return;
  isRestarting = true;

  if (currentProcess) {
    try {
      currentProcess.kill('SIGKILL');
    } catch {}
    currentProcess = null;
  }

  log('Spawning cloudflared process with protocol=http2, edge-ip-version=4...');

  currentProcess = spawn(
    CLOUDFLARED_PATH,
    ['tunnel', '--protocol', 'http2', '--edge-ip-version', '4', '--url', 'http://localhost:5173'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  isRestarting = false;

  function handleData(chunk) {
    const text = chunk.toString();
    fs.appendFileSync(LOG_FILE, text);

    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const publicUrl = match[0];
      if (publicUrl !== currentPublicUrl) {
        currentPublicUrl = publicUrl;
        fs.writeFileSync(URL_FILE, publicUrl, 'utf-8');
        log(`\n==================================================`);
        log(`🚀 NEXORA LIVE URL: ${publicUrl}`);
        log(`==================================================\n`);
      }
    }
  }

  currentProcess.stdout.on('data', handleData);
  currentProcess.stderr.on('data', handleData);

  currentProcess.on('exit', (code, signal) => {
    log(`Cloudflare process exited (code=${code}, signal=${signal}). Restarting in 2s...`);
    currentPublicUrl = null;
    setTimeout(startCloudflared, 2000);
  });
}

// Active Health Watchdog: Detects Error 1033 / 530 and self-heals
async function checkTunnelHealth() {
  if (!currentPublicUrl || isRestarting) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(currentPublicUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'NexoraHealthMonitor/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 530 || res.status === 502 || res.status === 504) {
      log(`⚠️ Detected Cloudflare Tunnel Error ${res.status} (Argo 1033). Auto-recovering tunnel immediately...`);
      startCloudflared();
    }
  } catch (err) {
    // If connection dropped completely
    log(`⚠️ Health check request failed: ${err.message}. Verifying tunnel status...`);
  }
}

// Start tunnel initially
startCloudflared();

// Run health watchdog every 20 seconds
healthCheckTimer = setInterval(checkTunnelHealth, 20000);

process.on('SIGINT', () => {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  if (currentProcess) currentProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  if (currentProcess) currentProcess.kill();
  process.exit(0);
});
