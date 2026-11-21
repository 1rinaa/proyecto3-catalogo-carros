// netlify/functions/categorias.js
const { getRedisClient } = require('./utils/db');
const { corsHeaders, verifyAuth, extractIdFromEvent } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const redis = getRedisClient();
  const id = extractIdFromEvent(event);
  const method = event.httpMethod;

  try {
    // GET /api/categorias - Listar todas las categorías
    if (method === 'GET' && !id) {
      const ids = await redis.smembers('categorias:ids');
      if (!ids || ids.length === 0) {
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify([]),
        };
      }

      const pipeline = redis.pipeline();
      ids.forEach((cId) => pipeline.get(`categoria:${cId}`));
      const results = await pipeline.exec();

      const categorias = [];
      for (const [err, catRaw] of results) {
        if (!err && catRaw) {
          categorias.push(JSON.parse(catRaw));
        }
      }

      categorias.sort((a, b) => a.id - b.id);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(categorias),
      };
    }

    // GET /api/categorias/:id - Obtener una categoría específica
    if (method === 'GET' && id) {
      const catRaw = await redis.get(`categoria:${id}`);
      if (!catRaw) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Categoría no encontrada' }),
        };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: catRaw,
      };
    }

    // ============================================
    // OPERACIONES MUTADORAS (PROTEGIDAS CON JWT)
    // ============================================

    // POST /api/categorias - Crear categoría
    if (method === 'POST') {
      const auth = verifyAuth(event);
      if (!auth.authenticated) {
        return {
          statusCode: auth.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: auth.error }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      const { tipo_motor, traccion, aceleracion_0_100, velocidad_maxima } = body;

      const newId = await redis.incr('categorias:next_id');
      const newCategoria = {
        id: newId,
        tipo_motor: tipo_motor || 'Sin especificar',
        traccion: traccion || 'Sin especificar',
        aceleracion_0_100: parseFloat(aceleracion_0_100) || 0,
        velocidad_maxima: parseInt(velocidad_maxima, 10) || 0,
      };

      await redis.set(`categoria:${newId}`, JSON.stringify(newCategoria));
      await redis.sadd('categorias:ids', newId);

      return {
        statusCode: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Categoría creada exitosamente',
          id: newId,
        }),
      };
    }

    // PUT /api/categorias/:id - Actualizar categoría
    if (method === 'PUT' && id) {
      const auth = verifyAuth(event);
      if (!auth.authenticated) {
        return {
          statusCode: auth.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: auth.error }),
        };
      }

      const exists = await redis.sismember('categorias:ids', id);
      if (!exists) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Categoría no encontrada' }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      const { tipo_motor, traccion, aceleracion_0_100, velocidad_maxima } = body;

      const updatedCategoria = {
        id: parseInt(id, 10),
        tipo_motor: tipo_motor || '',
        traccion: traccion || '',
        aceleracion_0_100: parseFloat(aceleracion_0_100) || 0,
        velocidad_maxima: parseInt(velocidad_maxima, 10) || 0,
      };

      await redis.set(`categoria:${id}`, JSON.stringify(updatedCategoria));

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Categoría actualizada exitosamente' }),
      };
    }

    // DELETE /api/categorias/:id - Eliminar categoría
    if (method === 'DELETE' && id) {
      const auth = verifyAuth(event);
      if (!auth.authenticated) {
        return {
          statusCode: auth.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: auth.error }),
        };
      }

      await redis.del(`categoria:${id}`);
      await redis.srem('categorias:ids', id);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Categoría eliminada exitosamente' }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Método no permitido' }),
    };
  } catch (error) {
    console.error('Error en categorias function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};
