import { useState } from "react";
import { createEquipo } from "../api/equipos.api";
import { ApiError } from "../api/client";

interface Props {
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function CrearModal({ onCerrar, onGuardado }: Props) {
  const [codigo, setCodigo] = useState("");
  const [aulaId, setAulaId] = useState("");
  const [banco, setBanco] = useState("");
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState("activo");

  // Hardware básico
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [tipo, setTipo] = useState("desktop");
  const [ram, setRam] = useState("");
  const [discoTipo, setDiscoTipo] = useState("SSD");
  const [discoGb, setDiscoGb] = useState("");
  const [so, setSo] = useState("");
  const [cpuMarca, setCpuMarca] = useState("");
  const [cpuModelo, setCpuModelo] = useState("");
  const [cpuNucleos, setCpuNucleos] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);

    try {
      await createEquipo({
        codigo_inventario: codigo.trim(),
        aula_id: Number(aulaId),
        numero_banco: Number(banco),
        fecha_mantenimiento: fecha || null,
        estado,
        hardware: {
          fabricante,
          modelo,
          tipo,
          ram_gb: Number(ram),
          disco: { tipo: discoTipo, capacidad_gb: Number(discoGb) },
          sistema_operativo: so,
          cpu: {
            marca: cpuMarca,
            modelo: cpuModelo,
            nucleos: Number(cpuNucleos),
          },
          monitor: null,
          mouse: null,
          teclado: tipo === "laptop" ? "integrado" : "",
        },
      });
      onGuardado();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo crear el equipo.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Nuevo equipo</h2>
          <button type="button" className="modal-cerrar" onClick={onCerrar}>
            ✕
          </button>
        </header>

        <div className="modal-body">
          {/* Ubicación */}
          <section className="modal-seccion">
            <h3>Ubicación · SQL Server</h3>
            <div className="modal-campo">
              <label>Código de inventario</label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="EQ-009"
              />
            </div>
            <div className="modal-campo">
              <label>ID de aula</label>
              <input
                type="number"
                value={aulaId}
                onChange={(e) => setAulaId(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="modal-campo">
              <label>Número de banco</label>
              <input
                type="number"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="5"
              />
            </div>
            <div className="modal-campo">
              <label>Fecha de mantenimiento</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="modal-campo">
              <label>Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="activo">Activo</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </section>

          {/* Hardware */}
          <section className="modal-seccion">
            <h3>Hardware · MongoDB</h3>
            <div className="modal-campo">
              <label>Fabricante</label>
              <input
                value={fabricante}
                onChange={(e) => setFabricante(e.target.value)}
                placeholder="Dell"
              />
            </div>
            <div className="modal-campo">
              <label>Modelo</label>
              <input
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="OptiPlex 7010"
              />
            </div>
            <div className="modal-campo">
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="desktop">Desktop</option>
                <option value="laptop">Laptop</option>
              </select>
            </div>
            <div className="modal-campo">
              <label>CPU marca</label>
              <input
                value={cpuMarca}
                onChange={(e) => setCpuMarca(e.target.value)}
                placeholder="Intel"
              />
            </div>
            <div className="modal-campo">
              <label>CPU modelo</label>
              <input
                value={cpuModelo}
                onChange={(e) => setCpuModelo(e.target.value)}
                placeholder="Core i5-12500"
              />
            </div>
            <div className="modal-campo">
              <label>CPU núcleos</label>
              <input
                type="number"
                value={cpuNucleos}
                onChange={(e) => setCpuNucleos(e.target.value)}
                placeholder="6"
              />
            </div>
            <div className="modal-campo">
              <label>RAM (GB)</label>
              <input
                type="number"
                value={ram}
                onChange={(e) => setRam(e.target.value)}
                placeholder="16"
              />
            </div>
            <div className="modal-campo">
              <label>Disco tipo</label>
              <select
                value={discoTipo}
                onChange={(e) => setDiscoTipo(e.target.value)}
              >
                <option value="SSD">SSD</option>
                <option value="NVMe">NVMe</option>
                <option value="HDD">HDD</option>
              </select>
            </div>
            <div className="modal-campo">
              <label>Disco (GB)</label>
              <input
                type="number"
                value={discoGb}
                onChange={(e) => setDiscoGb(e.target.value)}
                placeholder="512"
              />
            </div>
            <div className="modal-campo">
              <label>Sistema operativo</label>
              <input
                value={so}
                onChange={(e) => setSo(e.target.value)}
                placeholder="Ubuntu 22.04 LTS"
              />
            </div>
          </section>

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
            {guardando ? "Creando..." : "Crear equipo"}
          </button>
        </footer>
      </div>
    </div>
  );
}
