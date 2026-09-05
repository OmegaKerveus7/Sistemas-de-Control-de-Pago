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

export interface VehiculoConDueno {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  color: string | null;
  año: number | null;
  tipo: string;
  activo: boolean;
  id_dueno: number;
  dueno_nombres: string;
  dueno_apellidos: string;
  dueno_dpi: string;
  dueno_email: string;
}

export const vehiculosService = {
  listar: () => api.get<VehiculoConDueno[]>('/vehiculos'),
  obtenerPorId: (id: number) => api.get<VehiculoConDueno>(`/vehiculos/${id}`),
  obtenerPorPlaca: (placa: string) => api.get<VehiculoConDueno>(`/vehiculos/placa/${placa}`),
  buscar: (filtro: string) => api.get<VehiculoConDueno[]>('/vehiculos/buscar', { params: { q: filtro } }),
  crear: (data: Vehiculo) => api.post<{ id: number }>('/vehiculos', data),
  actualizar: (id: number, data: Partial<Vehiculo>) => api.put<void>(`/vehiculos/${id}`, data),
  eliminar: (id: number) => api.delete<void>(`/vehiculos/${id}`),
  vehiculosPorUsuario: (idUsuario: number) => api.get<Vehiculo[]>(`/vehiculos/usuario/${idUsuario}`),
  asignarAUsuario: (idUsuario: number, idVehiculo: number) =>
    api.post<void>('/vehiculos/asignar', { id_usuario: idUsuario, id_vehiculo: idVehiculo }),
  removerDeUsuario: (idUsuario: number, idVehiculo: number) =>
    api.delete<void>(`/vehiculos/usuario/${idUsuario}/${idVehiculo}`),
};
