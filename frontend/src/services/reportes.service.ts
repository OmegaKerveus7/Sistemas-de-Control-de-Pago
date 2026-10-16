import { api } from './api';

export interface ReporteMensual {
  mes: string;
  cantidad_pagos: number;
  total_cobrado: number;
}

export interface ReporteDetallado {
  id: number;
  /** Null mientras el vehículo no ha entrado (pago hecho por adelantado). */
  id_ticket: number | null;
  ticket: string;
  placa: string;
  tipo_vehiculo: string;
  pagador: string;
  nombre_completo: string;
  dpi: string;
  metodo: string;
  monto: number;
  estado: string;
  fecha_pago: string;
  /** Datos del recibo con los que se emitió el pago; null en pagos anteriores a esta función. */
  nit: string | null;
  nombre_facturacion: string | null;
  lugar: string;
  zona: string;
}

export const reportesService = {
  resumenMensual: () => api.get<ReporteMensual[]>('/pagos/reporte-mensual'),
  detallado: (anio: number, mes: number) =>
    api.get<ReporteDetallado[]>(`/pagos/reporte-detallado`, { params: { anio: String(anio), mes: String(mes) } }),
};
