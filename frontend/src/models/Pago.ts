export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';
export type EstadoPago = 'pendiente' | 'completado' | 'reembolsado';

export interface Pago {
  id?: number;
  parqueo_id: number;
  monto: number;
  metodo: MetodoPago;
  estado: EstadoPago;
  referencia?: string;
  procesado_por?: number;
  creado_en?: string;
}
