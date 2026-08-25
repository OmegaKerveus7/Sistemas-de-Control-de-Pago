import { api } from './api';

export type EstadoParqueo = 'activo' | 'completado' | 'cancelado';

export interface Parqueo {
  id: number;
  placa: string;
  num_parqueo: string;
  hora_entrada: string;
  hora_salida?: string;
  costo?: number;
  estado: EstadoParqueo;
  ticket?: string;
}

export interface ParqueoHistorial {
  id_historial: number;
  id_parqueo: number;
  placa: string;
  num_parqueo: string;
  fecha: string;
  hora_entrada: string;
  hora_salida?: string;
  costo?: number;
  estado: string;
  ticket?: string;
}

export const parqueoService = {
  listar: () => api.get<Parqueo[]>('/parqueo'),
  obtenerPorId: (id: number) => api.get<Parqueo>(`/parqueo/${id}`),
  obtenerActivoPorPlaca: (placa: string) => api.get<Parqueo>(`/parqueo/placa/${placa}`),
  historialPorPlaca: (placa: string, fechaInicio: string, fechaFin: string) =>
    api.get<ParqueoHistorial[]>(`/parqueo/historial/${placa}`, {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
    }),
  registrarEntrada: (placa: string, numParqueo: string) =>
    api.post<{ id: number }>('/parqueo/entrada', { placa, num_parqueo: numParqueo }),
  registrarSalida: (id: number, costo: number) => api.put<void>(`/parqueo/${id}/salida`, { costo }),
  cancelar: (id: number) => api.put<void>(`/parqueo/${id}/cancelar`, {}),
};
