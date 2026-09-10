import { api } from './api';

export interface Tarifa {
  id_tarifa: number;
  id_tipo_vehiculo: number;
  nom_tipo_vehiculo: string;
  id_tipo_pago: number;
  nom_tipo_pago: string;
  precio: number;
  costo_transaccion: number | null;
  ganancia: number | null;
  activo: boolean;
  fecha_creacion: string;
  fecha_modificacion: string | null;
}

export interface DatosTarifa {
  id_tipo_vehiculo: number;
  id_tipo_pago: number;
  precio: number;
  costo_transaccion: number | null;
}

export const tarifasService = {
  listar: () => api.get<Tarifa[]>('/tarifas'),
  obtenerPorId: (id: number) => api.get<Tarifa>(`/tarifas/${id}`),
  crear: (data: DatosTarifa) => api.post<{ id: number }>('/tarifas', data),
  actualizar: (id: number, data: Partial<DatosTarifa> & { activo?: boolean }) =>
    api.put<void>(`/tarifas/${id}`, data),
};
