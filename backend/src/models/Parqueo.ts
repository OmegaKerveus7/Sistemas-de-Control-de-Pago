export type EstadoParqueo = 'activo' | 'completado' | 'cancelado';

export interface Parqueo {
  id?: number;
  placa: string;
  num_parqueo: string;
  hora_entrada: Date;
  hora_salida?: Date;
  costo?: number;
  estado: EstadoParqueo;
  ticket?: string;
  creado_en?: Date;
  actualizado_en?: Date;
}
