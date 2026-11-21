// dev-server.js
// Servidor de desarrollo local para simular Netlify Functions en http://127.0.0.1:8787
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const http = require('http');
const fs = require('fs');

const { handler: authHandler } = require('./netlify/functions/auth');
const { handler: autosHandler } = require('./netlify/functions/autos');
const { handler: fabHandler } = require('./netlify/functions/fabricantes');
const { handler: catHandler } = require('./netlify/functions/categorias');

const PORT = process.env.PORT || 8787;
const HOST = '0.0.0.0';

const server = http.createServer(async (req, res) => {
  const currentUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1:8787'}`);
  const pathname = currentUrl.pathname;
  const queryParams = Object.fromEntries(currentUrl.searchParams.entries());

  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Leer cuerpo de la petición si existe
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      // Construir evento similar al de Netlify / AWS Lambda
      const event = {
        httpMethod: req.method,
        path: pathname,
        headers: req.headers,
        queryStringParameters: queryParams,
        body: body || null,
      };

      // Si la ruta contiene un ID (/api/autos/5), inyectarlo en queryStringParameters
      const idMatch = pathname.match(/\/api\/(?:autos|fabricantes|categorias)\/(\d+)/);
      if (idMatch && !event.queryStringParameters.id) {
        event.queryStringParameters.id = idMatch[1];
      }

      // Si la ruta es /api/auth/login o /api/auth/register, inyectar action
      const authMatch = pathname.match(/\/api\/auth\/(login|register|me)/);
      if (authMatch && !event.queryStringParameters.action) {
        event.queryStringParameters.action = authMatch[1];
      }

      let result;

      if (pathname.startsWith('/api/auth')) {
        result = await authHandler(event);
      } else if (pathname.startsWith('/api/autos')) {
        result = await autosHandler(event);
      } else if (pathname.startsWith('/api/fabricantes')) {
        result = await fabHandler(event);
      } else if (pathname.startsWith('/api/categorias')) {
        result = await catHandler(event);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Ruta ${pathname} no encontrada en el backend local` }));
        return;
      }

      const statusCode = result.statusCode || 200;
      const headers = result.headers || { 'Content-Type': 'application/json' };

      res.writeHead(statusCode, headers);
      res.end(result.body || '');

      console.log(`[BACKEND] [${req.method}] ${pathname} -> ${statusCode}`);
    } catch (err) {
      console.error('Error procesando petición en dev-server:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error interno en dev-server local: ' + err.message }));
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log('\n======================================================');
  console.log(`🚀 BACKEND LOCAL INICIADO EXITOSAMENTE`);
  console.log(`📡 URL: http://127.0.0.1:${PORT}`);
  console.log(`🔗 Proxy de Vue (/api/*) conectado a http://127.0.0.1:${PORT}`);
  console.log('======================================================\n');
});

module.exports = { server };
