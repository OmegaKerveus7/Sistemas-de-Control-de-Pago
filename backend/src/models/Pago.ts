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
  creado_en?: Date;
}

export interface FilaReporteMensual {
  mes: string;
  cantidad_pagos: number;
  total_cobrado: number;
}

/** Fila del historial de pagos de un usuario (esquema real: Pagos + Tickets + Tipos_pagos). */
export interface PagoHistorial {
  id: number;
  codigo_pago: string;
  monto_total: number;
  comision?: number | null;
  monto_neto?: number | null;
  estado_pago: 'completado' | 'fallido' | 'pendiente' | 'reembolso';
  tipo_pago: string;
  fecha_pago: string;
  fecha_confirmacion?: string | null;
  numero_ticket: string;
  placa: string;
  fecha_entrada: string;
  fecha_salida?: string | null;
  lugar?: string | null;
  zona?: string | null;
}
