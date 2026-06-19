// src/server.js
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeSql } from "./db/sql.js";
import { closeMongo } from "./db/mongo.js";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(
    `[server] inventario-api escuchando en el puerto ${env.port} (${env.nodeEnv})`,
  );
});

// Apagado ordenado: Kubernetes envía SIGTERM antes de matar el pod.
// Cerramos conexiones a las bases para no dejar sockets colgados.
async function apagar(signal) {
  console.log(`[server] Recibido ${signal}, cerrando...`);
  server.close(async () => {
    await closeSql();
    await closeMongo();
    console.log("[server] Cierre completo. Adiós.");
    process.exit(0);
  });

  // Si no cierra en 10s, forzamos la salida.
  setTimeout(() => {
    console.error("[server] Cierre forzado por timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => apagar("SIGTERM"));
process.on("SIGINT", () => apagar("SIGINT"));
