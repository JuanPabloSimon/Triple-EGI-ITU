// src/types/index.ts

export type Rol = "alumno" | "docente" | "tecnico" | "admin";

export interface Usuario {
  username: string;
  email: string;
  rol: Rol;
  ldap_dn?: string; // viene del backend; opcional en el front
}

// Datos que vienen de SQL Server
export interface EquipoUbicacion {
  id: number;
  codigo_inventario: string;
  aula: string;
  edificio: string;
  numero_banco: number;
  fecha_mantenimiento: string | null;
  estado: "activo" | "baja" | "mantenimiento";
  mongo_id: string;
  responsable: string | null;
  rol_responsable: Rol | null;
}

// Datos que vienen de MongoDB (forma real del seed de equipos.json)
export interface EquipoHardware {
  _id: string; // formato "EQ-001"
  fabricante: string;
  modelo: string;
  tipo: "desktop" | "laptop";
  cpu: {
    marca: string;
    modelo: string;
    nucleos: number;
    frecuencia_ghz?: number; // presente en el seed, pero por las dudas opcional
  };
  ram_gb: number;
  disco: {
    tipo: string;
    capacidad_gb: number;
  };
  sistema_operativo: string;
  // El seed trae monitor con marca + pulgadas, SIN modelo. Modelo opcional.
  monitor: { marca: string; modelo?: string; pulgadas: number } | null;
  mouse: string | null;
  teclado: string;
  // Solo en laptops
  bateria?: { capacidad_mwh: number; ciclos: number } | null;
  // Solo en algunos equipos (workstations)
  gpu?: { marca: string; modelo: string; vram_gb: number };
}

// El objeto combinado que devuelve GET /equipos/:id
// hardware puede ser null si el equipo está en SQL pero no en Mongo
export interface EquipoCompleto {
  ubicacion: EquipoUbicacion;
  hardware: EquipoHardware | null;
}
