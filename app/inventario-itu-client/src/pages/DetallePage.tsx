// src/pages/DetallePage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEquipoCompleto } from "../api/equipos.api";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { EquipoCompleto } from "../types";
import NavBar from "../components/layout/NavBar";
import "../styles/detalle.css";

export default function DetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [equipo, setEquipo] = useState<EquipoCompleto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      setCargando(true);
      setError(null);

      const idNum = Number(id);
      if (!id || Number.isNaN(idNum)) {
        if (activo) {
          setError("ID de equipo inválido.");
          setCargando(false);
        }
        return;
      }

      try {
        const data = await getEquipoCompleto(idNum);
        if (activo) setEquipo(data);
      } catch (err) {
        if (!activo) return;
        if (err instanceof ApiError) {
          if (err.status === 401) {
            logout();
            navigate("/login", { replace: true });
            return;
          }
          if (err.status === 404) {
            setError("No se encontró el equipo solicitado.");
          } else {
            setError(err.message);
          }
        } else {
          setError("Error al cargar el equipo.");
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();
    return () => {
      activo = false;
    };
  }, [id, navigate, logout]);

  return (
    <div className="detalle">
      <NavBar />

      <main className="detalle-main">
        <button
          type="button"
          className="detalle-volver"
          onClick={() => navigate("/dashboard")}
        >
          ← Volver al inventario
        </button>

        {cargando && <p className="detalle-msg">Cargando equipo...</p>}
        {error && <p className="detalle-msg detalle-error">{error}</p>}

        {!cargando && !error && equipo && <Contenido equipo={equipo} />}
      </main>
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
        {/* === Bloque SQL Server: ubicación === */}
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

        {/* === Si NO hay hardware en Mongo === */}
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

        {/* === Bloque MongoDB: hardware === */}
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

        {/* === Periféricos (solo si hay hardware) === */}
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

        {/* === Batería (solo laptops con batería) === */}
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
