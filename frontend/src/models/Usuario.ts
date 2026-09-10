export type NombreRol = 'administrador' | 'cobrador' | 'guardia' | 'usuario';

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
  activo?: boolean;
}

export interface ResultadoAutenticacion {
  exitoso: boolean;
  usuario?: Usuario;
  mensaje?: string;
  token?: string;
}
