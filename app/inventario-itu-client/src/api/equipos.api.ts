import type { EquipoUbicacion, EquipoCompleto } from "../types";
import { apiFetch } from "./client";
import {
  getEquipos as getMockEquipos,
  getEquipoCompleto as getMockDetalle,
} from "./mockEquipos";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export async function getEquipos(): Promise<EquipoUbicacion[]> {
  if (USE_MOCK) return getMockEquipos();
  return apiFetch<EquipoUbicacion[]>("/equipos");
}

export async function getEquipoCompleto(id: number): Promise<EquipoCompleto> {
  if (USE_MOCK) {
    const data = await getMockDetalle(id);
    if (!data)
      throw Object.assign(new Error("No encontrado."), { status: 404 });
    return data;
  }
  return apiFetch<EquipoCompleto>(`/equipos/${id}`);
}

export async function updateEquipo(
  id: number,
  cambios: {
    estado?: string;
    fecha_mantenimiento?: string | null;
    responsable?: string;
    hardware?: Record<string, unknown>;
  },
): Promise<EquipoCompleto> {
  return apiFetch<EquipoCompleto>(`/equipos/${id}`, {
    method: "PUT",
    body: JSON.stringify(cambios),
  });
}
