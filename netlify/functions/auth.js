// netlify/functions/auth.js
const bcrypt = require('bcryptjs');
const { getRedisClient } = require('./utils/db');
const { corsHeaders, generateToken, verifyAuth } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const redis = getRedisClient();
  const path = event.path || '';
  const action = (event.queryStringParameters && event.queryStringParameters.action) || '';

  // Determinar la acción solicitada
  const isRegister = path.endsWith('/register') || action === 'register';
  const isLogin = path.endsWith('/login') || action === 'login';
  const isMe = path.endsWith('/me') || action === 'me';

  try {
    // 1. REGISTRO DE USUARIO
    if (isRegister && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { nombre, email, password, rol } = body;

      if (!nombre || !email || !password) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Nombre, email y contraseña son obligatorios' }),
        };
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingUserId = await redis.get(`user:by_email:${normalizedEmail}`);

      if (existingUserId) {
        return {
          statusCode: 409,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'El correo electrónico ya se encuentra registrado' }),
        };
      }

      // Hash seguro de la contraseña
      const password_hash = await bcrypt.hash(password, 10);
      const newId = await redis.incr('users:next_id');

      const newUser = {
        id: newId,
        nombre: nombre.trim(),
        email: normalizedEmail,
        password_hash,
        rol: rol || 'user',
        created_at: new Date().toISOString(),
      };

      await redis.set(`user:${newId}`, JSON.stringify(newUser));
      await redis.set(`user:by_email:${normalizedEmail}`, newId);
      await redis.sadd('users:ids', newId);

      const token = generateToken(newUser);

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Usuario registrado exitosamente',
          token,
          user: {
            id: newUser.id,
            nombre: newUser.nombre,
            email: newUser.email,
            rol: newUser.rol,
          },
        }),
      };
    }

    // 2. INICIO DE SESIÓN (LOGIN)
    if (isLogin && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { email, password } = body;

      if (!email || !password) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Email y contraseña son requeridos' }),
        };
      }

      const normalizedEmail = email.trim().toLowerCase();
      const userId = await redis.get(`user:by_email:${normalizedEmail}`);

      if (!userId) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Credenciales inválidas' }),
        };
      }

      const userDataRaw = await redis.get(`user:${userId}`);
      if (!userDataRaw) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Credenciales inválidas' }),
        };
      }

      const user = JSON.parse(userDataRaw);
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Credenciales inválidas' }),
        };
      }

      const token = generateToken(user);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Inicio de sesión exitoso',
          token,
          user: {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
          },
        }),
      };
    }

    // 3. CONSULTAR USUARIO ACTUAL (/api/auth/me)
    if (isMe && event.httpMethod === 'GET') {
      const auth = verifyAuth(event);
      if (!auth.authenticated) {
        return {
          statusCode: auth.statusCode,
          headers: corsHeaders,
          body: JSON.stringify({ error: auth.error }),
        };
      }

      const userDataRaw = await redis.get(`user:${auth.user.id}`);
      if (!userDataRaw) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Usuario no encontrado' }),
        };
      }

      const user = JSON.parse(userDataRaw);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          user: {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
          },
        }),
      };
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Ruta de autenticación no encontrada' }),
    };
  } catch (error) {
    console.error('Error en auth function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Error interno en el servicio de autenticación' }),
    };
  }
};
