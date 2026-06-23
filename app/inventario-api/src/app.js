// src/app.js
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";
import equiposRoutes from "./routes/equipos.routes.js";
import healthRoutes from "./routes/health.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Middlewares globales
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  // Log simple de requests (útil para la demo en consola).
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // === Rutas de la API ===
  app.use("/health", healthRoutes);
  app.use("/auth", authRoutes);
  app.use("/equipos", equiposRoutes);

  // === Frontend estático (arquitectura A) ===
  // Resolvemos la carpeta del build relativa a src/.
  const frontendPath = path.resolve(__dirname, "..", env.frontendDir);

  // Sirve los archivos del build (JS, CSS, assets).
  app.use(express.static(frontendPath));

  // Fallback SPA: cualquier ruta que no sea API ni archivo existente
  // devuelve index.html, para que React Router maneje el ruteo del cliente.
  app.get(/^(?!\/(api|auth|equipos|health)).*/, (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });

  // 404 para rutas de API no encontradas (JSON, no HTML).
  app.use((_req, res) => {
    res.status(404).json({ error: "Ruta no encontrada." });
  });

  // Manejador de errores global.
  app.use((err, _req, res, _next) => {
    console.error("[app] Error no manejado:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  });

  return app;
}
