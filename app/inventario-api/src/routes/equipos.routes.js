// src/routes/equipos.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listarEquipos,
  obtenerEquipoCompleto,
} from "../services/equipos.service.js";

const router = Router();

// Todas las rutas de equipos requieren autenticación.
router.use(requireAuth);

// GET /equipos → lista de ubicaciones (SQL Server).
router.get("/", async (_req, res) => {
  try {
    const equipos = await listarEquipos();
    return res.json(equipos);
  } catch (err) {
    console.error("[equipos] Error al listar:", err.message);
    return res.status(500).json({ error: "Error al obtener los equipos." });
  }
});

// GET /equipos/:id → ubicación (SQL) + hardware (Mongo) combinados.
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID de equipo inválido." });
  }

  try {
    const equipo = await obtenerEquipoCompleto(id);

    if (!equipo) {
      return res.status(404).json({ error: "Equipo no encontrado." });
    }

    return res.json(equipo);
  } catch (err) {
    console.error("[equipos] Error al obtener equipo:", err.message);
    return res.status(500).json({ error: "Error al obtener el equipo." });
  }
});

export default router;
