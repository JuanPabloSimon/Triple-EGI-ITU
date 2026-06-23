// src/api/client.ts

// En arquitectura A (API sirve el front), usamos rutas relativas:
// el navegador pega al mismo origen que sirvió la web.
// Se puede sobreescribir con VITE_API_URL para desarrollo con backend aparte.
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const TOKEN_KEY = "inventario_token";

// --- Manejo del token en memoria + sessionStorage ---
// (sessionStorage para que sobreviva un refresh, pero no quede para siempre)
let tokenEnMemoria: string | null = null;

export function setToken(token: string | null) {
  tokenEnMemoria = token;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Si sessionStorage no está disponible, seguimos solo con memoria.
  }
}

export function getToken(): string | null {
  if (tokenEnMemoria) return tokenEnMemoria;
  try {
    tokenEnMemoria = sessionStorage.getItem(TOKEN_KEY);
  } catch {
    tokenEnMemoria = null;
  }
  return tokenEnMemoria;
}

// Error tipado para distinguir códigos HTTP en las vistas.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// Wrapper central de fetch: agrega JSON headers, el token, y parsea errores.
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    // Falla de red (servidor caído, sin conexión, etc.)
    throw new ApiError(0, "No se pudo conectar con el servidor.");
  }

  // Intentamos parsear el cuerpo como JSON (puede no haberlo).
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const mensaje =
      (data as { error?: string })?.error ?? `Error ${res.status}`;
    throw new ApiError(res.status, mensaje);
  }

  return data as T;
}
