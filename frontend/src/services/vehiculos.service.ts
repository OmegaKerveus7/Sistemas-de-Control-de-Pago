import { api } from './api';
import type { Marca, TipoVehiculoCatalogo, VehiculoConDueno } from '../models';

export const vehiculosService = {
  listar: () => api.get<VehiculoConDueno[]>('/vehiculos'),
  obtenerPorPlaca: (placa: string) => api.get<VehiculoConDueno>(`/vehiculos/placa/${placa}`),
  buscar: (filtro: string) => api.get<VehiculoConDueno[]>('/vehiculos/buscar', { params: { q: filtro } }),
  tiposVehiculo: () => api.get<TipoVehiculoCatalogo[]>('/vehiculos/tipos'),
  marcasPorTipo: () => api.get<Array<{ tipo_vehiculo: string; marcas: Marca[] }>>('/vehiculos/marcas'),
  crear: (data: { placa: string; id_usuario: number; id_tipo: number; id_marca?: number; color?: string }) =>
    api.post<{ mensaje?: string; data?: unknown }>('/vehiculos', data),
  actualizar: (placa: string, data: Partial<{ id_usuario: number; id_tipo: number; id_marca: number; color: string; activo: boolean }>) =>
    api.put<{ mensaje?: string; data?: unknown }>(`/vehiculos/${placa}`, data),
  eliminar: (placa: string) => api.delete<{ mensaje?: string; data?: unknown }>(`/vehiculos/${placa}`),
  vehiculosPorUsuario: (idUsuario: number) => api.get<import('../models').Vehiculo[]>(`/vehiculos/usuario/${idUsuario}`),
};
