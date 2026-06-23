import { useState } from "react";
import { updateEquipo } from "../api/equipos.api";
import { ApiError } from "../api/client";
import type { EquipoCompleto } from "../types";

interface Props {
  equipo: EquipoCompleto;
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function EditarModal({ equipo, onCerrar, onGuardado }: Props) {
  const { ubicacion: u, hardware: h } = equipo;

  // Estado local: arranca con los valores actuales del equipo
  const [estado, setEstado] = useState(u.estado);
  const [fecha, setFecha] = useState(u.fecha_mantenimiento ?? "");
  const [responsable, setResponsable] = useState(u.responsable ?? "");
  const [ramGb, setRamGb] = useState(String(h?.ram_gb ?? ""));
  const [discoGb, setDiscoGb] = useState(String(h?.disco?.capacidad_gb ?? ""));
  const [so, setSo] = useState(h?.sistema_operativo ?? "");

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);

    // Armamos solo los cambios que difieren del valor original
    const cambios: Parameters<typeof updateEquipo>[1] = {};

    if (estado !== u.estado) cambios.estado = estado;
    if (fecha !== (u.fecha_mantenimiento ?? ""))
      cambios.fecha_mantenimiento = fecha || null;
    if (responsable !== (u.responsable ?? ""))
      cambios.responsable = responsable;

    // Hardware: solo mandamos si hay cambios reales
    const hwCambios: Record<string, unknown> = {};
    if (h) {
      if (ramGb !== String(h.ram_gb)) hwCambios.ram_gb = Number(ramGb);
      if (discoGb !== String(h.disco?.capacidad_gb))
        hwCambios.disco = { ...h.disco, capacidad_gb: Number(discoGb) };
      if (so !== h.sistema_operativo) hwCambios.sistema_operativo = so;
    }
    if (Object.keys(hwCambios).length > 0) cambios.hardware = hwCambios;

    // Si no cambió nada, no mandamos el request
    if (Object.keys(cambios).length === 0) {
      onCerrar();
      return;
    }

    try {
      await updateEquipo(u.id, cambios);
      onGuardado();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No se pudo guardar. Intentá de nuevo.");
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    // Overlay: click fuera cierra el modal
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Editar {u.codigo_inventario}</h2>
          <button
            type="button"
            className="modal-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className="modal-body">
          {/* ── Sección 1: Estado y mantenimiento (SQL Server) ── */}
          <section className="modal-seccion">
            <h3>Estado del equipo · SQL Server</h3>
            <div className="modal-campo">
              <label htmlFor="estado">Estado</label>
              <select
                id="estado"
                value={estado}
                onChange={(e) =>
                  setEstado(
                    e.target.value as "activo" | "baja" | "mantenimiento",
                  )
                }
              >
                <option value="activo">Activo</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div className="modal-campo">
              <label htmlFor="fecha">Fecha de mantenimiento</label>
              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </section>

          {/* ── Sección 2: Responsable (SQL Server) ── */}
          <section className="modal-seccion">
            <h3>Responsable · SQL Server</h3>
            <div className="modal-campo">
              <label htmlFor="responsable">
                Username del nuevo responsable
              </label>
              <input
                id="responsable"
                type="text"
                value={responsable}
                placeholder="ej: dlopez"
                onChange={(e) => setResponsable(e.target.value)}
              />
            </div>
          </section>

          {/* ── Sección 3: Hardware (MongoDB) — solo si existe doc ── */}
          {h && (
            <section className="modal-seccion">
              <h3>Hardware · MongoDB</h3>
              <div className="modal-campo">
                <label htmlFor="ram">RAM (GB)</label>
                <input
                  id="ram"
                  type="number"
                  min={1}
                  value={ramGb}
                  onChange={(e) => setRamGb(e.target.value)}
                />
              </div>
              <div className="modal-campo">
                <label htmlFor="disco">Disco (GB)</label>
                <input
                  id="disco"
                  type="number"
                  min={1}
                  value={discoGb}
                  onChange={(e) => setDiscoGb(e.target.value)}
                />
              </div>
              <div className="modal-campo">
                <label htmlFor="so">Sistema operativo</label>
                <input
                  id="so"
                  type="text"
                  value={so}
                  onChange={(e) => setSo(e.target.value)}
                />
              </div>
            </section>
          )}

          {error && <p className="modal-error">{error}</p>}
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="modal-btn modal-btn--cancelar"
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="modal-btn modal-btn--guardar"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </footer>
      </div>
    </div>
  );
}
