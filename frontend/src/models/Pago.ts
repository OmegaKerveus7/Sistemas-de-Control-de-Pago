export type MetodoPago = 'efectivo' | 'linea';
export type EstadoPago = 'pendiente' | 'completado' | 'fallido' | 'reembolsado';

export interface Pago {
  id?: number;
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
  fecha_confirmacion?: string;
}

export interface PagoHistorialVehiculo {
  placa: string;
  tipo: string;
  marca: string | null;
  color: string | null;
}

export interface PagoHistorialTicket {
  id_ticket: number;
  numero_ticket: string;
  fecha_entrada: string;
  fecha_salida: string | null;
}

export interface PagoHistorialParqueo {
  id_lugar: number;
  codigo: string;
  zona: string;
}

/** Fila del historial de pagos del usuario (desde sp_historial_pagos_usuario). */
export interface PagoHistorial {
  id: number;
  codigo_validacion: string;
  monto: number;
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago;
  fecha_pago: string;
  fecha_confirmacion?: string | null;
  fecha_autorizacion_salida?: string | null;
  transaction_id?: string | null;
  numero_ticket: string;
  placa: string;
  fecha_entrada: string;
  fecha_salida?: string | null;
  lugar?: string | null;
  zona?: string | null;
  tiempo_estacionado_minutos?: number;
  tiempo_estacionado_texto?: string;
  vehiculo?: PagoHistorialVehiculo | null;
  ticket_detalle?: PagoHistorialTicket | null;
  parqueo_detalle?: PagoHistorialParqueo | null;
}
