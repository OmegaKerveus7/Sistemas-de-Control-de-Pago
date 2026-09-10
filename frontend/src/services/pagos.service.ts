import { api } from './api';
import type { PagoHistorial } from '../models';

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
  estado: 'pendiente' | 'completado' | 'fallido' | 'reembolsado';
  codigo_validacion: string;
  fecha_pago: string;
  fecha_confirmacion: string | null;
}

export interface FilaReporteMensual {
  mes: string;
  cantidad_pagos: number;
  total_cobrado: number;
}

export interface PrecioInfo {
  efectivo: number;
  online: number;
}

export interface ResultadoConfirmar {
  aprobado: boolean;
  monto?: number;
  referencia?: string;
  mensaje?: string;
}

export const pagosService = {
  listar: () => api.get<Pago[]>('/pagos'),
  obtenerPorId: (id: number) => api.get<Pago>(`/pagos/${id}`),
  obtenerPorTicket: (idTicket: number) => api.get<Pago>(`/pagos/ticket/${idTicket}`),
  reporteMensual: () => api.get<FilaReporteMensual[]>('/pagos/reporte-mensual'),
  registrarEfectivo: (data: { placa: string; id_tipo_vehiculo: number }) =>
    api.post<{ id: number; monto: number }>('/pagos/efectivo', data),
  misPagos: () => api.get<PagoHistorial[]>('/pagos/mis-pagos'),
  precio: (tipo: string) => api.get<PrecioInfo>('/pagos/precio', { params: { tipo } }),
  crear: (data: { parqueo_id: number; tipo_vehiculo: string; metodo: string }) =>
    api.post<{ url_pago: string }>('/pagos', data),
  confirmar: (referencia: string) => api.get<ResultadoConfirmar>(`/pagos/confirmar/${referencia}`),
};
