import { api } from './api';

export interface Usuario {
  id_usuarios: number;
  dpi: string;
  nombres: string;
  apellidos: string;
  email: string;
  id_rol: number;
  nom_rol?: string;
  activo: boolean;
}

export const usuariosService = {
  listar: () => api.get<Usuario[]>('/usuarios'),
  obtenerPorId: (id: number) => api.get<Usuario>(`/usuarios/${id}`),
  crear: (data: Partial<Usuario> & { pass: string }) => api.post<{ id: number }>('/usuarios', data),
  actualizar: (id: number, data: Partial<Usuario>) => api.put<void>(`/usuarios/${id}`, data),
  eliminar: (id: number) => api.delete<void>(`/usuarios/${id}`),
  registroPublico: (data: { dpi: string; nombres: string; apellidos: string; email: string; password: string; foto_perfil?: string | null }) =>
    api.post<{ id: number; mensaje: string }>('/usuarios/registro', data),
};
