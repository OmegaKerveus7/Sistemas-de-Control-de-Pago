import { api } from './api';

export interface Vehiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  tipo: 'automovil' | 'motocicleta' | 'camioneta' | 'otro';
  propietario_dpi: string;
  propietario_nombre: string;
}

export const vehiculosService = {
  listar: () => api.get<Vehiculo[]>('/vehiculos'),
  obtenerPorId: (id: number) => api.get<Vehiculo>(`/vehiculos/${id}`),
  obtenerPorPlaca: (placa: string) => api.get<Vehiculo>(`/vehiculos/placa/${placa}`),
  crear: (data: Vehiculo) => api.post<{ id: number }>('/vehiculos', data),
  actualizar: (id: number, data: Partial<Vehiculo>) => api.put<void>(`/vehiculos/${id}`, data),
  eliminar: (id: number) => api.delete<void>(`/vehiculos/${id}`),
};
