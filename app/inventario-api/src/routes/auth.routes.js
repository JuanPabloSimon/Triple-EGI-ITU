// src/routes/auth.routes.js
import { Router } from "express";
import { login } from "../services/auth.service.js";

const router = Router();

// POST /auth/login  { username, password }
// Devuelve { token, usuario } si las credenciales son válidas.
router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Usuario y contraseña son requeridos." });
  }

  try {
    const resultado = await login(username, password);

    if (!resultado) {
      // 401: credenciales inválidas (no distinguimos usuario de password, por seguridad).
      return res
        .status(401)
        .json({ error: "Usuario o contraseña incorrectos." });
    }

    return res.json(resultado); // { token, usuario }
  } catch (err) {
    console.error("[auth] Error en login:", err.message);
    return res.status(500).json({ error: "Error interno al autenticar." });
  }
});

export default router;
