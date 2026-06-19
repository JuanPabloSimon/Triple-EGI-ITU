// src/api/equipos.api.ts
import { apiFetch } from "./client";
import type { EquipoUbicacion, EquipoCompleto } from "../types";

// GET /equipos → lista de ubicaciones (SQL Server).
export async function getEquipos(): Promise<EquipoUbicacion[]> {
  return apiFetch<EquipoUbicacion[]>("/equipos");
}

// GET /equipos/:id → ubicación (SQL) + hardware (Mongo) combinados.
export async function getEquipoCompleto(id: number): Promise<EquipoCompleto> {
  return apiFetch<EquipoCompleto>(`/equipos/${id}`);
}
