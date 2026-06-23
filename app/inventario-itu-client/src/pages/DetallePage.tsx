import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEquipoCompleto } from "../api/equipos.api";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { EquipoCompleto } from "../types";
import NavBar from "../components/layout/NavBar";
import EditarModal from "../components/EditarModal";
import "../styles/detalle.css";

export default function DetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  const [equipo, setEquipo] = useState<EquipoCompleto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);

  const puedeEditar = usuario?.rol === "admin" || usuario?.rol === "tecnico";

  async function cargar() {
    setCargando(true);
    setError(null);

    const idNum = Number(id);
    if (!id || Number.isNaN(idNum)) {
      setError("ID de equipo inválido.");
      setCargando(false);
      return;
    }

    try {
      const data = await getEquipoCompleto(idNum);
      setEquipo(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
        setError(
          err.status === 404
            ? "No se encontró el equipo solicitado."
            : err.message,
        );
      } else {
        setError("Error al cargar el equipo.");
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="detalle">
      <NavBar />

      <main className="detalle-main">
        <div className="detalle-acciones-top">
          <button
            type="button"
            className="detalle-volver"
            onClick={() => navigate("/dashboard")}
          >
            ← Volver al inventario
          </button>

          {/* Botón solo visible para admin y técnico */}
          {puedeEditar && equipo && (
            <button
              type="button"
              className="detalle-btn-editar"
              onClick={() => setEditando(true)}
            >
              ✏ Editar equipo
            </button>
          )}
        </div>

        {cargando && <p className="detalle-msg">Cargando equipo...</p>}
        {error && <p className="detalle-msg detalle-error">{error}</p>}

        {!cargando && !error && equipo && <Contenido equipo={equipo} />}
      </main>

      {/* Modal de edición — solo se monta si puedeEditar y se pidió abrir */}
      {editando && equipo && (
        <EditarModal
          equipo={equipo}
          onCerrar={() => setEditando(false)}
          onGuardado={() => {
            setEditando(false);
            cargar(); // recarga el equipo con los datos actualizados
          }}
        />
      )}
    </div>
  );
}

function Contenido({ equipo }: { equipo: EquipoCompleto }) {
  const { ubicacion: u, hardware: h } = equipo;

  return (
    <>
      <header className="detalle-header">
        <div>
          <span className="detalle-codigo">{u.codigo_inventario}</span>
          <h1>{h ? `${h.fabricante} ${h.modelo}` : u.codigo_inventario}</h1>
        </div>
        <span className={`detalle-estado detalle-estado--${u.estado}`}>
          {u.estado}
        </span>
      </header>

      <div className="detalle-grid">
        <section className="detalle-card">
          <h2>Ubicación y asignación</h2>
          <p className="detalle-fuente">Fuente: SQL Server</p>
          <dl>
            <Dato label="Aula" valor={u.aula} />
            <Dato label="Edificio" valor={u.edificio} />
            <Dato label="Banco / mesa" valor={`#${u.numero_banco}`} />
            <Dato
              label="Responsable"
              valor={
                u.responsable
                  ? `${u.responsable} (${u.rol_responsable})`
                  : "Sin asignar"
              }
            />
            <Dato
              label="Último mantenimiento"
              valor={u.fecha_mantenimiento ?? "Sin registro"}
            />
          </dl>
        </section>

        {!h && (
          <section className="detalle-card">
            <h2>Hardware</h2>
            <p className="detalle-fuente">Fuente: MongoDB</p>
            <p className="detalle-sinhardware">
              Este equipo no tiene información de hardware registrada en
              MongoDB.
            </p>
          </section>
        )}

        {h && (
          <section className="detalle-card">
            <h2>Hardware</h2>
            <p className="detalle-fuente">Fuente: MongoDB</p>
            <dl>
              <Dato label="Tipo" valor={h.tipo} />
              <Dato
                label="CPU"
                valor={
                  `${h.cpu.marca} ${h.cpu.modelo} · ${h.cpu.nucleos} núcleos` +
                  (h.cpu.frecuencia_ghz ? ` @ ${h.cpu.frecuencia_ghz} GHz` : "")
                }
              />
              <Dato label="RAM" valor={`${h.ram_gb} GB`} />
              <Dato
                label="Disco"
                valor={`${h.disco.tipo} ${h.disco.capacidad_gb} GB`}
              />
              <Dato label="Sistema operativo" valor={h.sistema_operativo} />
              {h.gpu && (
                <Dato
                  label="GPU"
                  valor={`${h.gpu.marca} ${h.gpu.modelo} (${h.gpu.vram_gb} GB)`}
                />
              )}
            </dl>
          </section>
        )}

        {h && (
          <section className="detalle-card">
            <h2>Periféricos</h2>
            <p className="detalle-fuente">Fuente: MongoDB</p>
            <dl>
              <Dato
                label="Monitor"
                valor={
                  h.monitor
                    ? `${h.monitor.marca}${
                        h.monitor.modelo ? ` ${h.monitor.modelo}` : ""
                      } (${h.monitor.pulgadas}")`
                    : "No asignado"
                }
              />
              <Dato label="Teclado" valor={h.teclado} />
              <Dato label="Mouse" valor={h.mouse ?? "No asignado"} />
            </dl>
          </section>
        )}

        {h?.bateria && (
          <section className="detalle-card">
            <h2>Batería</h2>
            <p className="detalle-fuente">Fuente: MongoDB</p>
            <dl>
              <Dato
                label="Capacidad"
                valor={`${(h.bateria.capacidad_mwh / 1000).toFixed(1)} Wh`}
              />
              <Dato label="Ciclos de carga" valor={String(h.bateria.ciclos)} />
            </dl>
          </section>
        )}
      </div>
    </>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="detalle-dato">
      <dt>{label}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
