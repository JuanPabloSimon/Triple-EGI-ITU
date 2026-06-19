// src/pages/DashboardPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEquipos } from "../api/equipos.api";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { EquipoUbicacion } from "../types";
import NavBar from "../components/layout/NavBar";
import "../styles/dashboard.css";

type FiltroEstado = "todos" | "activo" | "mantenimiento" | "baja";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [equipos, setEquipos] = useState<EquipoUbicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const data = await getEquipos();
        if (activo) setEquipos(data);
      } catch (err) {
        if (!activo) return;
        // Token vencido o inválido → cerramos sesión y vamos al login.
        if (err instanceof ApiError && err.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los equipos.",
        );
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [navigate, logout]);

  const equiposFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return equipos.filter((e) => {
      const coincideEstado = filtro === "todos" || e.estado === filtro;
      const coincideBusqueda =
        q === "" ||
        e.codigo_inventario.toLowerCase().includes(q) ||
        e.aula.toLowerCase().includes(q) ||
        e.edificio.toLowerCase().includes(q) ||
        (e.responsable?.toLowerCase().includes(q) ?? false);
      return coincideEstado && coincideBusqueda;
    });
  }, [equipos, busqueda, filtro]);

  return (
    <div className="dash">
      <NavBar />

      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Inventario de equipos</h1>
            <p>
              {equiposFiltrados.length} de {equipos.length} equipos
            </p>
          </div>
        </header>

        <div className="dash-toolbar">
          <input
            type="text"
            className="dash-search"
            placeholder="Buscar por código, aula, edificio o responsable..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="dash-filtros">
            {(
              ["todos", "activo", "mantenimiento", "baja"] as FiltroEstado[]
            ).map((f) => (
              <button
                key={f}
                type="button"
                className={filtro === f ? "activo" : ""}
                onClick={() => setFiltro(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {cargando && <p className="dash-msg">Cargando equipos...</p>}
        {error && <p className="dash-msg dash-error">{error}</p>}

        {!cargando && !error && equiposFiltrados.length === 0 && (
          <p className="dash-msg">
            No hay equipos que coincidan con la búsqueda.
          </p>
        )}

        {!cargando && !error && equiposFiltrados.length > 0 && (
          <div className="dash-tabla-wrap">
            <table className="dash-tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Ubicación</th>
                  <th>Banco</th>
                  <th>Estado</th>
                  <th>Responsable</th>
                  <th>Últ. mantenimiento</th>
                </tr>
              </thead>
              <tbody>
                {equiposFiltrados.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/equipo/${e.id}`)}
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") navigate(`/equipo/${e.id}`);
                    }}
                  >
                    <td className="dash-codigo">{e.codigo_inventario}</td>
                    <td>
                      {e.aula} · {e.edificio}
                    </td>
                    <td>{e.numero_banco}</td>
                    <td>
                      <span className={`dash-estado dash-estado--${e.estado}`}>
                        {e.estado}
                      </span>
                    </td>
                    <td>{e.responsable ?? "—"}</td>
                    <td>{e.fecha_mantenimiento ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
