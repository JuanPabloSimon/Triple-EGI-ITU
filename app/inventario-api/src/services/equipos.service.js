// src/services/equipos.service.js
import { querySql } from "../db/sql.js";
import { getHardwareCollection } from "../db/mongo.js";

// Query base: equipo + aula + responsable vigente (asignación sin fecha_fin).
const SELECT_EQUIPOS = `
  SELECT
    e.id,
    e.codigo_inventario,
    a.nombre              AS aula,
    a.edificio,
    e.numero_banco,
    e.fecha_mantenimiento,
    e.estado,
    e.mongo_id,
    u.username            AS responsable,
    u.rol                 AS rol_responsable
  FROM equipos e
  JOIN aulas a                ON e.aula_id      = a.id
  LEFT JOIN asignaciones asig ON asig.equipo_id = e.id AND asig.fecha_fin IS NULL
  LEFT JOIN usuarios u        ON asig.usuario_id = u.id
`;

function mapUbicacion(row) {
  return {
    id: row.id,
    codigo_inventario: row.codigo_inventario,
    aula: row.aula,
    edificio: row.edificio,
    numero_banco: row.numero_banco,
    fecha_mantenimiento: row.fecha_mantenimiento
      ? new Date(row.fecha_mantenimiento).toISOString().slice(0, 10)
      : null,
    estado: row.estado,
    mongo_id: row.mongo_id,
    responsable: row.responsable ?? null,
    rol_responsable: row.rol_responsable ?? null,
  };
}

// admin y tecnico ven todo; alumno y docente solo lo suyo.
function esStaff(usuarioReq) {
  return usuarioReq.rol === "admin" || usuarioReq.rol === "tecnico";
}

// GET /equipos → lista de ubicaciones (SQL Server), filtrada por rol.
export async function listarEquipos(usuarioReq) {
  let query = SELECT_EQUIPOS;
  const params = {};

  if (!esStaff(usuarioReq)) {
    // alumno/docente: solo equipos asignados a ellos (vigentes)
    query += ` WHERE u.username = @username`;
    params.username = usuarioReq.sub;
  }

  query += ` ORDER BY a.nombre, e.numero_banco`;
  const rows = await querySql(query, params);
  return rows.map(mapUbicacion);
}

// GET /equipos/:id → ubicación (SQL) + hardware (Mongo).
// alumno/docente solo pueden ver el detalle de un equipo propio.
export async function obtenerEquipoCompleto(id, usuarioReq) {
  const rows = await querySql(`${SELECT_EQUIPOS} WHERE e.id = @id`, { id });

  if (rows.length === 0) {
    return null; // no existe → 404
  }

  const ubicacion = mapUbicacion(rows[0]);

  // Si no es staff y el equipo no es suyo → acceso denegado (403).
  if (!esStaff(usuarioReq) && ubicacion.responsable !== usuarioReq.sub) {
    const err = new Error("No tenés acceso a este equipo.");
    err.codigo = "FORBIDDEN";
    throw err;
  }

  const coleccion = await getHardwareCollection();
  const hardware = await coleccion.findOne({ _id: ubicacion.mongo_id });

  return {
    ubicacion,
    hardware: hardware ?? null,
  };
}

// PUT /equipos/:id → edición (solo admin/tecnico, validado en la ruta).
// cambios = { estado?, fecha_mantenimiento?, responsable?, hardware? }
// Devuelve el equipo actualizado completo, o null si no existe (404).
const ESTADOS_VALIDOS = ["activo", "baja", "mantenimiento"];

export async function editarEquipo(id, cambios, usuarioReq) {
  // 1. Verificar que el equipo existe y obtener su mongo_id.
  const existentes = await querySql(
    `SELECT id, mongo_id FROM equipos WHERE id = @id`,
    { id },
  );
  if (existentes.length === 0) {
    return null; // no existe → 404
  }
  const mongoId = existentes[0].mongo_id;

  // 2. Actualizar ubicación en SQL (estado y/o fecha_mantenimiento).
  const sets = [];
  const params = { id };

  if (cambios.estado !== undefined) {
    if (!ESTADOS_VALIDOS.includes(cambios.estado)) {
      const err = new Error("Estado inválido.");
      err.codigo = "VALIDACION";
      throw err;
    }
    sets.push("estado = @estado");
    params.estado = cambios.estado;
  }

  if (cambios.fecha_mantenimiento !== undefined) {
    sets.push("fecha_mantenimiento = @fecha");
    params.fecha = cambios.fecha_mantenimiento || null;
  }

  if (sets.length > 0) {
    await querySql(
      `UPDATE equipos SET ${sets.join(", ")} WHERE id = @id`,
      params,
    );
  }

  // 3. Reasignar responsable: cerrar la asignación vigente y abrir una nueva.
  if (cambios.responsable) {
    const usuarios = await querySql(
      `SELECT id, rol FROM usuarios WHERE username = @username`,
      { username: cambios.responsable },
    );
    if (usuarios.length === 0) {
      const err = new Error("El usuario responsable no existe.");
      err.codigo = "VALIDACION";
      throw err;
    }
    const nuevoUsuarioId = usuarios[0].id;
    const tipo = ["alumno", "docente", "tecnico"].includes(usuarios[0].rol)
      ? usuarios[0].rol
      : "tecnico";

    await querySql(
      `UPDATE asignaciones SET fecha_fin = GETDATE()
       WHERE equipo_id = @id AND fecha_fin IS NULL`,
      { id },
    );
    await querySql(
      `INSERT INTO asignaciones (equipo_id, usuario_id, fecha_inicio, tipo)
       VALUES (@id, @usuarioId, GETDATE(), @tipo)`,
      { id, usuarioId: nuevoUsuarioId, tipo },
    );
  }

  // 4. Actualizar hardware en MongoDB (sin tocar el _id).
  if (cambios.hardware && typeof cambios.hardware === "object") {
    const { _id, ...campos } = cambios.hardware;
    if (Object.keys(campos).length > 0) {
      const coleccion = await getHardwareCollection();
      await coleccion.updateOne({ _id: mongoId }, { $set: campos });
    }
  }

  // 5. Devolver el equipo actualizado completo.
  return obtenerEquipoCompleto(id, usuarioReq);
}
