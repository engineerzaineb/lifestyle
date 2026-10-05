import axios from "axios";
import { API_BASE_URL, STORAGE_KEYS } from "../utils/constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15000,
});

// Intercepteur de requêtes : ajoute automatiquement le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponses : gère les erreurs globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token expiré ou invalide
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

      // Redirige vers login si on n'y est pas déjà
      if (!window.location.pathname.includes('/login')) {
        window.location.href = "/login";
      }
    }

    // Log des erreurs en mode développement
    if (import.meta.env.DEV) {
      console.error("API Error:", {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

export default api;