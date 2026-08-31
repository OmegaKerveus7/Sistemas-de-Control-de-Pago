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

export async function existeCorreoODpi(correo: string, dpi: string): Promise<boolean> {
  return usuariosRepo.existeCorreoODpi(correo, dpi);
}

export async function crear(data: Omit<UsuarioMySQL, 'id_usuario' | 'nombre_rol'>): Promise<number> {
  const hash = await bcrypt.hash(data.contraseña ?? '', 10);
  return usuariosRepo.crear({ ...data, contraseña: hash });
}

export async function actualizar(id: number, data: Partial<UsuarioMySQL>): Promise<boolean> {
  const actualizado = { ...data };
  if (actualizado.contraseña && actualizado.contraseña.trim()) {
    actualizado.contraseña = await bcrypt.hash(actualizado.contraseña, 10);
  }
  return usuariosRepo.actualizar(id, actualizado);
}

export async function eliminar(id: number): Promise<boolean> {
  return usuariosRepo.eliminar(id);
}

export async function obtenerIdPorCorreo(correo: string): Promise<number | null> {
  return usuariosRepo.obtenerIdPorCorreo(correo);
}
