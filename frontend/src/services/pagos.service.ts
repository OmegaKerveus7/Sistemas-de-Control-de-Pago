import { api } from './api';
import type { PagoHistorial } from '../models';

export interface Pago {
  id: number;
  /** Null mientras el vehículo no ha entrado (pago del día hecho por adelantado). */
  id_ticket: number | null;
  ticket: string | null;
  placa: string;
  id_usuario: number | null;
  pagador_nombres: string | null;
  pagador_apellidos: string | null;
  nit?: string | null;
  nombre_facturacion?: string | null;
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
  modo: 'mock' | 'sandbox' | 'live';
}

export interface ResultadoConfirmar {
  aprobado: boolean;
  estado: 'pendiente' | 'completado' | 'fallido' | 'reembolsado';
  modo: 'mock' | 'sandbox' | 'live';
  placa: string;
  url_pago?: string;
  monto?: number;
  referencia?: string;
  mensaje?: string;
}

export interface ConsultaPlaca {
  placa: string;
  registrada: boolean;
  id_tipo: number;
  tipo: string;
  tarifa_efectivo: number;
  tarifa_online: number;
  dentro: boolean;
  fecha_vigencia: string;
  pagado_hoy: boolean;
  estado_pago: 'pendiente' | 'completado' | 'fallido' | 'reembolsado' | null;
  pago: { metodo: string; monto: number; fecha: string | null; referencia?: string; nit?: string | null; nombre?: string | null } | null;
}

export interface ReciboPago {
  referencia: string;
  placa: string;
  monto: number;
  metodo: 'linea';
  nit: string | null;
  nombre: string | null;
  fecha_vigencia: string | null;
  fecha_pago: string | null;
}

export interface ResultadoPublico extends ResultadoConfirmar {
  recibo?: ReciboPago;
}

export interface FilaPagoHoy {
  id: number;
  placa: string;
  tipo_vehiculo: string;
  metodo: string;
  monto: number;
  estado: 'pendiente' | 'completado' | 'fallido' | 'reembolsado';
  nit: string | null;
  nombre_facturacion: string | null;
  referencia: string;
  fecha_pago: string;
  fecha_confirmacion: string | null;
  ticket: string | null;
}

export interface EstadoDelDia {
  fecha: string;
  totales: { pagados: number; monto: number; efectivo: number; en_linea: number; pendientes: number; dentro_sin_pago: number };
  pagos: FilaPagoHoy[];
  dentro_sin_pago: { placa: string; ticket: string; lugar: string; zona: string; fecha_entrada: string }[];
}

export const pagosService = {
  listar: () => api.get<Pago[]>('/pagos'),
  obtenerPorId: (id: number) => api.get<Pago>(`/pagos/${id}`),
  obtenerPorTicket: (idTicket: number) => api.get<Pago>(`/pagos/ticket/${idTicket}`),
  reporteMensual: () => api.get<FilaReporteMensual[]>('/pagos/reporte-mensual'),
  registrarEfectivo: (data: { placa: string; id_tipo_vehiculo: number; nit?: string; nombre?: string }) =>
    api.post<{ id: number; monto: number }>('/pagos/efectivo', data),
  misPagos: (filtros?: { fechaInicio?: string; fechaFin?: string }) =>
    api.get<PagoHistorial[]>('/pagos/mis-pagos', {
      params: filtros?.fechaInicio || filtros?.fechaFin
        ? {
            ...(filtros.fechaInicio ? { fecha_inicio: filtros.fechaInicio } : {}),
            ...(filtros.fechaFin ? { fecha_fin: filtros.fechaFin } : {}),
          }
        : undefined,
    }),
  precioPublico: (data: { placa: string; ticket: string }) =>
    api.post<PrecioInfo & { placa: string; ticket: string; fecha_entrada: string }>('/pagos/publico/precio', data),
  crearPublicoTicket: (data: { placa: string; ticket: string; monto_esperado: number }) =>
    api.post<{ url_pago: string; referencia: string; acceso: string; modo: 'sandbox' | 'live' }>('/pagos/publico', data),
  precio: (parqueoId: number) => api.get<PrecioInfo>('/pagos/precio', { params: { parqueo_id: String(parqueoId) } }),
  crear: (data: { parqueo_id: number; monto_esperado: number }) =>
    api.post<{ url_pago: string; referencia: string; modo: 'mock' | 'sandbox' | 'live' }>('/pagos', data),
  confirmar: (referencia: string) => api.get<ResultadoConfirmar>(`/pagos/confirmar/${referencia}`),
  confirmarCompartido: (referencia: string, acceso: string) =>
    api.get<ResultadoConfirmar>(`/pagos/compartido/${encodeURIComponent(referencia)}`, { params: { acceso } }),
  simular: (referencia: string, estado: string) => api.post<ResultadoConfirmar>(`/pagos/simular/${referencia}`, { estado }),
  // Pago público por placa (sin sesión).
  consultarPlaca: (placa: string) => api.get<ConsultaPlaca>(`/publico/pago/placa/${encodeURIComponent(placa)}`),
  crearPublico: (data: { placa: string; nit: string; nombre: string; monto_esperado: number }) =>
    api.post<{ url_pago: string; referencia: string; modo: 'mock' | 'sandbox' | 'live' }>('/publico/pago', data),
  confirmarPublico: (referencia: string) => api.get<ResultadoPublico>(`/publico/pago/${referencia}`),
  simularPublico: (referencia: string, estado: string) => api.post<ResultadoConfirmar>(`/publico/pago/${referencia}/simular`, { estado }),
  // Personal: estado de una placa con referencia y facturación, y resumen del día.
  permisoDePlaca: (placa: string) => api.get<ConsultaPlaca>(`/pagos/permiso/${encodeURIComponent(placa)}`),
  estadoHoy: () => api.get<EstadoDelDia>('/pagos/estado-hoy'),
};
