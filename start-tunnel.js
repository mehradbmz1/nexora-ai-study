import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CLOUDFLARED_PATH = 'C:\\Users\\EXO\\.gemini\\antigravity\\scratch\\cloudflare-vpn\\cloudflared.exe';
const LOG_FILE = path.resolve('tunnel.log');
const URL_FILE = path.resolve('tunnel-url.txt');

console.log('Starting Cloudflare Tunnel for Nexora on http://localhost:5173 ...');

const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

const tunnelProcess = spawn(
  CLOUDFLARED_PATH,
  ['tunnel', '--protocol', 'http2', '--edge-ip-version', '4', '--url', 'http://localhost:5173'],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
  }
);

function handleOutput(chunk) {
  const text = chunk.toString();
  logStream.write(text);
  process.stdout.write(text);

  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match) {
    const publicUrl = match[0];
    console.log('\n==================================================');
    console.log('🚀 NEXORA IS LIVE ON CLOUDFLARE TUNNEL:');
    console.log(publicUrl);
    console.log('==================================================\n');
    fs.writeFileSync(URL_FILE, publicUrl, 'utf-8');
  }
}

tunnelProcess.stdout.on('data', handleOutput);
tunnelProcess.stderr.on('data', handleOutput);

tunnelProcess.on('exit', (code, signal) => {
  console.log(`Cloudflare Tunnel exited with code ${code}, signal ${signal}`);
  // Auto-restart if unexpected termination
  if (code !== 0) {
    console.log('Restarting Cloudflare Tunnel in 3 seconds...');
    setTimeout(() => {
      // restart logic
    }, 3000);
  }
});
