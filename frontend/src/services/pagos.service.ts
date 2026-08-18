import { api } from './api';

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Pago {
  id: number;
  parqueo_id: number;
  monto: number;
  metodo: MetodoPago;
  estado: 'pendiente' | 'completado' | 'reembolsado';
  referencia?: string;
  ip_inicio?: string;
  ip_pago?: string;
  procesado_por?: number;
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
  obtenerPorParqueo: (parqueoId: number) => api.get<Pago>(`/pagos/parqueo/${parqueoId}`),
  precio: (tipo: string) => api.get<PrecioInfo>(`/pagos/precio?tipo=${encodeURIComponent(tipo)}`),
  crear: (data: { parqueo_id: number; tipo_vehiculo: string; metodo: MetodoPago }) =>
    api.post<ResultadoCrearPago>('/pagos', data),
  confirmar: (referencia: string) =>
    api.get<ResultadoConfirmar>(`/pagos/confirmar?referencia=${encodeURIComponent(referencia)}`),
  reporteMensual: () => api.get<FilaReporteMensual[]>('/pagos/reporte-mensual'),
};