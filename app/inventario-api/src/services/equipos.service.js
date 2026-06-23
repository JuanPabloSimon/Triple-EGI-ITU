// src/services/equipos.service.js
import { querySql } from "../db/sql.js";
import { getHardwareCollection } from "../db/mongo.js";

// Query base: equipo + aula + responsable vigente (asignación sin fecha_fin).
// Es la misma lógica del join que dejaron en el seed de SQL Server.
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

// Normaliza una fila de SQL al shape de ubicación que espera el frontend.
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

// GET /equipos → lista de ubicaciones (solo SQL Server).
export async function listarEquipos() {
  const rows = await querySql(
    `${SELECT_EQUIPOS} ORDER BY a.nombre, e.numero_banco`,
  );
  return rows.map(mapUbicacion);
}

// GET /equipos/:id → ubicación (SQL) + hardware (Mongo) combinados.
// Si el equipo no existe en SQL → null (404).
// Si existe en SQL pero no en Mongo → devuelve ubicación con hardware: null
//   (maneja la inconsistencia sin romper).
export async function obtenerEquipoCompleto(id) {
  const rows = await querySql(`${SELECT_EQUIPOS} WHERE e.id = @id`, { id });

  if (rows.length === 0) {
    return null; // no existe en SQL
  }

  const ubicacion = mapUbicacion(rows[0]);

  // Usamos el mongo_id para traer el hardware desde MongoDB.
  const coleccion = await getHardwareCollection();
  const hardware = await coleccion.findOne({ _id: ubicacion.mongo_id });

  return {
    ubicacion,
    hardware: hardware ?? null, // null si el equipo no tiene doc en Mongo
  };
}
