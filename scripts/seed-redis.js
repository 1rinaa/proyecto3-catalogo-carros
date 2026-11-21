// scripts/seed-redis.js
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const redisHost = process.env.REDIS_HOST || 'board-hypersoft-cherished-99660.db.redis.io';
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 19019;
const redisUsername = process.env.REDIS_USERNAME || 'default';
const redisPassword = process.env.REDIS_PASSWORD || 'aej1evkVdeAM2kbnRQvLAICRyqwuyfvy';

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  username: redisUsername,
  password: redisPassword,
  connectTimeout: 15000,
  maxRetriesPerRequest: 3,
});

function parseCSV(filePath, delimiter = ';') {
  const content = fs.readFileSync(filePath, 'latin1'); // Soporta tildes
  const lines = content.replace(/\r/g, '').trim().split('\n');
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(delimiter);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    results.push(obj);
  }
  return results;
}

async function seed() {
  try {
    console.log('🔄 Conectando a Redis Cloud...');
    await redis.ping();
    console.log('✅ Conexión establecida con Redis Cloud.');

    // 1. Limpiar datos previos si existen
    console.log('🧹 Limpiando colecciones anteriores...');
    const keysToDelete = await redis.keys('auto:*');
    const fabKeys = await redis.keys('fabricante:*');
    const catKeys = await redis.keys('categoria:*');
    const userKeys = await redis.keys('user:*');
    const allKeys = [...keysToDelete, ...fabKeys, ...catKeys, ...userKeys, 'autos:ids', 'fabricantes:ids', 'categorias:ids', 'users:ids', 'autos:next_id', 'fabricantes:next_id', 'categorias:next_id', 'users:next_id'];
    
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
      console.log(`🗑️ Eliminadas ${allKeys.length} llaves previas.`);
    }

    // 2. Insertar Fabricantes
    const fabricantesPath = path.join(__dirname, '..', 'data', 'fabricantes.csv');
    const fabricantes = parseCSV(fabricantesPath);
    console.log(`📥 Insertando ${fabricantes.length} fabricantes...`);
    let maxFabId = 0;
    for (const f of fabricantes) {
      const id = parseInt(f.id, 10);
      if (id > maxFabId) maxFabId = id;
      const fabData = {
        id,
        nombre: f.nombre || 'Sin nombre',
        pais: f.pais || 'Sin país',
        anio_fundacion: parseInt(f.anio_fundacion, 10) || 0,
        sitio_web: f.sitio_web || '',
        logo: f.logo || ''
      };
      await redis.set(`fabricante:${id}`, JSON.stringify(fabData));
      await redis.sadd('fabricantes:ids', id);
    }
    await redis.set('fabricantes:next_id', maxFabId);
    console.log(`✅ ${fabricantes.length} fabricantes insertados.`);

    // 3. Insertar Categorías
    const categoriasPath = path.join(__dirname, '..', 'data', 'categorias.csv');
    const categorias = parseCSV(categoriasPath);
    console.log(`📥 Insertando ${categorias.length} categorías...`);
    let maxCatId = 0;
    for (const c of categorias) {
      const id = parseInt(c.id, 10);
      if (id > maxCatId) maxCatId = id;
      const catData = {
        id,
        tipo_motor: c.tipo_motor || 'Sin especificar',
        traccion: c.traccion || 'Sin especificar',
        aceleracion_0_100: parseFloat(c.aceleracion_0_100) || 0,
        velocidad_maxima: parseInt(c.velocidad_maxima, 10) || 0
      };
      await redis.set(`categoria:${id}`, JSON.stringify(catData));
      await redis.sadd('categorias:ids', id);
    }
    await redis.set('categorias:next_id', maxCatId);
    console.log(`✅ ${categorias.length} categorías insertadas.`);

    // 4. Insertar Autos asociando la ruta exacta de la imagen (/images/autos/...)
    const autosPath = path.join(__dirname, '..', 'data', 'autos.csv');
    const autos = parseCSV(autosPath);
    console.log(`📥 Insertando ${autos.length} autos con sus imágenes asociadas...`);
    let maxAutoId = 0;
    for (const a of autos) {
      const id = parseInt(a.id, 10);
      if (id > maxAutoId) maxAutoId = id;

      let imagenRuta = a.imagen || '';
      if (imagenRuta && !imagenRuta.startsWith('http://') && !imagenRuta.startsWith('https://') && !imagenRuta.startsWith('/')) {
        imagenRuta = `/images/autos/${imagenRuta}`;
      }

      const autoData = {
        id,
        modelo: a.modelo || 'Sin modelo',
        marca: a.marca || 'Sin marca',
        anio: parseInt(a.anio, 10) || 0,
        potencia: parseInt(a.potencia, 10) || 0,
        imagen: imagenRuta,
        fabricante_id: parseInt(a.fabricante_id, 10) || 1,
        categoria_id: parseInt(a.categoria_id, 10) || 1
      };
      await redis.set(`auto:${id}`, JSON.stringify(autoData));
      await redis.sadd('autos:ids', id);
    }
    await redis.set('autos:next_id', maxAutoId);
    console.log(`✅ ${autos.length} autos insertados con imágenes asociadas.`);

    // 5. Insertar Usuarios Iniciales para JWT
    console.log('👤 Creando usuarios iniciales con contraseña hasheada...');
    const hashedAdminPass = await bcrypt.hash('admin123456', 10);
    const adminUser = {
      id: 1,
      nombre: 'Administrador AutoElite',
      email: 'admin@autoelite.com',
      password_hash: hashedAdminPass,
      rol: 'admin',
      created_at: new Date().toISOString()
    };
    await redis.set('user:1', JSON.stringify(adminUser));
    await redis.set('user:by_email:admin@autoelite.com', 1);
    await redis.sadd('users:ids', 1);

    const hashedIrinaPass = await bcrypt.hash('autoelite2026', 10);
    const irinaUser = {
      id: 2,
      nombre: 'Irina Rivera Chavarría',
      email: 'irina.rivera.chavarria@est.una.ac.cr',
      password_hash: hashedIrinaPass,
      rol: 'admin',
      created_at: new Date().toISOString()
    };
    await redis.set('user:2', JSON.stringify(irinaUser));
    await redis.set('user:by_email:irina.rivera.chavarria@est.una.ac.cr', 2);
    await redis.sadd('users:ids', 2);
    await redis.set('users:next_id', 2);

    console.log('✅ Usuarios iniciales creados:');
    console.log('   - admin@autoelite.com / admin123456 (rol: admin)');
    console.log('   - irina.rivera.chavarria@est.una.ac.cr / autoelite2026 (rol: admin)');

    // 6. Resumen final de verificación
    const totalAutos = await redis.scard('autos:ids');
    const totalFab = await redis.scard('fabricantes:ids');
    const totalCat = await redis.scard('categorias:ids');
    const totalUsers = await redis.scard('users:ids');

    console.log('\n=========================================');
    console.log('📊 RESUMEN DE MIGRACIÓN A REDIS CLOUD:');
    console.log(`🏎️ Autos:        ${totalAutos} registros`);
    console.log(`🏢 Fabricantes:  ${totalFab} registros`);
    console.log(`⚙️ Categorías:   ${totalCat} registros`);
    console.log(`👥 Usuarios:     ${totalUsers} registros`);
    console.log('=========================================\n');

  } catch (err) {
    console.error('❌ Error durante la migración:', err);
  } finally {
    await redis.quit();
  }
}

seed();
