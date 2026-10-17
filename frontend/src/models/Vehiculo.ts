export interface Marca {
  id_marca: number;
  nombre: string;
}

export interface TipoVehiculoCatalogo {
  id_tipo: number;
  nombre: string;
  precio_efectivo: number;
  precio_linea: number;
}

export interface Vehiculo {
  placa: string;
  id_usuario: number;
  id_tipo: number;
  id_marca?: number;
  color?: string;
  modelo?: string;
  activo?: boolean;
  tipo?: string;
  marca?: string;
}

export interface VehiculoConDueno {
  placa: string;
  id_tipo: number;
  tipo: string | null;
  marca: string | null;
  color: string | null;
  modelo: string | null;
  activo: boolean;
  id_dueno: number | null;
  dueno_nombres: string | null;
  dueno_apellidos: string | null;
  dueno_dpi: string | null;
  dueno_email: string | null;
}

export interface ResultadoVehiculo {
  mensaje?: string;
  data?: unknown;
}
