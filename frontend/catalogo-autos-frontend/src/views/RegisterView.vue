<template>
  <div class="auth-page fade-in">
    <div class="auth-container">
      <!-- Glow decorativo superior -->
      <div class="auth-glow"></div>

      <!-- Header del formulario -->
      <div class="auth-header">
        <div class="brand-badge">
          <i class="fas fa-user-plus text-gold"></i>
          <span>NUEVO USUARIO</span>
        </div>
        <h2 class="auth-title">
          Crear <span class="text-gold">Cuenta</span>
        </h2>
        <p class="auth-subtitle">
          Regístrate para gestionar el catálogo de superdeportivos
        </p>
      </div>

      <!-- Alerta de error -->
      <div v-if="error" class="alert-box alert-danger">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ error }}</span>
      </div>

      <!-- Alerta de éxito -->
      <div v-if="success" class="alert-box alert-success">
        <i class="fas fa-check-circle"></i>
        <span>¡Registro exitoso! Redirigiendo...</span>
      </div>

      <!-- Formulario -->
      <form @submit.prevent="handleRegister" class="auth-form">
        <!-- Campo Nombre -->
        <div class="input-group-custom">
          <label class="input-label">
            <i class="fas fa-user text-gold"></i> Nombre Completo
          </label>
          <div class="input-wrapper">
            <input
              v-model.trim="nombre"
              type="text"
              class="form-control-custom"
              placeholder="Ej. Carlos Mendoza"
              required
            />
          </div>
        </div>

        <!-- Campo Correo -->
        <div class="input-group-custom">
          <label class="input-label">
            <i class="fas fa-envelope text-gold"></i> Correo Electrónico
          </label>
          <div class="input-wrapper">
            <input
              v-model.trim="email"
              type="email"
              class="form-control-custom"
              placeholder="ejemplo@autoelite.com"
              required
              autocomplete="email"
            />
          </div>
        </div>

        <!-- Campo Contraseña -->
        <div class="input-group-custom">
          <label class="input-label">
            <i class="fas fa-lock text-gold"></i> Contraseña
          </label>
          <div class="input-wrapper">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-control-custom"
              placeholder="Mínimo 6 caracteres"
              required
              minlength="6"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="btn-toggle-eye"
              @click="showPassword = !showPassword"
              tabindex="-1"
            >
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
        </div>

        <!-- Campo Confirmar Contraseña -->
        <div class="input-group-custom">
          <label class="input-label">
            <i class="fas fa-shield-alt text-gold"></i> Confirmar Contraseña
          </label>
          <div class="input-wrapper">
            <input
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              class="form-control-custom"
              placeholder="Repite tu contraseña"
              required
              autocomplete="new-password"
            />
          </div>
        </div>

        <!-- Botón de Registro -->
        <button
          type="submit"
          class="btn-gold-submit"
          :disabled="loading || success"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="fas fa-user-check me-2"></i>
          {{ loading ? 'Creando cuenta...' : 'Registrarme' }}
        </button>
      </form>

      <!-- Footer del card -->
      <div class="auth-footer">
        <p>
          ¿Ya tienes una cuenta?
          <router-link to="/login" class="link-gold">Inicia sesión</router-link>
        </p>
        <router-link to="/" class="link-back">
          <i class="fas fa-arrow-left"></i> Volver al Catálogo
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "RegisterView",
  data() {
    return {
      nombre: "",
      email: "",
      password: "",
      confirmPassword: "",
      showPassword: false,
      error: null,
      success: false,
      loading: false,
    };
  },
  methods: {
    async handleRegister() {
      this.error = null;

      if (this.password.length < 6) {
        this.error = "La contraseña debe tener al menos 6 caracteres";
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.error = "Las contraseñas ingresadas no coinciden";
        return;
      }

      this.loading = true;
      try {
        await this.$store.dispatch("register", {
          nombre: this.nombre,
          email: this.email,
          password: this.password,
          rol: "user",
        });
        this.success = true;
        setTimeout(() => {
          this.$router.push("/autos");
        }, 1200);
      } catch (err) {
        this.error = err.message || "Error al crear la cuenta";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 20px 40px;
}

.auth-container {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: rgba(18, 18, 22, 0.95);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 20px;
  padding: 36px 32px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 215, 0, 0.08);
  backdrop-filter: blur(12px);
}

.auth-glow {
  position: absolute;
  top: -1px;
  left: 20%;
  right: 20%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ffd700, transparent);
  box-shadow: 0 0 15px #ffd700;
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  padding: 4px 12px;
  border-radius: 20px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.75rem;
  letter-spacing: 2px;
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 12px;
}

.auth-title {
  font-family: "Orbitron", sans-serif;
  font-size: 1.8rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.auth-subtitle {
  color: #8e8e93;
  font-size: 0.9rem;
  margin: 0;
}

.text-gold {
  color: #ffd700;
}

.alert-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 0.85rem;
  margin-bottom: 20px;
}

.alert-danger {
  background: rgba(255, 68, 68, 0.12);
  border: 1px solid rgba(255, 68, 68, 0.4);
  color: #ff6b6b;
}

.alert-success {
  background: rgba(46, 204, 113, 0.12);
  border: 1px solid rgba(46, 204, 113, 0.4);
  color: #2ecc71;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group-custom {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-family: "Rajdhani", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #cfcfd4;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-control-custom {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 215, 0, 0.18);
  border-radius: 10px;
  padding: 11px 14px;
  color: #fff;
  font-size: 0.95rem;
  transition: all 0.25s ease;
}

.form-control-custom:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.08);
  border-color: #ffd700;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.25);
}

.btn-toggle-eye {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: #8e8e93;
  cursor: pointer;
  padding: 4px;
}

.btn-toggle-eye:hover {
  color: #ffd700;
}

.btn-gold-submit {
  width: 100%;
  background: linear-gradient(135deg, #ffd700, #b8860b);
  border: none;
  border-radius: 10px;
  padding: 12px;
  font-family: "Orbitron", sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0b0b0e;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
  margin-top: 8px;
}

.btn-gold-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(255, 215, 0, 0.45);
}

.btn-gold-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-footer {
  margin-top: 22px;
  text-align: center;
  font-size: 0.85rem;
  color: #8e8e93;
}

.link-gold {
  color: #ffd700;
  text-decoration: none;
  font-weight: 600;
  margin-left: 4px;
}

.link-gold:hover {
  text-decoration: underline;
}

.link-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6c757d;
  font-size: 0.8rem;
  text-decoration: none;
  margin-top: 14px;
  transition: color 0.2s;
}

.link-back:hover {
  color: #ffd700;
}
</style>
