import type { Request } from 'express';

export interface Credenciales {
  identificador: string;
  password: string;
}

export interface ResultadoAutenticacion {
  exitoso: boolean;
  usuario?: UsuarioPayload;
  mensaje?: string;
  token?: string;
}

export type NombreRol = 'ADMIN' | 'Administracion' | 'Guardia' | 'cliente' | 'gerente';

export interface UsuarioPayload {
  id: number;
  nombres: string;
  apellidos: string;
  rol: NombreRol;
  correo?: string;
  dpi?: string;
}

export interface TokenPayload {
  id: number;
  rol: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  usuario?: TokenPayload;
}
