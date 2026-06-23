// src/components/layout/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated, cargando } = useAuth();

  // Mientras restauramos la sesión, no decidimos todavía.
  if (cargando) {
    return <div style={{ padding: 40, textAlign: "center" }}>Cargando...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
