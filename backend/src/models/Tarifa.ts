export interface Tarifa {
  id?: number;
  tipo_vehiculo: 'automovil' | 'motocicleta' | 'camioneta' | 'otro';
  costo_por_hora: number;
  costo_maximo_diario?: number;
  activo: boolean;
  creado_en?: Date;
  actualizado_en?: Date;
}
