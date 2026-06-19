// src/types/index.ts

export type Rol = "alumno" | "docente" | "tecnico" | "admin";

export interface Usuario {
  username: string;
  email: string;
  rol: Rol;
}

// Datos que vendran de sql server
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

// Datros que vendran de Mongo
export interface EquipoHardware {
  _id: string;
  fabricante: string;
  modelo: string;
  tipo: "desktop" | "laptop";
  cpu: {
    marca: string;
    modelo: string;
    nucleos: number;
    frecuencia_ghz: number;
  };
  ram_gb: number;
  disco: {
    tipo: string;
    capacidad_gb: number;
  };
  sistema_operativo: string;
  monitor: { marca: string; modelo: string; pulgadas: number } | null;
  mouse: string | null;
  teclado: string;
  bateria: { capacidad_mwh: number; ciclos: number } | null;
}

// El objeto combinado que usa la pagina de detalles
export interface EquipoCompleto {
  ubicacion: EquipoUbicacion;
  hardware: EquipoHardware;
}
