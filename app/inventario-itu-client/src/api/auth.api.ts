// src/api/auth.api.ts
import type { Usuario } from "../types";
import { apiFetch, setToken } from "./client";
import { authenticate } from "./mockUsers";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export async function login(
  username: string,
  password: string,
): Promise<Usuario> {
  if (USE_MOCK) {
    const res = await authenticate(username, password);
    if (!res.ok || !res.usuario)
      throw new Error(res.error ?? "Credenciales inválidas.");
    setToken("mock-token");
    return res.usuario;
  }
  const data = await apiFetch<{ token: string; usuario: Usuario }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
  );
  setToken(data.token);
  return data.usuario;
}

export function logout() {
  setToken(null);
}
