// src/config/env.js
import dotenv from "dotenv";
dotenv.config();
export const env = {
  // Servidor
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  // Carpeta del frontend buildeado (Vite genera dist/).
  // En el contenedor copiamos el build acá.
  frontendDir: process.env.FRONTEND_DIR || "public",
  // CORS: origen permitido del frontend
  corsOrigin: process.env.CORS_ORIGIN || "*",
  // JWT
  jwtSecret: process.env.JWT_SECRET || "dev-secret-cambiar-en-produccion",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  // SQL Server (ubicacion-db)
  sql: {
    host: process.env.SQL_HOST || "localhost",
    port: Number(process.env.SQL_PORT) || 1433,
    user: process.env.SQL_USER || "sa",
    password: process.env.SQL_PASSWORD || "Password123!",
    database: process.env.SQL_DATABASE || "inventario_ubicacion",
    // En el cluster los certificados son autofirmados.
    encrypt: process.env.SQL_ENCRYPT === "true",
    trustServerCertificate: process.env.SQL_TRUST_CERT !== "false",
  },
  // MongoDB (inventario-db)
  mongo: {
    uri: process.env.MONGO_URI || "mongodb://localhost:27017",
    database: process.env.MONGO_DATABASE || "inventario_hardware",
    collection: process.env.MONGO_COLLECTION || "equipos_hardware",
  },
  // LDAP / Active Directory
  // mode: "real" → conecta contra AD. "mock" (default) → usa ldap.mock.js
  ldap: {
    mode: process.env.LDAP_MODE || "mock",
    url: process.env.LDAP_URL || "ldap://192.168.10.10:389",
    baseDN: process.env.LDAP_BASE_DN || "OU=EGI,DC=dex,DC=local",
    bindDN: process.env.LDAP_BIND_DN || "CN=Servicio pfSense Bind,OU=Servicios,OU=EGI,DC=dex,DC=local",
    bindPassword: process.env.LDAP_BIND_PASSWORD || "",
  },
};
// Aviso temprano si falta algo crítico en producción.
if (env.nodeEnv === "production") {
  const faltantes = [];
  if (!process.env.JWT_SECRET) faltantes.push("JWT_SECRET");
  if (!process.env.SQL_PASSWORD) faltantes.push("SQL_PASSWORD");
  if (env.ldap.mode === "real" && !process.env.LDAP_BIND_PASSWORD) {
    faltantes.push("LDAP_BIND_PASSWORD");
  }
  if (faltantes.length > 0) {
    console.warn(
      `[env] ADVERTENCIA: faltan variables en producción: ${faltantes.join(", ")}`,
    );
  }
}
