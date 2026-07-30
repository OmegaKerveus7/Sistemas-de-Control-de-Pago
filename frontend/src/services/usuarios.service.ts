import { api } from './api';

export interface Usuario {
  id: number;
  dpi: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono?: string;
  rol: 'admin' | 'cajero' | 'supervisor';
  activo: boolean;
}

export const usuariosService = {
  listar: () => api.get<Usuario[]>('/usuarios'),
  obtenerPorId: (id: number) => api.get<Usuario>(`/usuarios/${id}`),
  crear: (data: Partial<Usuario> & { password: string }) => api.post<{ id: number }>('/usuarios', data),
  actualizar: (id: number, data: Partial<Usuario>) => api.put<void>(`/usuarios/${id}`, data),
  eliminar: (id: number) => api.delete<void>(`/usuarios/${id}`),
};
