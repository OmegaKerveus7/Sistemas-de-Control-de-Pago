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

/** Fila del historial de pagos del usuario. */
export interface PagoHistorial {
  id: number;
  codigo_validacion: string;
  monto: number;
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago;
  fecha_pago: string;
  fecha_confirmacion?: string;
  numero_ticket: string;
  placa: string;
  fecha_entrada: string;
  fecha_salida?: string;
  lugar?: string;
  zona?: string;
}
