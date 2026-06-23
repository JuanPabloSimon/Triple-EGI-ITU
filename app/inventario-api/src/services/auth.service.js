// src/services/auth.service.js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { authenticateLdap as authenticateLdapMock } from "./ldap.mock.js";
import { authenticateLdap as authenticateLdapReal } from "./ldap.real.js";

// Selecciona la implementación de LDAP según LDAP_MODE.
// LDAP_MODE=real → autentica contra Active Directory en dex.local
// LDAP_MODE=mock (default) → lista hardcoded del archivo ldap.mock.js
const authenticateLdap =
  env.ldap.mode === "real" ? authenticateLdapReal : authenticateLdapMock;

console.log(`[auth] Modo LDAP activo: ${env.ldap.mode}`);

// Realiza el login completo:
//   1. Valida credenciales contra LDAP (mock o real, según configuración).
//   2. Si son válidas, emite un JWT firmado con los datos del usuario.
// Devuelve { token, usuario } o null si la autenticación falla.
export async function login(username, password) {
  if (!username || !password) {
    return null;
  }
  const usuario = await authenticateLdap(username, password);
  if (!usuario) {
    return null;
  }
  // El payload del token lleva lo mínimo necesario para autorizar.
  const payload = {
    sub: usuario.username,
    email: usuario.email,
    rol: usuario.rol,
  };
  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
  return { token, usuario };
}

// Verifica y decodifica un token. Devuelve el payload o null si es inválido/expiró.
// Lo usa el middleware de autenticación en cada request protegido.
export function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}
