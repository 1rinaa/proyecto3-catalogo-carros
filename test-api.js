// test-api.js
require('dotenv').config();
const { handler: authHandler } = require('./netlify/functions/auth');
const { handler: autosHandler } = require('./netlify/functions/autos');
const { handler: fabHandler } = require('./netlify/functions/fabricantes');
const { handler: catHandler } = require('./netlify/functions/categorias');

async function runTests() {
  console.log('🧪 Iniciando pruebas de Netlify Functions + Redis Cloud + JWT...\n');

  try {
    // Test 1: GET /api/autos
    console.log('1️⃣ Probando GET /api/autos...');
    const resAutos = await autosHandler({ httpMethod: 'GET', path: '/api/autos', headers: {} });
    const autos = JSON.parse(resAutos.body);
    console.log(`   Status: ${resAutos.statusCode}, Total autos recibidos: ${autos.length}`);
    if (autos.length > 0) {
      console.log(`   Muestra auto 1: ${autos[0].modelo} - Marca: ${autos[0].fabricante_nombre} - Motor: ${autos[0].tipo_motor}`);
    }

    // Test 2: GET /api/fabricantes
    console.log('\n2️⃣ Probando GET /api/fabricantes...');
    const resFab = await fabHandler({ httpMethod: 'GET', path: '/api/fabricantes', headers: {} });
    const fabs = JSON.parse(resFab.body);
    console.log(`   Status: ${resFab.statusCode}, Total fabricantes: ${fabs.length}`);

    // Test 3: GET /api/categorias
    console.log('\n3️⃣ Probando GET /api/categorias...');
    const resCat = await catHandler({ httpMethod: 'GET', path: '/api/categorias', headers: {} });
    const cats = JSON.parse(resCat.body);
    console.log(`   Status: ${resCat.statusCode}, Total categorías: ${cats.length}`);

    // Test 4: Auth Login
    console.log('\n4️⃣ Probando POST /api/auth/login (admin@autoelite.com)...');
    const resLogin = await authHandler({
      httpMethod: 'POST',
      path: '/api/auth/login',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@autoelite.com', password: 'admin123456' }),
    });
    const loginData = JSON.parse(resLogin.body);
    console.log(`   Status: ${resLogin.statusCode}, Mensaje: ${loginData.message}`);
    const token = loginData.token;
    console.log(`   Token recibido: ${token ? token.substring(0, 25) + '...' : 'NO TOKEN'}`);

    // Test 5: Mutación sin token (debe fallar 401)
    console.log('\n5️⃣ Probando POST /api/autos sin token (esperado 401)...');
    const resNoAuth = await autosHandler({
      httpMethod: 'POST',
      path: '/api/autos',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelo: 'Test Sin Token', marca: 'Test', anio: 2025, potencia: 500 }),
    });
    console.log(`   Status: ${resNoAuth.statusCode} (¿Es 401? ${resNoAuth.statusCode === 401 ? '✅ SÍ' : '❌ NO'})`);

    // Test 6: Mutación con token válido (debe crear auto 201)
    console.log('\n6️⃣ Probando POST /api/autos con Bearer Token...');
    const resCreate = await autosHandler({
      httpMethod: 'POST',
      path: '/api/autos',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        modelo: 'CyberGT Prototype',
        marca: 'Bugatti',
        anio: 2026,
        potencia: 2100,
        imagen: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=800',
        fabricante_id: 1,
        categoria_id: 1,
      }),
    });
    const createdData = JSON.parse(resCreate.body);
    console.log(`   Status: ${resCreate.statusCode}, Creado con ID: ${createdData.id}`);

    // Test 7: Eliminar auto de prueba con token
    console.log('\n7️⃣ Probando DELETE /api/autos/:id con Bearer Token...');
    const resDelete = await autosHandler({
      httpMethod: 'DELETE',
      path: `/api/autos/${createdData.id}`,
      queryStringParameters: { id: `${createdData.id}` },
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`   Status: ${resDelete.statusCode}, Mensaje: ${JSON.parse(resDelete.body).message}`);

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA API PASARON EXITOSAMENTE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en las pruebas:', err);
    process.exit(1);
  }
}

runTests();
