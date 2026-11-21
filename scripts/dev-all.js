// scripts/dev-all.js
// Inicia el backend (Netlify Functions / Redis) y el frontend (Vue.js) simultáneamente en una sola terminal
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('\n======================================================');
console.log('🏎️  INICIANDO AUTOELITE FULLSTACK (BACKEND + FRONTEND)');
console.log('======================================================\n');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(rootDir, 'frontend', 'catalogo-autos-frontend');

// 1. Iniciar Backend (dev-server.js en puerto 8787)
const backend = spawn('node', ['dev-server.js'], {
  stdio: 'inherit',
  cwd: rootDir,
  shell: true,
});

let frontendStarted = false;

function startFrontend() {
  if (frontendStarted) return;
  frontendStarted = true;
  console.log('🚀 Backend listo. Iniciando Frontend en Vue.js...\n');

  const frontend = spawn('npm', ['run', 'serve'], {
    stdio: 'inherit',
    cwd: frontendDir,
    shell: true,
  });

  frontend.on('close', code => {
    backend.kill();
    process.exit(code || 0);
  });
}

// Sondeo rápido para verificar que el backend ya esté escuchando antes de arrancar el frontend
function pollBackend(retries = 15) {
  const req = http.get('http://127.0.0.1:8787/api/autos', res => {
    startFrontend();
  });

  req.on('error', () => {
    if (retries > 0) {
      setTimeout(() => pollBackend(retries - 1), 400);
    } else {
      startFrontend();
    }
  });
}

// Iniciar sondeo
setTimeout(() => pollBackend(), 600);

// Manejo de salida y cierre de procesos
function cleanup() {
  console.log('\n🛑 Deteniendo servidores...');
  backend.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
