export type NombreRol = 'administrador' | 'guardia' | 'usuario';

export interface Credenciales {
  identificador: string;
  password: string;
}

export interface Usuario {
  id: number;
  dpi: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: NombreRol;
  foto_perfil?: string | null;
  activo?: boolean;
}

export interface ResultadoAutenticacion {
  exitoso: boolean;
  usuario?: Usuario;
  mensaje?: string;
  token?: string;
}