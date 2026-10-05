import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function ProtectedRoute({ children, roles, requireOrganisateur }) {
  const { user, isAuthenticated, isLoaded } = useAuth();
  const location = useLocation();

  // En attendant le chargement initial
  if (!isLoaded) return null;

  // Pas connecté → redirection login (avec mémorisation de la page demandée)
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Si la route nécessite d'être organisateur
  if (requireOrganisateur && !user.is_organisateur && user.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  // Rôle non autorisé → redirection home
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}