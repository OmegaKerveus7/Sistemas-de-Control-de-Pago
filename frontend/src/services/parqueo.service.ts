import { api } from './api';

export type EstadoParqueo = 'activo' | 'completado' | 'cancelado';

export interface Parqueo {
  id: number;
  placa: string;
  hora_entrada: string;
  hora_salida?: string;
  costo?: number;
  estado: EstadoParqueo;
  ticket?: string;
}

export const parqueoService = {
  listar: () => api.get<Parqueo[]>('/parqueo'),
  obtenerPorId: (id: number) => api.get<Parqueo>(`/parqueo/${id}`),
  obtenerActivoPorPlaca: (placa: string) => api.get<Parqueo>(`/parqueo/placa/${placa}`),
  registrarEntrada: (placa: string) => api.post<{ id: number }>('/parqueo/entrada', { placa }),
  registrarSalida: (id: number, costo: number) => api.put<void>(`/parqueo/${id}/salida`, { costo }),
  cancelar: (id: number) => api.put<void>(`/parqueo/${id}/cancelar`, {}),
};
