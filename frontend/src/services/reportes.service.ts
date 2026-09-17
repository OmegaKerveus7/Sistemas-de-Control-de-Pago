import { api } from './api';

export interface ReporteMensual {
  mes: string;
  cantidad_pagos: number;
  total_cobrado: number;
}

export interface ReporteDetallado {
  id: number;
  ticket: string;
  placa: string;
  tipo_vehiculo: string;
  pagador: string;
  metodo: string;
  monto: number;
  estado: string;
  fecha_pago: string;
  lugar: string;
  zona: string;
}

export const reportesService = {
  resumenMensual: () => api.get<ReporteMensual[]>('/pagos/reporte-mensual'),
  detallado: (anio: number, mes: number) =>
    api.get<ReporteDetallado[]>(`/pagos/reporte-detallado`, { params: { anio: String(anio), mes: String(mes) } }),
};
