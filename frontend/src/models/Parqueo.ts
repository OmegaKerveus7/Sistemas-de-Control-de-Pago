export type EstadoParqueo = 'activo' | 'completado' | 'cancelado';

export interface Parqueo {
  id?: number;
  placa: string;
  num_parqueo: string;
  hora_entrada: string;
  hora_salida?: string;
  costo?: number;
  estado: EstadoParqueo;
  ticket?: string;
  creado_en?: string;
}

export interface ParqueoHistorial {
  id_historial: number;
  id_parqueo: number;
  placa: string;
  num_parqueo: string;
  fecha: string;
  hora_entrada: string;
  hora_salida?: string;
  costo?: number;
  estado: string;
  ticket?: string;
}
