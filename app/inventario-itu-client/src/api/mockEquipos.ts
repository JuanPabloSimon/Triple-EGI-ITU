// src/api/mockEquipos.ts
import type { EquipoUbicacion, EquipoHardware, EquipoCompleto } from "../types";

// Simula la latencia de SQL Server / MongoDB.
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// === Datos que vendrían de SQL Server (ubicación) ===
const UBICACIONES: EquipoUbicacion[] = [
  {
    id: 1,
    codigo_inventario: "ITU-PC-0001",
    aula: "Lab 1",
    edificio: "Bloque A",
    numero_banco: 1,
    fecha_mantenimiento: "2026-03-15",
    estado: "activo",
    mongo_id: "hw_0001",
    responsable: "jtecnico",
    rol_responsable: "tecnico",
  },
  {
    id: 2,
    codigo_inventario: "ITU-PC-0002",
    aula: "Lab 1",
    edificio: "Bloque A",
    numero_banco: 2,
    fecha_mantenimiento: "2026-03-15",
    estado: "activo",
    mongo_id: "hw_0002",
    responsable: "jtecnico",
    rol_responsable: "tecnico",
  },
  {
    id: 3,
    codigo_inventario: "ITU-PC-0003",
    aula: "Lab 2",
    edificio: "Bloque A",
    numero_banco: 1,
    fecha_mantenimiento: null,
    estado: "mantenimiento",
    mongo_id: "hw_0003",
    responsable: "mdocente",
    rol_responsable: "docente",
  },
  {
    id: 4,
    codigo_inventario: "ITU-PC-0004",
    aula: "Lab 2",
    edificio: "Bloque A",
    numero_banco: 2,
    fecha_mantenimiento: "2025-11-20",
    estado: "activo",
    mongo_id: "hw_0004",
    responsable: null,
    rol_responsable: null,
  },
  {
    id: 5,
    codigo_inventario: "ITU-PC-0005",
    aula: "Lab 3",
    edificio: "Bloque B",
    numero_banco: 1,
    fecha_mantenimiento: "2026-01-10",
    estado: "activo",
    mongo_id: "hw_0005",
    responsable: "aalumno",
    rol_responsable: "alumno",
  },
  {
    id: 6,
    codigo_inventario: "ITU-NB-0006",
    aula: "Lab 3",
    edificio: "Bloque B",
    numero_banco: 2,
    fecha_mantenimiento: null,
    estado: "baja",
    mongo_id: "hw_0006",
    responsable: null,
    rol_responsable: null,
  },
];

// === Datos que vendrían de MongoDB (hardware) ===
const HARDWARE: EquipoHardware[] = [
  {
    _id: "hw_0001",
    fabricante: "Dell",
    modelo: "OptiPlex 7090",
    tipo: "desktop",
    cpu: {
      marca: "Intel",
      modelo: "Core i5-11500",
      nucleos: 6,
      frecuencia_ghz: 2.7,
    },
    ram_gb: 16,
    disco: { tipo: "SSD", capacidad_gb: 512 },
    sistema_operativo: "Windows 11 Pro",
    monitor: { marca: "Dell", modelo: "P2422H", pulgadas: 24 },
    mouse: "Dell MS116",
    teclado: "Dell KB216",
    bateria: null,
  },
  {
    _id: "hw_0002",
    fabricante: "HP",
    modelo: "ProDesk 400 G7",
    tipo: "desktop",
    cpu: {
      marca: "Intel",
      modelo: "Core i3-10100",
      nucleos: 4,
      frecuencia_ghz: 3.6,
    },
    ram_gb: 8,
    disco: { tipo: "HDD", capacidad_gb: 1000 },
    sistema_operativo: "Windows 10 Pro",
    monitor: { marca: "HP", modelo: "V24i", pulgadas: 24 },
    mouse: "HP 125",
    teclado: "HP 125",
    bateria: null,
  },
  {
    _id: "hw_0003",
    fabricante: "Lenovo",
    modelo: "ThinkCentre M70q",
    tipo: "desktop",
    cpu: {
      marca: "Intel",
      modelo: "Core i5-10400T",
      nucleos: 6,
      frecuencia_ghz: 2.0,
    },
    ram_gb: 16,
    disco: { tipo: "SSD", capacidad_gb: 256 },
    sistema_operativo: "Ubuntu 24.04 LTS",
    monitor: { marca: "Lenovo", modelo: "ThinkVision T24i", pulgadas: 24 },
    mouse: "Lenovo 540",
    teclado: "Lenovo 540",
    bateria: null,
  },
  {
    _id: "hw_0004",
    fabricante: "Dell",
    modelo: "OptiPlex 3080",
    tipo: "desktop",
    cpu: {
      marca: "Intel",
      modelo: "Core i3-10105",
      nucleos: 4,
      frecuencia_ghz: 3.7,
    },
    ram_gb: 8,
    disco: { tipo: "SSD", capacidad_gb: 256 },
    sistema_operativo: "Windows 11 Pro",
    monitor: null,
    mouse: null,
    teclado: "Genérico USB",
    bateria: null,
  },
  {
    _id: "hw_0005",
    fabricante: "Lenovo",
    modelo: "ThinkPad E14",
    tipo: "laptop",
    cpu: {
      marca: "AMD",
      modelo: "Ryzen 5 5500U",
      nucleos: 6,
      frecuencia_ghz: 2.1,
    },
    ram_gb: 16,
    disco: { tipo: "SSD", capacidad_gb: 512 },
    sistema_operativo: "Windows 11 Pro",
    monitor: null,
    mouse: null,
    teclado: "Integrado",
    bateria: { capacidad_mwh: 57000, ciclos: 124 },
  },
  {
    _id: "hw_0006",
    fabricante: "HP",
    modelo: "Pavilion 15",
    tipo: "laptop",
    cpu: {
      marca: "Intel",
      modelo: "Core i5-8250U",
      nucleos: 4,
      frecuencia_ghz: 1.6,
    },
    ram_gb: 8,
    disco: { tipo: "HDD", capacidad_gb: 1000 },
    sistema_operativo: "Windows 10 Home",
    monitor: null,
    mouse: null,
    teclado: "Integrado",
    bateria: { capacidad_mwh: 41000, ciclos: 892 },
  },
];

// === "Endpoints" simulados ===

// GET /equipos  → solo la ubicación (lo que muestra el dashboard).
export async function getEquipos(): Promise<EquipoUbicacion[]> {
  await delay(500);
  return UBICACIONES;
}

// GET /equipos/:id  → combina SQL (ubicación) + Mongo (hardware).
export async function getEquipoCompleto(
  id: number,
): Promise<EquipoCompleto | null> {
  await delay(500);

  const ubicacion = UBICACIONES.find((u) => u.id === id);
  if (!ubicacion) return null;

  const hardware = HARDWARE.find((h) => h._id === ubicacion.mongo_id);
  if (!hardware) return null;

  return { ubicacion, hardware };
}
