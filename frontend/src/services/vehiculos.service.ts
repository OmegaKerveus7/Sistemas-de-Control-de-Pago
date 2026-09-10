import { api } from './api';
import type { VehiculoConDueno } from '../models';

export const vehiculosService = {
  listar: () => api.get<VehiculoConDueno[]>('/vehiculos'),
  obtenerPorPlaca: (placa: string) => api.get<VehiculoConDueno>(`/vehiculos/placa/${placa}`),
  buscar: (filtro: string) => api.get<VehiculoConDueno[]>('/vehiculos/buscar', { params: { q: filtro } }),
  crear: (data: { placa: string; id_usuario: number; id_tipo: number; id_marca?: number; color?: string }) =>
    api.post<{ placa: string }>('/vehiculos', data),
  actualizar: (placa: string, data: Partial<{ id_usuario: number; id_tipo: number; id_marca: number; color: string; activo: boolean }>) =>
    api.put<void>(`/vehiculos/${placa}`, data),
  eliminar: (placa: string) => api.delete<void>(`/vehiculos/${placa}`),
  vehiculosPorUsuario: (idUsuario: number) => api.get<import('../models').Vehiculo[]>(`/vehiculos/usuario/${idUsuario}`),
};
