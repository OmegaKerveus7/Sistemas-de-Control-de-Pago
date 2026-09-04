import { api } from './api';

export interface ResumenZonaGuardian {
  id: number;
  zona: string;
  total: number | string;
  disponibles: number | string;
  ocupados: number | string;
}

export interface ResumenGuardian {
  total: number | string;
  disponibles: number | string;
  ocupados: number | string;
  por_zona: ResumenZonaGuardian[];
}

export interface EstadisticasGuardian {
  vehiculos_activos: number | string;
  entradas_hoy: number | string;
  salidas_hoy: number | string;
  pagos_pendientes: number | string;
  sin_pago: number | string;
}

export interface LugarGuardian {
  id: number;
  lugar: string;
  zona_id: number;
  zona: string;
  estado: 'disponible' | 'ocupado' | 'extra' | string;
  color?: string | null;
  ticket?: string | null;
  placa?: string | null;
}

export interface CriterioGuardian {
  placa?: string;
  ticket?: string;
  referencia?: string;
  qr?: string;
}

export interface BusquedaGuardian {
  id_ticket: number;
  numero_ticket: string;
  placa: string;
  lugar: string;
  zona: string;
  tipo_vehiculo?: string | null;
  pago_id?: number | null;
  pago_estado?: string | null;
  pago_completado: number | boolean;
  autorizado?: boolean;
  mensaje?: string;
}

export interface EntradaGuardian {
  id_ticket: number;
  ticket: string;
  placa: string;
  tipo_vehiculo: string;
  es_externo: boolean;
  lugar: { id: number; numero: string; zona: string };
}

export interface SalidaGuardian {
  mensaje: string;
  ticket: string;
  placa: string;
  lugar: string;
  zona: string;
  monto_pagado: number | string;
}

export const guardianService = {
  resumen: () => api.get<ResumenGuardian>('/guardian/resumen'),
  estadisticas: () => api.get<EstadisticasGuardian>('/guardian/estadisticas'),
  lugares: () => api.get<LugarGuardian[]>('/guardian/lugares'),
  entrada: (placa: string, tipo?: 'moto' | 'carro') => api.post<EntradaGuardian>('/guardian/entrada', { placa, tipo }),
  buscar: (criterio: CriterioGuardian) => api.post<BusquedaGuardian>('/guardian/buscar', criterio),
  validarPago: (criterio: CriterioGuardian) => api.post<BusquedaGuardian>('/guardian/validar-pago', criterio),
  salida: (criterio: CriterioGuardian) => api.post<SalidaGuardian>('/guardian/salida', criterio),
};
