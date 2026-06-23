import { Router } from "express";
import { requireAuth, requireRol } from "../middleware/auth.middleware.js";
import {
  listarEquipos,
  obtenerEquipoCompleto,
  editarEquipo,
  crearEquipo,
  eliminarEquipo,
} from "../services/equipos.service.js";

const router = Router();

router.use(requireAuth);

// GET /equipos → lista filtrada según el rol del usuario.
router.get("/", async (req, res) => {
  try {
    const equipos = await listarEquipos(req.usuario);
    return res.json(equipos);
  } catch (err) {
    console.error("[equipos] Error al listar:", err.message);
    return res.status(500).json({ error: "Error al obtener los equipos." });
  }
});

// GET /equipos/:id → detalle, con control de acceso por rol.
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de equipo inválido." });
  }
  try {
    const equipo = await obtenerEquipoCompleto(id, req.usuario);
    if (!equipo) {
      return res.status(404).json({ error: "Equipo no encontrado." });
    }
    return res.json(equipo);
  } catch (err) {
    if (err.codigo === "FORBIDDEN") {
      return res.status(403).json({ error: err.message });
    }
    console.error("[equipos] Error al obtener equipo:", err.message);
    return res.status(500).json({ error: "Error al obtener el equipo." });
  }
});

// POST /equipos → crear equipo (solo admin y tecnico).
router.post("/", requireRol("admin", "tecnico"), async (req, res) => {
  try {
    const equipo = await crearEquipo(req.body || {}, req.usuario);
    return res.status(201).json(equipo);
  } catch (err) {
    if (err.codigo === "VALIDACION") {
      return res.status(400).json({ error: err.message });
    }
    console.error("[equipos] Error al crear equipo:", err.message);
    return res.status(500).json({ error: "No se pudo crear el equipo." });
  }
});

// PUT /equipos/:id → editar (solo admin y tecnico).
router.put("/:id", requireRol("admin", "tecnico"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de equipo inválido." });
  }
  const cambios = req.body || {};
  const camposPermitidos = [
    "estado",
    "fecha_mantenimiento",
    "responsable",
    "hardware",
  ];
  const tieneCambios = camposPermitidos.some((c) => cambios[c] !== undefined);
  if (!tieneCambios) {
    return res.status(400).json({ error: "No se enviaron cambios." });
  }
  try {
    const equipo = await editarEquipo(id, cambios, req.usuario);
    if (!equipo) {
      return res.status(404).json({ error: "Equipo no encontrado." });
    }
    return res.json(equipo);
  } catch (err) {
    if (err.codigo === "VALIDACION") {
      return res.status(400).json({ error: err.message });
    }
    console.error("[equipos] Error al editar equipo:", err.message);
    return res.status(500).json({ error: "No se pudo editar el equipo." });
  }
});

// DELETE /equipos/:id → eliminar (solo admin y tecnico).
router.delete("/:id", requireRol("admin", "tecnico"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de equipo inválido." });
  }
  try {
    const eliminado = await eliminarEquipo(id);
    if (!eliminado) {
      return res.status(404).json({ error: "Equipo no encontrado." });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("[equipos] Error al eliminar equipo:", err.message);
    return res.status(500).json({ error: "No se pudo eliminar el equipo." });
  }
});

export default router;
