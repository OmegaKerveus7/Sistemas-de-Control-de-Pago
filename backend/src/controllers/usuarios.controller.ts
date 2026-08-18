import type { Request, Response } from 'express';
import * as usuariosService from '../services/usuarios.service';
import * as auditoria from '../services/auditoria.service';
import type { AuthRequest } from '../types';

function ipDe(req: Request): string {
  return req.headers['x-forwarded-for']?.toString() || req.ip || null;
}

export async function listar(_req: Request, res: Response) {
  const usuarios = await usuariosService.listar();
  res.json(usuarios);
}

export async function obtenerPorId(req: Request, res: Response) {
  const id = Number(req.params.id);
  const usuario = await usuariosService.obtenerPorId(id);
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  const { contraseña: _contraseña, ...data } = usuario;
  res.json(data);
}

export async function crear(req: Request, res: Response) {
  const data = req.body;

  if (!data.rol || !data.correo || !data.contraseña || !data.nombres || !data.apellidos || !data.dpi) {
    res.status(400).json({ error: 'Faltan campos requeridos: rol, correo, contraseña, nombres, apellidos, dpi' });
    return;
  }

  const existe = await usuariosService.existeCorreoODpi(data.correo, data.dpi);
  if (existe) {
    res.status(409).json({ error: 'Ya existe un usuario con ese correo o DPI' });
    return;
  }

  const id = await usuariosService.crear(data);

  const usuario = (req as AuthRequest).usuario;
  await auditoria.registrar({
    id_usuario: usuario?.id ?? null,
    accion: 'CREAR_USUARIO',
    entidad: 'usuarios',
    detalle: `Creó el usuario id ${id} (${data.correo})`,
    ip: ipDe(req),
  });

  res.status(201).json({ id });
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = await usuariosService.actualizar(id, req.body);
  if (!ok) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  const usuario = (req as AuthRequest).usuario;
  await auditoria.registrar({
    id_usuario: usuario?.id ?? null,
    accion: 'ACTUALIZAR_USUARIO',
    entidad: 'usuarios',
    detalle: `Actualizó el usuario id ${id}`,
    ip: ipDe(req),
  });

  res.json({ mensaje: 'Usuario actualizado' });
}

export async function eliminar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = await usuariosService.eliminar(id);
  if (!ok) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  const usuario = (req as AuthRequest).usuario;
  await auditoria.registrar({
    id_usuario: usuario?.id ?? null,
    accion: 'ELIMINAR_USUARIO',
    entidad: 'usuarios',
    detalle: `Eliminó el usuario id ${id}`,
    ip: ipDe(req),
  });

  res.json({ mensaje: 'Usuario eliminado' });
}
