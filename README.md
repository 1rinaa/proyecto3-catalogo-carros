# AutoElite — Catálogo de Autos Superdeportivos

**Estudiante:** Irina Rivera Chavarría
**Universidad:** Universidad Nacional de Costa Rica (UNA)
**Curso:** Sistemas Distribuidos

---

## Plataforma Publicada

Puedes probar la aplicación en vivo en el siguiente enlace:
https://catalogo-autoss.netlify.app/autos

---

## Tecnologías Utilizadas

Este proyecto fue desarrollado utilizando una arquitectura moderna y desacoplada (Serverless):

- **Vue.js (Frontend):** Interfaz de usuario dinámica y de una sola página (SPA), con un diseño premium enfocado en la experiencia del usuario.
- **Netlify Functions (Backend):** Servicios serverless (Node.js) que manejan la lógica de negocio y las operaciones CRUD, desplegados de forma automática junto al frontend.
- **Redis Cloud (Base de Datos):** Utilizado como base de datos NoSQL (Key-Value). Permite almacenar los autos, fabricantes, categorías y usuarios de forma rápida y escalable.
- **JWT (Autenticación):** Uso de JSON Web Tokens para proteger las rutas. Las operaciones de lectura (GET) son públicas, mientras que las de creación, edición y eliminación (POST, PUT, DELETE) requieren iniciar sesión. Las contraseñas están cifradas con _bcrypt_.

---

## ¿Cómo probarlo localmente?

Si deseas ejecutar el proyecto en tu computadora, sigue estos pasos:

1.  **Clonar el repositorio e instalar dependencias:**

    ```bash
    npm install

    ```

2.  **Iniciar el entorno de desarrollo:**
    ```bash
    npm run dev
    ```
