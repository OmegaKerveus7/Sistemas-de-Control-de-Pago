export type MetodoPago = 'efectivo' | 'linea';
export type EstadoPago = 'pendiente' | 'completado' | 'fallido' | 'reembolsado';

export interface Pago {
  id: number;
  id_ticket: number;
  ticket: string;
  placa: string;
  id_usuario: number;
  pagador_nombres: string;
  pagador_apellidos: string;
  metodo: string;
  monto: number;
  estado: EstadoPago;
  codigo_validacion: string;
  fecha_pago: string;
  fecha_confirmacion: string | null;
}

export interface FilaReporteMensual {
  mes: string;
  cantidad_pagos: number;
  total_cobrado: number;
}

/** Fila del historial de pagos de un usuario (esquema real: Pagos + Tickets). */
export interface PagoHistorial {
  id: number;
  codigo_validacion: string;
  monto: number;
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago;
  fecha_pago: string;
  fecha_confirmacion?: string | null;
  numero_ticket: string;
  placa: string;
  fecha_entrada: string;
  fecha_salida?: string | null;
  lugar?: string | null;
  zona?: string | null;
}
