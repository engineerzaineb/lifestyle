import { useState, useEffect } from "react";
import { AuthContext } from "./authContextValue";
import { STORAGE_KEYS } from "../utils/constants";
import { updateLocation } from "../services/authService";

/**
 * AuthProvider - Gère l'état d'authentification de l'app
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Chargement initial depuis localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedRefresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setRefreshToken(storedRefresh);
      }
    } catch (err) {
      console.error("Erreur chargement auth :", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  /**
   * Connecte l'utilisateur après login/register réussi
   * @param {object} userData - données du user
   * @param {string} accessToken - JWT access token
   * @param {string} refreshTokenValue - JWT refresh token
   * @param {boolean} skipLocationUpdate - si true, ne pas faire d'auto-update (utile après register)
   */
  const login = (userData, accessToken, refreshTokenValue = null, skipLocationUpdate = false) => {
    // 1. Stocker en localStorage AVANT toute autre opération
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
    if (refreshTokenValue) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshTokenValue);
    }

    // 2. Mettre à jour le state React
    setUser(userData);
    setToken(accessToken);
    if (refreshTokenValue) {
      setRefreshToken(refreshTokenValue);
    }

    // 3. Auto-géolocalisation : SEULEMENT au login (pas au register)
    // Et seulement si le user n'a pas déjà une position récente
    if (!skipLocationUpdate) {
      autoUpdateLocation(userData);
    }
  };

  /**
   * Met à jour la position automatiquement
   * Uniquement si le user n'a pas de position récente (< 1 jour)
   */
  const autoUpdateLocation = (userData) => {
    if (!navigator.geolocation) return;

    // Vérifier si l'utilisateur a déjà une position récente
    const lastUpdate = userData?.last_location_update;
    if (lastUpdate) {
      const lastUpdateDate = new Date(lastUpdate);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdateDate) / (1000 * 60 * 60);

      // Si position mise à jour il y a moins de 1 heure, on ne refait pas
      if (hoursSinceUpdate < 1) {
        console.log("📍 Position déjà à jour, pas de nouvelle requête");
        return;
      }
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            source: "login",
          });
          console.log("📍 Position mise à jour automatiquement");
        } catch (err) {
          console.warn("Impossible de mettre à jour la position :", err.message);
        }
      },
      // Refus silencieux
      (err) => {
        console.warn("Géolocalisation refusée :", err.message);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  /**
   * Déconnecte l'utilisateur
   */
  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  };

  /**
   * Met à jour les infos du user (après modification du profil)
   */
  const updateUser = (newUserData) => {
    const merged = { ...user, ...newUserData };
    setUser(merged);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
  };

  const value = {
    user,
    token,
    refreshToken,
    isAuthenticated: !!user && !!token,
    isLoaded,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}