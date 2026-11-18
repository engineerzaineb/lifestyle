import { useState, useEffect } from "react";
import { AuthContext } from "./authContextValue";
import { STORAGE_KEYS } from "../utils/constants";

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
   *
   * La position n'est plus demandée automatiquement : l'utilisateur choisit sa
   * ville dans la liste, ou clique lui-même sur « Utiliser ma position »
   * (accueil, profil, inscription) pour sélectionner la ville la plus proche.
   */
  const login = (userData, accessToken, refreshTokenValue = null) => {
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