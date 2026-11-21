// src/store/index.js
import Vue from "vue";
import Vuex from "vuex";
import axios from "axios";
import router from "../router";

const API_URL = process.env.VUE_APP_API_URL || "";
axios.defaults.baseURL = API_URL;

// Recuperar token y usuario guardados
const initialToken = localStorage.getItem("token") || "";
let initialUser = null;
try {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    initialUser = JSON.parse(storedUser);
  }
} catch (e) {
  initialUser = null;
}

if (initialToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${initialToken}`;
}

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    token: initialToken,
    user: initialUser,
    authLoading: false,
    authError: null,
    autos: [],
    fabricantes: [],
    categorias: [],
    loading: false,
  },
  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user,
    userRole: (state) => (state.user ? state.user.rol : null),
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token;
      if (token) {
        localStorage.setItem("token", token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["Authorization"];
      }
    },
    SET_USER(state, user) {
      state.user = user;
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
      }
    },
    SET_AUTH_LOADING(state, loading) {
      state.authLoading = loading;
    },
    SET_AUTH_ERROR(state, error) {
      state.authError = error;
    },
    LOGOUT(state) {
      state.token = "";
      state.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete axios.defaults.headers.common["Authorization"];
    },
    SET_AUTOS(state, autos) {
      state.autos = autos;
    },
    SET_FABRICANTES(state, fabricantes) {
      state.fabricantes = fabricantes;
    },
    SET_CATEGORIAS(state, categorias) {
      state.categorias = categorias;
    },
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    ADD_AUTO(state, auto) {
      state.autos.push(auto);
    },
    UPDATE_AUTO(state, auto) {
      const index = state.autos.findIndex((a) => a.id === auto.id);
      if (index !== -1) {
        Vue.set(state.autos, index, auto);
      }
    },
    DELETE_AUTO(state, id) {
      state.autos = state.autos.filter((a) => a.id !== id);
    },
  },
  actions: {
    // ===== AUTENTICACIÓN =====
    async login({ commit }, credentials) {
      commit("SET_AUTH_LOADING", true);
      commit("SET_AUTH_ERROR", null);
      try {
        const response = await axios.post("/api/auth/login", credentials);
        const { token, user } = response.data;
        commit("SET_TOKEN", token);
        commit("SET_USER", user);
        return response.data;
      } catch (error) {
        const message =
          error.response && error.response.data && error.response.data.error
            ? error.response.data.error
            : "Error al iniciar sesión";
        commit("SET_AUTH_ERROR", message);
        throw new Error(message);
      } finally {
        commit("SET_AUTH_LOADING", false);
      }
    },

    async register({ commit }, userData) {
      commit("SET_AUTH_LOADING", true);
      commit("SET_AUTH_ERROR", null);
      try {
        const response = await axios.post("/api/auth/register", userData);
        const { token, user } = response.data;
        commit("SET_TOKEN", token);
        commit("SET_USER", user);
        return response.data;
      } catch (error) {
        const message =
          error.response && error.response.data && error.response.data.error
            ? error.response.data.error
            : "Error al registrarse";
        commit("SET_AUTH_ERROR", message);
        throw new Error(message);
      } finally {
        commit("SET_AUTH_LOADING", false);
      }
    },

    logout({ commit }) {
      commit("LOGOUT");
      if (router.currentRoute.path !== "/login") {
        router.push("/login");
      }
    },

    // ===== CATÁLOGO =====
    async fetchAutos({ commit }) {
      commit("SET_LOADING", true);
      try {
        const response = await axios.get("/api/autos");
        commit("SET_AUTOS", response.data);
      } catch (error) {
        console.error("Error fetching autos:", error);
      } finally {
        commit("SET_LOADING", false);
      }
    },
    async fetchFabricantes({ commit }) {
      try {
        const response = await axios.get("/api/fabricantes");
        commit("SET_FABRICANTES", response.data);
      } catch (error) {
        console.error("Error fetching fabricantes:", error);
      }
    },
    async fetchCategorias({ commit }) {
      try {
        const response = await axios.get("/api/categorias");
        commit("SET_CATEGORIAS", response.data);
      } catch (error) {
        console.error("Error fetching categorias:", error);
      }
    },
    async createAuto({ dispatch }, auto) {
      try {
        const response = await axios.post("/api/autos", auto);
        await dispatch("fetchAutos");
        return response.data;
      } catch (error) {
        console.error("Error creating auto:", error);
        throw error;
      }
    },
    async updateAuto({ dispatch }, { id, auto }) {
      try {
        const response = await axios.put(`/api/autos/${id}`, auto);
        await dispatch("fetchAutos");
        return response.data;
      } catch (error) {
        console.error("Error updating auto:", error);
        throw error;
      }
    },
    async deleteAuto({ dispatch }, id) {
      try {
        await axios.delete(`/api/autos/${id}`);
        await dispatch("fetchAutos");
      } catch (error) {
        console.error("Error deleting auto:", error);
        throw error;
      }
    },
    async createFabricante({ dispatch }, fabricante) {
      try {
        await axios.post("/api/fabricantes", fabricante);
        await dispatch("fetchFabricantes");
      } catch (error) {
        console.error("Error creating fabricante:", error);
        throw error;
      }
    },
    async updateFabricante({ dispatch }, { id, fabricante }) {
      try {
        await axios.put(`/api/fabricantes/${id}`, fabricante);
        await dispatch("fetchFabricantes");
      } catch (error) {
        console.error("Error updating fabricante:", error);
        throw error;
      }
    },
    async deleteFabricante({ dispatch }, id) {
      try {
        await axios.delete(`/api/fabricantes/${id}`);
        await dispatch("fetchFabricantes");
      } catch (error) {
        console.error("Error deleting fabricante:", error);
        throw error;
      }
    },
    async createCategoria({ dispatch }, categoria) {
      try {
        await axios.post("/api/categorias", categoria);
        await dispatch("fetchCategorias");
      } catch (error) {
        console.error("Error creating categoria:", error);
        throw error;
      }
    },
    async updateCategoria({ dispatch }, { id, categoria }) {
      try {
        await axios.put(`/api/categorias/${id}`, categoria);
        await dispatch("fetchCategorias");
      } catch (error) {
        console.error("Error updating categoria:", error);
        throw error;
      }
    },
    async deleteCategoria({ dispatch }, id) {
      try {
        await axios.delete(`/api/categorias/${id}`);
        await dispatch("fetchCategorias");
      } catch (error) {
        console.error("Error deleting categoria:", error);
        throw error;
      }
    },
  },
});

// Interceptor de respuesta de Axios: Manejar 401 (token expirado o inválido)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Sesión expirada o no autorizada (401). Redirigiendo a Login...");
      store.commit("LOGOUT");
      if (router.currentRoute.path !== "/login") {
        router.push({
          path: "/login",
          query: { redirect: router.currentRoute.fullPath, expired: "1" },
        });
      }
    }
    return Promise.reject(error);
  }
);

export default store;
