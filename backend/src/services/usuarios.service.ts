import bcrypt from 'bcryptjs';
import type { UsuarioMySQL } from '../models';
import * as usuariosRepo from '../repositories/usuarios.repository';

export type { UsuarioMySQL };

export async function listar(): Promise<UsuarioMySQL[]> {
  return usuariosRepo.listar();
}

export async function obtenerPorId(id: number): Promise<UsuarioMySQL | null> {
  return usuariosRepo.obtenerPorId(id);
}

export async function existeCorreoODpi(email: string, dpi: string): Promise<boolean> {
  return usuariosRepo.existeCorreoODpi(email, dpi);
}

export async function crear(data: Omit<UsuarioMySQL, 'id_usuarios' | 'nom_rol' | 'fecha_creacion'>): Promise<number> {
  const hash = await bcrypt.hash(data.pass ?? '', 10);
  return usuariosRepo.crear({ ...data, pass: hash });
}

export async function actualizar(id: number, data: Partial<UsuarioMySQL>): Promise<boolean> {
  const actualizado = { ...data };
  if (actualizado.pass && actualizado.pass.trim()) {
    actualizado.pass = await bcrypt.hash(actualizado.pass, 10);
  }
  return usuariosRepo.actualizar(id, actualizado);
}

export async function eliminar(id: number): Promise<boolean> {
  return usuariosRepo.eliminar(id);
}

export async function obtenerIdPorCorreo(email: string): Promise<number | null> {
  return usuariosRepo.obtenerIdPorCorreo(email);
}
