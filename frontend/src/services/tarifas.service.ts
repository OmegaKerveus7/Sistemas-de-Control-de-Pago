import { api } from './api';

export interface Tarifa {
  id_tarifa: number;
  tipo_vehiculo: string;
  precio_efectivo: number;
  precio_linea: number;
  diferencia: number;
}

export interface DatosTarifa {
  id_tipo_vehiculo: number;
  precio_efectivo: number;
  precio_linea: number;
}

export const tarifasService = {
  listar: () => api.get<Tarifa[]>('/tarifas'),
  obtenerPorId: (id: number) => api.get<Tarifa>(`/tarifas/${id}`),
  crear: (data: DatosTarifa) => api.post<{ id: number }>('/tarifas', data),
  actualizar: (id: number, data: Partial<DatosTarifa>) =>
    api.put<void>(`/tarifas/${id}`, data),
};
