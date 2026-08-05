export type EstadoParqueo = 'activo' | 'completado' | 'cancelado';

export interface Parqueo {
  id?: number;
  placa: string;
  hora_entrada: string;
  hora_salida?: string;
  costo?: number;
  estado: EstadoParqueo;
  ticket?: string;
  creado_en?: string;
}
