import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEquipos, deleteEquipo } from "../api/equipos.api";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { EquipoUbicacion } from "../types";
import NavBar from "../components/layout/NavBar";
import CrearModal from "../components/CrearModal";
import "../styles/dashboard.css";

type FiltroEstado = "todos" | "activo" | "mantenimiento" | "baja";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  const [equipos, setEquipos] = useState<EquipoUbicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");

  const puedeEditar = usuario?.rol === "admin" || usuario?.rol === "tecnico";

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const data = await getEquipos();
      setEquipos(data);
    } catch (err) {
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
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEliminar(e: React.MouseEvent, equipo: EquipoUbicacion) {
    // Evitar que el click propague a la fila (que navega al detalle)
    e.stopPropagation();
    if (
      !confirm(
        `¿Eliminar el equipo ${equipo.codigo_inventario}? Esta acción no se puede deshacer.`,
      )
    )
      return;

    try {
      await deleteEquipo(equipo.id);
      // Quitar de la lista local sin recargar todo
      setEquipos((prev) => prev.filter((eq) => eq.id !== equipo.id));
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar el equipo.",
      );
    }
  }

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
          {/* Botón crear: solo para admin y técnico */}
          {puedeEditar && (
            <button
              type="button"
              className="dash-btn-crear"
              onClick={() => setCreando(true)}
            >
              + Nuevo equipo
            </button>
          )}
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
                  {puedeEditar && <th>Acciones</th>}
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
                    {puedeEditar && (
                      <td>
                        <button
                          type="button"
                          className="dash-btn-eliminar"
                          onClick={(ev) => handleEliminar(ev, e)}
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {creando && (
        <CrearModal
          onCerrar={() => setCreando(false)}
          onGuardado={() => {
            setCreando(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}
