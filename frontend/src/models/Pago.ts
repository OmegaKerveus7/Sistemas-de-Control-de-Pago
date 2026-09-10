export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';
export type EstadoPago = 'pendiente' | 'completado' | 'reembolsado';

export interface Pago {
  id?: number;
  parqueo_id: number;
  monto: number;
  metodo: MetodoPago;
  estado: EstadoPago;
  referencia?: string;
  ip_inicio?: string;
  ip_pago?: string;
  procesado_por?: number;
  creado_en?: string;
}

/** Fila del historial de pagos del usuario (GET /pagos/mis-pagos). */
export interface PagoHistorial {
  id: number;
  codigo_pago: string;
  monto_total: number;
  comision?: number;
  monto_neto?: number;
  estado_pago: 'completado' | 'fallido' | 'pendiente' | 'reembolso';
  tipo_pago: string;
  fecha_pago: string;
  fecha_confirmacion?: string;
  numero_ticket: string;
  placa: string;
  fecha_entrada: string;
  fecha_salida?: string;
  lugar?: string;
  zona?: string;
}