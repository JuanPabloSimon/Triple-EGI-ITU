// src/api/mockUsers.ts
import type { Usuario, Rol } from "../types";

// Simula el directorio LDAP/Active Directory institucional.
// En producción esto lo reemplaza una llamada al ldap-service.
interface MockUserRecord extends Usuario {
  password: string;
}

const MOCK_USERS: MockUserRecord[] = [
  {
    username: "admin",
    password: "admin123",
    email: "admin@itu.edu.ar",
    rol: "admin",
  },
  {
    username: "jtecnico",
    password: "tecnico123",
    email: "jtecnico@itu.edu.ar",
    rol: "tecnico",
  },
  {
    username: "mdocente",
    password: "docente123",
    email: "mdocente@itu.edu.ar",
    rol: "docente",
  },
  {
    username: "aalumno",
    password: "alumno123",
    email: "aalumno@itu.edu.ar",
    rol: "alumno",
  },
];

export interface AuthResult {
  ok: boolean;
  usuario?: Usuario;
  error?: string;
}

// Simula la latencia de una consulta real al servidor LDAP.
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function authenticate(
  username: string,
  password: string,
): Promise<AuthResult> {
  await delay(600);

  const record = MOCK_USERS.find((u) => u.username === username);

  if (!record || record.password !== password) {
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  // No devolvemos el password al resto de la app.
  const { password: _, ...usuario } = record;
  return { ok: true, usuario };
}

// Útil para mostrar credenciales de prueba en pantalla durante el desarrollo.
export const CREDENCIALES_DEMO: {
  rol: Rol;
  username: string;
  password: string;
}[] = MOCK_USERS.map((u) => ({
  rol: u.rol,
  username: u.username,
  password: u.password,
}));
