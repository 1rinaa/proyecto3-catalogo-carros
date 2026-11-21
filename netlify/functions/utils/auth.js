// netlify/functions/utils/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_autoelite_distribuidos_2026_key_secure';
const TOKEN_EXPIRATION = '24h';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol || 'user',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
}

function verifyAuth(event) {
  // Manejar headers sin importar mayúsculas/minúsculas
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Acceso no autorizado: Token no proporcionado',
    };
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      authenticated: true,
      user: decoded,
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return {
        authenticated: false,
        statusCode: 401,
        error: 'El token ha expirado. Por favor inicia sesión nuevamente.',
      };
    }
    return {
      authenticated: false,
      statusCode: 401,
      error: 'Token inválido o mal formado.',
    };
  }
}

function extractIdFromEvent(event) {
  // Intentar obtener ID desde queryString o desde el path
  if (event.queryStringParameters && event.queryStringParameters.id) {
    return event.queryStringParameters.id.replace(/^\//, '').split('/')[0];
  }
  const segments = event.path.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  // Si el último segmento es numérico, es el ID
  if (/^\d+$/.test(lastSegment)) {
    return lastSegment;
  }
  return null;
}

module.exports = {
  corsHeaders,
  generateToken,
  verifyAuth,
  extractIdFromEvent,
};
