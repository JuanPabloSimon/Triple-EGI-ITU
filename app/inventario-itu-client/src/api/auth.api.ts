// src/api/auth.api.ts
import { apiFetch, setToken } from "./client";
import type { Usuario } from "../types";

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

// POST /auth/login → guarda el token y devuelve el usuario.
export async function login(
  username: string,
  password: string,
): Promise<Usuario> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  setToken(data.token);
  return data.usuario;
}

// Cierra sesión: limpia el token local.
export function logout() {
  setToken(null);
}
