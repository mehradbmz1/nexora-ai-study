import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CLOUDFLARED = 'C:\\Users\\EXO\\.gemini\\antigravity\\scratch\\cloudflare-vpn\\cloudflared.exe';
const LOG_FILE = path.resolve('nexora-tunnel-24-7.log');
const URL_FILE = path.resolve('public-url.txt');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf-8');
  console.log(msg);
}

log('Nexora 24/7 Service Supervisor Started');

let viteProcess = null;
let tunnelProcess = null;

function startVite() {
  log('Starting Vite server on port 5173...');
  viteProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'dev', '--', '--host', '--port', '5173'], {
    stdio: 'ignore',
  });

  viteProcess.on('exit', (code) => {
    log(`Vite exited with code ${code}. Restarting in 2s...`);
    setTimeout(startVite, 2000);
  });
}

function startTunnel() {
  log('Starting Cloudflare Tunnel to http://localhost:5173...');
  tunnelProcess = spawn(CLOUDFLARED, ['tunnel', '--url', 'http://localhost:5173'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  function onData(chunk) {
    const text = chunk.toString();
    fs.appendFileSync(LOG_FILE, text);

    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const url = match[0];
      fs.writeFileSync(URL_FILE, url, 'utf-8');
      log(`>>> PUBLIC CLOUDFLARE URL: ${url}`);
    }
  }

  tunnelProcess.stdout.on('data', onData);
  tunnelProcess.stderr.on('data', onData);

  tunnelProcess.on('exit', (code) => {
    log(`Tunnel process exited with code ${code}. Reconnecting in 3s...`);
    setTimeout(startTunnel, 3000);
  });
}

// Check if Vite is already running on 5173
fetch('http://localhost:5173')
  .then(() => {
    log('Vite server is already running.');
  })
  .catch(() => {
    startVite();
  });

// Keep process running 24/7
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
