// src/db/sql.js
import sql from "mssql";
import { env } from "../config/env.js";

const config = {
  server: env.sql.host,
  port: env.sql.port,
  user: env.sql.user,
  password: env.sql.password,
  database: env.sql.database,
  options: {
    encrypt: env.sql.encrypt,
    trustServerCertificate: env.sql.trustServerCertificate,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

// Devuelve el pool conectado, creándolo la primera vez (singleton).
export async function getSqlPool() {
  if (pool && pool.connected) return pool;

  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log(
      `[sql] Conectado a SQL Server (${env.sql.host}:${env.sql.port}/${env.sql.database})`,
    );

    // Si el pool se cae, lo reseteamos para reconectar en la próxima query.
    pool.on("error", (err) => {
      console.error("[sql] Error en el pool:", err.message);
      pool = null;
    });

    return pool;
  } catch (err) {
    pool = null;
    console.error("[sql] No se pudo conectar:", err.message);
    throw err;
  }
}

// Ejecuta una query parametrizada de forma segura (evita inyección SQL).
// params: objeto { nombre: valor }, se referencian en la query como @nombre.
export async function querySql(queryText, params = {}) {
  const conn = await getSqlPool();
  const request = conn.request();

  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }

  const result = await request.query(queryText);
  return result.recordset;
}

// Verifica que SQL Server responda (para el healthcheck de Kubernetes).
export async function pingSql() {
  try {
    await querySql("SELECT 1 AS ok");
    return true;
  } catch {
    return false;
  }
}

// Cierre ordenado al apagar el contenedor.
export async function closeSql() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log("[sql] Conexión cerrada");
  }
}

// Re-exportamos sql por si se necesitan tipos específicos en queries.
export { sql };
