export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';
export type EstadoPago = 'pendiente' | 'completado' | 'fallido' | 'reembolso';

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
  codigo_pago: string;
  fecha_pago: string;
  fecha_confirmacion: string | null;
  id_guardia: number | null;
  guardia_nombres: string | null;
  guardia_apellidos: string | null;
}

export interface FilaReporteMensual {
  mes: string;
  cantidad_pagos: number;
  total_cobrado: number;
}

// Legacy: usados por el flujo de pago en línea (pasarela), que sigue apuntando a un esquema viejo.
export interface PagoLegacy {
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
