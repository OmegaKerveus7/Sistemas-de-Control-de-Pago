import { api } from './api';
import type { Credenciales } from '../models';

export interface ResultadoAutenticacion {
  exitoso: boolean;
  usuario?: {
    id: number;
    nombres: string;
    apellidos: string;
    rol: string;
    correo?: string;
    dpi?: string;
  };
  mensaje?: string;
  token?: string;
}

export async function login(credenciales: Credenciales): Promise<ResultadoAutenticacion> {
  return api.post<ResultadoAutenticacion>('/auth/login', credenciales);
}

export function guardarToken(token: string): void {
  localStorage.setItem('token', token);
}

export function obtenerToken(): string | null {
  return localStorage.getItem('token');
}

export function cerrarSesion(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
}

export function estaAutenticado(): boolean {
  return !!obtenerToken();
}
