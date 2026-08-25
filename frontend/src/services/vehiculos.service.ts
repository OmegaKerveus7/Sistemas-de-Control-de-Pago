import { api } from './api';

export type TipoVehiculo = 'automovil' | 'motocicleta' | 'camioneta' | 'otro';

export interface Vehiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  tipo: TipoVehiculo;
  foto?: string;
}

export const vehiculosService = {
  listar: () => api.get<Vehiculo[]>('/vehiculos'),
  obtenerPorId: (id: number) => api.get<Vehiculo>(`/vehiculos/${id}`),
  obtenerPorPlaca: (placa: string) => api.get<Vehiculo>(`/vehiculos/placa/${placa}`),
  buscar: (filtro: string) => api.get<Vehiculo[]>('/vehiculos/buscar', { params: { q: filtro } }),
  crear: (data: Vehiculo) => api.post<{ id: number }>('/vehiculos', data),
  actualizar: (id: number, data: Partial<Vehiculo>) => api.put<void>(`/vehiculos/${id}`, data),
  eliminar: (id: number) => api.delete<void>(`/vehiculos/${id}`),
  vehiculosPorUsuario: (idUsuario: number) => api.get<Vehiculo[]>(`/vehiculos/usuario/${idUsuario}`),
  asignarAUsuario: (idUsuario: number, idVehiculo: number) =>
    api.post<void>('/vehiculos/asignar', { id_usuario: idUsuario, id_vehiculo: idVehiculo }),
  removerDeUsuario: (idUsuario: number, idVehiculo: number) =>
    api.delete<void>(`/vehiculos/usuario/${idUsuario}/${idVehiculo}`),
};
