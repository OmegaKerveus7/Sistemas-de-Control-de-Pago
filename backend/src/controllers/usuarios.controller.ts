import type { Request, Response } from 'express';
import * as usuariosService from '../services/usuarios.service';

export async function listar(_req: Request, res: Response) {
  const usuarios = await usuariosService.listar();
  // No exponer password_hash
  const data = usuarios.map(({ password_hash: _, ...rest }) => rest);
  res.json(data);
}

export async function obtenerPorId(req: Request, res: Response) {
  const id = Number(req.params.id);
  const usuario = await usuariosService.obtenerPorId(id);
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  const { password_hash: _, ...data } = usuario;
  res.json(data);
}

export async function crear(req: Request, res: Response) {
  const id = await usuariosService.crear(req.body);
  res.status(201).json({ id });
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = await usuariosService.actualizar(id, req.body);
  if (!ok) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  res.json({ mensaje: 'Usuario actualizado' });
}

export async function eliminar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = await usuariosService.eliminar(id);
  if (!ok) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  res.json({ mensaje: 'Usuario eliminado' });
}
