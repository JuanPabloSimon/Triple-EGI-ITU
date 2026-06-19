// src/routes/health.routes.js
import { Router } from "express";
import { pingSql } from "../db/sql.js";
import { pingMongo } from "../db/mongo.js";

const router = Router();

// GET /health/live → liveness probe. ¿El proceso está vivo? Siempre 200.
router.get("/live", (_req, res) => {
  res.json({ status: "ok" });
});

// GET /health/ready → readiness probe. ¿Puede atender tráfico?
// Solo 200 si AMBAS bases responden. Si no, 503 y Kubernetes no le manda tráfico.
router.get("/ready", async (_req, res) => {
  const [sql, mongo] = await Promise.all([pingSql(), pingMongo()]);
  const listo = sql && mongo;

  res.status(listo ? 200 : 503).json({
    status: listo ? "ready" : "not-ready",
    dependencias: {
      sqlServer: sql ? "up" : "down",
      mongodb: mongo ? "up" : "down",
    },
  });
});

export default router;
