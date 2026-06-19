// src/pages/LoginPage.tsx
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login as loginApi } from "../api/auth.api";
import { ApiError } from "../api/client";
import "../styles/login.css";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      // login real: pega a /auth/login, guarda el token, devuelve el usuario
      const usuario = await loginApi(username.trim(), password);
      login(usuario); // lo carga en el context
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        // 401 → credenciales; 0 → sin conexión; otro → mensaje del server
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <header className="login-header">
          <h1>Inventario ITU</h1>
          <p>Ecosistema de Inventario Seguro</p>
        </header>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Usuario
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="usuario institucional"
              autoComplete="username"
              required
              disabled={cargando}
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={cargando}
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={cargando}>
            {cargando ? "Verificando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
