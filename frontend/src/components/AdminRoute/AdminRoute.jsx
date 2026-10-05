import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return children;
}