export type NombreRol = 'ADMIN' | 'Administracion' | 'Guardia' | 'cliente' | 'gerente';

export interface Credenciales {
  identificador: string;
  password: string;
}

export interface Usuario {
  id: number;
  dpi: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: NombreRol;
  foto_perfil?: string | null;
  vehiculo?: string | null;
  activo?: boolean;
}

export interface ResultadoAutenticacion {
  exitoso: boolean;
  usuario?: Usuario;
  mensaje?: string;
  token?: string;
}