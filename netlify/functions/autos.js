// netlify/functions/autos.js
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
    // GET /api/autos - Listar todos los autos
    if (method === 'GET' && !id) {
      const ids = await redis.smembers('autos:ids');
      if (!ids || ids.length === 0) {
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify([]),
        };
      }

      // Obtener todos los autos
      const pipeline = redis.pipeline();
      ids.forEach((autoId) => pipeline.get(`auto:${autoId}`));
      const results = await pipeline.exec();

      const autos = [];
      const fabIdsToFetch = new Set();
      const catIdsToFetch = new Set();

      for (const [err, autoRaw] of results) {
        if (!err && autoRaw) {
          const auto = JSON.parse(autoRaw);
          autos.push(auto);
          if (auto.fabricante_id) fabIdsToFetch.add(auto.fabricante_id);
          if (auto.categoria_id) catIdsToFetch.add(auto.categoria_id);
        }
      }

      // Obtener fabricantes y categorías relacionados
      const relPipeline = redis.pipeline();
      fabIdsToFetch.forEach((fId) => relPipeline.get(`fabricante:${fId}`));
      catIdsToFetch.forEach((cId) => relPipeline.get(`categoria:${cId}`));
      const relResults = await relPipeline.exec();

      const fabricantesMap = {};
      const categoriasMap = {};

      let index = 0;
      fabIdsToFetch.forEach((fId) => {
        const [err, fabRaw] = relResults[index++];
        if (!err && fabRaw) fabricantesMap[fId] = JSON.parse(fabRaw);
      });
      catIdsToFetch.forEach((cId) => {
        const [err, catRaw] = relResults[index++];
        if (!err && catRaw) categoriasMap[cId] = JSON.parse(catRaw);
      });

      // Enriquecer cada auto con datos relacionales (igual al SQL join original)
      const enrichedAutos = autos.map((auto) => {
        const fab = fabricantesMap[auto.fabricante_id] || {};
        const cat = categoriasMap[auto.categoria_id] || {};
        let imagenUrl = auto.imagen || '';
        if (imagenUrl && !imagenUrl.startsWith('http://') && !imagenUrl.startsWith('https://') && !imagenUrl.startsWith('/')) {
          imagenUrl = `/images/autos/${imagenUrl}`;
        }
        return {
          ...auto,
          imagen: imagenUrl,
          fabricante_nombre: fab.nombre || auto.marca || 'Desconocido',
          pais: fab.pais || '',
          sitio_web: fab.sitio_web || '',
          tipo_motor: cat.tipo_motor || '',
          traccion: cat.traccion || '',
          aceleracion_0_100: cat.aceleracion_0_100 !== undefined ? cat.aceleracion_0_100 : 0,
          velocidad_maxima: cat.velocidad_maxima !== undefined ? cat.velocidad_maxima : 0,
        };
      });

      enrichedAutos.sort((a, b) => a.id - b.id);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedAutos),
      };
    }

    // GET /api/autos/:id - Obtener un auto específico
    if (method === 'GET' && id) {
      const autoRaw = await redis.get(`auto:${id}`);
      if (!autoRaw) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Auto no encontrado' }),
        };
      }

      const auto = JSON.parse(autoRaw);
      const [fabRaw, catRaw] = await Promise.all([
        auto.fabricante_id ? redis.get(`fabricante:${auto.fabricante_id}`) : null,
        auto.categoria_id ? redis.get(`categoria:${auto.categoria_id}`) : null,
      ]);

      const fab = fabRaw ? JSON.parse(fabRaw) : {};
      const cat = catRaw ? JSON.parse(catRaw) : {};

      const enrichedAuto = {
        ...auto,
        fabricante_nombre: fab.nombre || auto.marca || 'Desconocido',
        pais: fab.pais || '',
        sitio_web: fab.sitio_web || '',
        tipo_motor: cat.tipo_motor || '',
        traccion: cat.traccion || '',
        aceleracion_0_100: cat.aceleracion_0_100 !== undefined ? cat.aceleracion_0_100 : 0,
        velocidad_maxima: cat.velocidad_maxima !== undefined ? cat.velocidad_maxima : 0,
      };

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedAuto),
      };
    }

    // ============================================
    // OPERACIONES MUTADORAS (PROTEGIDAS CON JWT)
    // ============================================

    // POST /api/autos - Crear auto
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
      const { modelo, marca, anio, potencia, imagen, fabricante_id, categoria_id } = body;

      const newId = await redis.incr('autos:next_id');
      const newAuto = {
        id: newId,
        modelo: modelo || 'Sin modelo',
        marca: marca || 'Sin marca',
        anio: parseInt(anio, 10) || 0,
        potencia: parseInt(potencia, 10) || 0,
        imagen: imagen || '',
        fabricante_id: parseInt(fabricante_id, 10) || 1,
        categoria_id: parseInt(categoria_id, 10) || 1,
      };

      await redis.set(`auto:${newId}`, JSON.stringify(newAuto));
      await redis.sadd('autos:ids', newId);

      return {
        statusCode: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Auto creado exitosamente',
          id: newId,
        }),
      };
    }

    // PUT /api/autos/:id - Actualizar auto
    if (method === 'PUT' && id) {
      const auth = verifyAuth(event);
      if (!auth.authenticated) {
        return {
          statusCode: auth.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: auth.error }),
        };
      }

      const exists = await redis.sismember('autos:ids', id);
      if (!exists) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Auto no encontrado' }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      const { modelo, marca, anio, potencia, imagen, fabricante_id, categoria_id } = body;

      const updatedAuto = {
        id: parseInt(id, 10),
        modelo: modelo || '',
        marca: marca || '',
        anio: parseInt(anio, 10) || 0,
        potencia: parseInt(potencia, 10) || 0,
        imagen: imagen || '',
        fabricante_id: parseInt(fabricante_id, 10) || 1,
        categoria_id: parseInt(categoria_id, 10) || 1,
      };

      await redis.set(`auto:${id}`, JSON.stringify(updatedAuto));

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Auto actualizado exitosamente' }),
      };
    }

    // DELETE /api/autos/:id - Eliminar auto
    if (method === 'DELETE' && id) {
      const auth = verifyAuth(event);
      if (!auth.authenticated) {
        return {
          statusCode: auth.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: auth.error }),
        };
      }

      await redis.del(`auto:${id}`);
      await redis.srem('autos:ids', id);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Auto eliminado exitosamente' }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Método no permitido' }),
    };
  } catch (error) {
    console.error('Error en autos function:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};
