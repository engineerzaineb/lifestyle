import { useContext } from "react";
import { AuthContext } from "./authContextValue";

/**
 * useAuth — Hook pour accéder au contexte d'authentification
 *
 * Usage dans n'importe quel composant :
 * const { user, login, logout, isAuthenticated } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}