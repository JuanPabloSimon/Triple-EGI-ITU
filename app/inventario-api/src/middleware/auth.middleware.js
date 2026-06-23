// src/middleware/auth.middleware.js
import { verifyToken } from "../services/auth.service.js";

// Protege rutas: exige un JWT válido en el header Authorization.
// Si es válido, adjunta el payload decodificado a req.usuario y continúa.
// Si falta o es inválido, corta con 401.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado." });
  }

  const token = header.slice(7); // quita "Bearer "
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }

  req.usuario = payload; // { sub, email, rol }
  next();
}

// Opcional: restringe una ruta a ciertos roles.
// Uso: router.get("/admin", requireAuth, requireRol("admin"), handler)
export function requireRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res
        .status(403)
        .json({ error: "No tenés permisos para esta acción." });
    }
    next();
  };
}
