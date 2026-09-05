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
