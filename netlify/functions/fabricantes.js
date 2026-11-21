// netlify/functions/fabricantes.js
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
    // GET /api/fabricantes - Listar todos los fabricantes
    if (method === 'GET' && !id) {
      const ids = await redis.smembers('fabricantes:ids');
      if (!ids || ids.length === 0) {
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify([]),
        };
      }

      const pipeline = redis.pipeline();
      ids.forEach((fId) => pipeline.get(`fabricante:${fId}`));
      const results = await pipeline.exec();

      const fabricantes = [];
      for (const [err, fabRaw] of results) {
        if (!err && fabRaw) {
          fabricantes.push(JSON.parse(fabRaw));
        }
      }

      fabricantes.sort((a, b) => a.nombre.localeCompare(b.nombre));

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(fabricantes),
      };
    }

    // GET /api/fabricantes/:id - Obtener un fabricante específico
    if (method === 'GET' && id) {
      const fabRaw = await redis.get(`fabricante:${id}`);
      if (!fabRaw) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Fabricante no encontrado' }),
        };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: fabRaw,
      };
    }

    // ============================================
    // OPERACIONES MUTADORAS (PROTEGIDAS CON JWT)
    // ============================================

    // POST /api/fabricantes - Crear fabricante
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
      const { nombre, pais, anio_fundacion, sitio_web, logo } = body;

      const newId = await redis.incr('fabricantes:next_id');
      const newFabricante = {
        id: newId,
        nombre: nombre || 'Sin nombre',
        pais: pais || 'Sin país',
        anio_fundacion: parseInt(anio_fundacion, 10) || 0,
        sitio_web: sitio_web || '',
        logo: logo || '',
      };

      await redis.set(`fabricante:${newId}`, JSON.stringify(newFabricante));
      await redis.sadd('fabricantes:ids', newId);

      return {
        statusCode: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Fabricante creado exitosamente',
          id: newId,
        }),
      };
    }

    // PUT /api/fabricantes/:id - Actualizar fabricante
    if (method === 'PUT' && id) {
      const auth = verifyAuth(event);
      if (!auth.authenticated) {
        return {
          statusCode: auth.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: auth.error }),
        };
      }

      const exists = await redis.sismember('fabricantes:ids', id);
      if (!exists) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Fabricante no encontrado' }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      const { nombre, pais, anio_fundacion, sitio_web, logo } = body;

      const updatedFabricante = {
        id: parseInt(id, 10),
        nombre: nombre || '',
        pais: pais || '',
        anio_fundacion: parseInt(anio_fundacion, 10) || 0,
        sitio_web: sitio_web || '',
        logo: logo || '',
      };

      await redis.set(`fabricante:${id}`, JSON.stringify(updatedFabricante));

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Fabricante actualizado exitosamente' }),
      };
    }

    // DELETE /api/fabricantes/:id - Eliminar fabricante
    if (method === 'DELETE' && id) {
      const auth = verifyAuth(event);
      if (!auth.authenticated) {
        return {
          statusCode: auth.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: auth.error }),
        };
      }

      await redis.del(`fabricante:${id}`);
      await redis.srem('fabricantes:ids', id);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Fabricante eliminado exitosamente' }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Método no permitido' }),
    };
  } catch (error) {
    console.error('Error en fabricantes function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};
