// src/components/layout/NavBar.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/navbar.css";

export default function NavBar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <button
          type="button"
          className="navbar-brand"
          onClick={() => navigate("/dashboard")}
        >
          Inventario <span>ITU</span>
        </button>

        <div className="navbar-user">
          {usuario && (
            <span className="navbar-userinfo">
              <span className="navbar-username">{usuario.username}</span>
              <span className="navbar-rol">{usuario.rol}</span>
            </span>
          )}
          <button
            type="button"
            className="navbar-logout"
            onClick={handleLogout}
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
