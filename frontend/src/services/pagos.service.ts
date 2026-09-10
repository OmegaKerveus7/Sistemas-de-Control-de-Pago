import { api } from './api';

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

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
  estado: 'pendiente' | 'completado' | 'fallido' | 'reembolso';
  codigo_pago: string;
  fecha_pago: string;
  fecha_confirmacion: string | null;
  id_guardia: number | null;
  guardia_nombres: string | null;
  guardia_apellidos: string | null;
}

export interface PrecioInfo {
  tipo: string;
  online: number;
}

export interface ResultadoCrearPago {
  id: number;
  monto: number;
  referencia: string;
  url_pago: string;
}

export interface ResultadoConfirmar {
  aprobado: boolean;
  id?: number;
  monto?: number;
  referencia: string;
  mensaje?: string;
  ya_confirmado?: boolean;
}

export interface FilaReporteMensual {
  mes: string;
  cantidad_pagos: number;
  total_cobrado: number;
}

export const pagosService = {
  listar: () => api.get<Pago[]>('/pagos'),
  obtenerPorId: (id: number) => api.get<Pago>(`/pagos/${id}`),
  obtenerPorTicket: (idTicket: number) => api.get<Pago>(`/pagos/ticket/${idTicket}`),
  reporteMensual: () => api.get<FilaReporteMensual[]>('/pagos/reporte-mensual'),
  registrarEfectivo: (data: { placa: string; id_tipo_vehiculo: number }) =>
    api.post<{ id: number; monto: number }>('/pagos/efectivo', data),

  // Legacy: flujo de pago en línea (pasarela), usado por PagarParqueo
  precio: (tipo: string) => api.get<PrecioInfo>(`/pagos/precio?tipo=${encodeURIComponent(tipo)}`),
  crear: (data: { parqueo_id: number; tipo_vehiculo: string; metodo: MetodoPago }) =>
    api.post<ResultadoCrearPago>('/pagos', data),
  confirmar: (referencia: string) =>
    api.get<ResultadoConfirmar>(`/pagos/confirmar?referencia=${encodeURIComponent(referencia)}`),
};
