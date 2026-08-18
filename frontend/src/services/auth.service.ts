import { api } from './api';
import type { Credenciales, NombreRol, ResultadoAutenticacion, Usuario } from '../models';

export type { ResultadoAutenticacion };

export async function login(credenciales: Credenciales): Promise<ResultadoAutenticacion> {
  return api.post<ResultadoAutenticacion>('/auth/login', credenciales);
}

export function guardarToken(token: string): void {
  localStorage.setItem('token', token);
}

export function obtenerToken(): string | null {
  return localStorage.getItem('token');
}

export function guardarUsuario(usuario: Usuario): void {
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

export function obtenerUsuario(): Usuario | null {
  const raw = localStorage.getItem('usuario');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export function obtenerRol(): NombreRol | null {
  return obtenerUsuario()?.rol ?? null;
}

export function cerrarSesion(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
}

export function estaAutenticado(): boolean {
  return !!obtenerToken();
}