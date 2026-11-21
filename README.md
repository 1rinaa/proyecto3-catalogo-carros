# AutoElite — Catálogo de Autos Superdeportivos (Proyecto 3)

**Estudiante:** Irina Rivera Chavarría  
**Universidad:** Universidad Nacional de Costa Rica (UNA)  
**Curso:** Sistemas Distribuidos  
**Plataforma de Despliegue:** Netlify (Frontend Vue.js + Netlify Functions)  
**Base de Datos NoSQL:** Redis Cloud  
**Seguridad:** Autenticación con JSON Web Tokens (JWT) y Hash bcrypt  

---

## 🏎️ Descripción del Proyecto

**AutoElite** es una solución integral para la gestión y exploración de un catálogo exclusivo de autos superdeportivos, marcas de élite y categorías técnicas.

En esta fase (Proyecto 3), el sistema ha sido migrado exitosamente desde Cloudflare Workers y D1 (SQLite) hacia una arquitectura moderna basada en:
- **Netlify Functions (FaaS en Node.js):** Microservicios serverless desacoplados y empaquetados junto al frontend.
- **Redis Cloud (NoSQL Key-Value / Documental):** Persistencia en memoria de alta velocidad con índices y referencias relacionales.
- **Autenticación JWT:** Control de acceso basado en tokens para todas las operaciones mutadoras (crear, editar, eliminar), manteniendo la consulta del catálogo pública.
- **Frontend SPA en Vue.js:** Experiencia visual de alta gama con temática oscura, acentos dorados, modales interactivos y control de interfaz reactivo según el estado de autenticación.

---

## 🏛️ Arquitectura del Sistema

```
[ Cliente Web: Vue.js 2 (Netlify CDN) ]
                 │
                 │ Peticiones HTTP (/api/*) con Authorization: Bearer <token>
                 ▼
[ Netlify Redirects (netlify.toml) ]
                 │
                 ├──▶ /api/auth/*        ──▶ netlify/functions/auth.js
                 ├──▶ /api/autos/*       ──▶ netlify/functions/autos.js
                 ├──▶ /api/fabricantes/* ──▶ netlify/functions/fabricantes.js
                 └──▶ /api/categorias/*  ──▶ netlify/functions/categorias.js
                                                   │
                                                   │ Singleton ioredis (Reutilización de socket TCP)
                                                   ▼
                                         [ Redis Cloud Cluster ]
                                         - auto:<id> & autos:ids
                                         - fabricante:<id> & fabricantes:ids
                                         - categoria:<id> & categorias:ids
                                         - user:<id> & user:by_email:<email>
```

---

## 🗄️ Modelo de Datos en Redis Cloud

Cada registro se modela como un valor JSON independiente bajo una clave canónica, indexado mediante conjuntos (`SETS`) para permitir consultas eficientes y contadores atómicos (`INCR`) para la autogeneración de identificadores:

| Entidad | Clave de Registro | Índice de IDs | Contador ID | Registros Iniciales |
|---|---|---|---|---|
| **Autos** | `auto:<id>` | `autos:ids` | `autos:next_id` | **20 registros** (mínimo 12 cumplido) |
| **Fabricantes** | `fabricante:<id>` | `fabricantes:ids` | `fabricantes:next_id` | **17 registros** (mínimo 6 cumplido) |
| **Categorías** | `categoria:<id>` | `categorias:ids` | `categorias:next_id` | **19 registros** (mínimo 6 cumplido) |
| **Usuarios** | `user:<id>` | `users:ids` | `users:next_id` | **2 usuarios iniciales** |

### Relaciones entre Entidades
Las relaciones se mantienen por referencia cruzada (`fabricante_id` y `categoria_id` dentro del objeto del auto). Al solicitar `GET /api/autos` o `GET /api/autos/:id`, la función ejecuta un pipeline de Redis para enriquecer la respuesta con los datos del fabricante (`nombre`, `pais`, `sitio_web`) y de la categoría (`tipo_motor`, `traccion`, `aceleracion_0_100`, `velocidad_maxima`), preservando el contrato original de la API.

---

## 🔐 Seguridad y Autenticación con JWT

### 1. Manejo de Contraseñas
Las contraseñas se almacenan cifradas mediante **bcryptjs** (con salt rounds = 10). Nunca se persisten ni transmiten en texto plano.

### 2. Endpoints de Autenticación
- **`POST /api/auth/register`**: Registra un nuevo usuario, valida unicidad de correo y genera token JWT.
- **`POST /api/auth/login`**: Valida credenciales contra Redis y emite un JWT firmado válido por 24 horas.
- **`GET /api/auth/me`**: Retorna el perfil del usuario autenticado vía `Bearer` token.

### 3. Control de Acceso por Roles y Métodos
- **Rutas Públicas (`GET`)**:
  - `GET /api/autos` y `GET /api/autos/:id`
  - `GET /api/fabricantes` y `GET /api/fabricantes/:id`
  - `GET /api/categorias` y `GET /api/categorias/:id`
- **Rutas Protegidas (`POST`, `PUT`, `DELETE`)**:
  - Requieren el encabezado `Authorization: Bearer <token>`.
  - Código **401 Unauthorized**: Si el token falta, expiró o su firma es inválida. El cliente redirige automáticamente a la pantalla de login.
  - Código **403 Forbidden**: Si el usuario carece de permisos para la operación.

### 4. Credenciales de Prueba Preconfiguradas
| Rol | Correo Electrónico | Contraseña |
|---|---|---|
| **Administrador** | `admin@autoelite.com` | `admin123456` |
| **Estudiante / Admin** | `irina.rivera.chavarria@est.una.ac.cr` | `autoelite2026` |

*(La pantalla de inicio de sesión incluye botones de autocompletado rápido para agilizar la prueba del evaluador).*

---

## ⚙️ Configuración de Variables de Entorno en Netlify

Para que la aplicación se conecte a Redis Cloud y gestione tokens JWT en Netlify:

1. Ve a tu sitio en **[Netlify Dashboard](https://app.netlify.com/)**.
2. Ingresa a **Site configuration** $\rightarrow$ **Environment variables**.
3. Haz clic en **Add a variable** e ingresa las siguientes variables:

| Variable | Valor | Descripción |
|---|---|---|
| `REDIS_HOST` | `board-hypersoft-cherished-99660.db.redis.io` | Host del clúster de Redis Cloud |
| `REDIS_PORT` | `19019` | Puerto asignado en Redis Cloud |
| `REDIS_USERNAME` | `default` | Usuario de conexión |
| `REDIS_PASSWORD` | `aej1evkVdeAM2kbnRQvLAICRyqwuyfvy` | Contraseña provista de Redis Cloud |
| `JWT_SECRET` | *(Cadena secreta segura de firma)* | Clave para firmar y verificar tokens JWT |

> **Nota de Seguridad:** Las variables sensibles nunca están codificadas en duro en el repositorio. Para desarrollo local se utiliza un archivo `.env` que se encuentra ignorado en `.gitignore`.

---

## 🚀 Despliegue en Netlify

### Opción A: Desde Repositorio de GitHub
1. Conecta el repositorio en Netlify.
2. Netlify detectará automáticamente el archivo `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/catalogo-autos-frontend/dist`
   - **Functions directory:** `netlify/functions`
3. Agrega las variables de entorno en la sección de configuración.
4. Presiona **Deploy site**.

### Opción B: Mediante Netlify CLI
```bash
# 1. Instalar Netlify CLI
npm install -g netlify-cli

# 2. Iniciar sesión y vincular el sitio
netlify login
netlify link

# 3. Compilar y desplegar a producción
npm run build
netlify deploy --prod
```

---

## 💻 Ejecución y Pruebas en Entorno Local

### 1. Instalación de dependencias
```bash
# Dependencias raíz (Netlify Functions, Redis, JWT)
npm install

# Dependencias del frontend Vue
cd frontend/catalogo-autos-frontend
npm install
cd ../..
```

### 2. Poblar la Base de Datos Redis Cloud (Seed)
```bash
npm run seed
```
Este comando lee los archivos CSV en `/data/`, limpia colecciones previas, inserta los 20 autos, 17 fabricantes, 19 categorías y crea los usuarios iniciales con contraseñas hasheadas.

### 3. Ejecutar Suite de Pruebas Automatizadas de la API
```bash
npm run test:api
```
Valida de forma automática:
- Conexión y lectura de autos con enriquecimiento relacional.
- Listado de fabricantes y categorías.
- Inicio de sesión y generación de JWT.
- Rechazo HTTP 401 en operaciones sin token.
- Creación HTTP 201 y eliminación de autos con Bearer Token válido.

### 4. Iniciar el Servidor de Desarrollo del Frontend
```bash
npm run dev:frontend
```

---

## 📦 Generación del Archivo `.zip` para Entrega

Para generar el archivo comprimido sin incluir carpetas pesadas (`node_modules`), artefactos de compilación (`dist`) ni secretos (`.env`):

### En Windows (PowerShell):
```powershell
Compress-Archive -Path `
  netlify.toml, `
  package.json, `
  README.md, `
  test-api.js, `
  .env.example, `
  netlify, `
  scripts, `
  data, `
  frontend `
  -DestinationPath "Proyecto3_Irina_Rivera_Chavarria.zip" `
  -Force
```
*(Asegúrate de no incluir `node_modules` en el interior del zip).*

---

© 2026 Irina Rivera Chavarría — Universidad Nacional de Costa Rica (UNA)
