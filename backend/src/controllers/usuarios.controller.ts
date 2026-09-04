import type { Request, Response } from 'express';
import * as usuariosService from '../services/usuarios.service';
import * as auditoria from '../services/auditoria.service';
import type { AuthRequest } from '../types';

function ipDe(req: Request): string {
  return req.headers['x-forwarded-for']?.toString() || req.ip || 'desconocida';
}

export async function listar(_req: Request, res: Response) {
  const usuarios = await usuariosService.listar();
  res.json(usuarios);
}

export async function obtenerPorId(req: Request, res: Response) {
  const id = Number(req.params.id);
  const usuario = await usuariosService.obtenerPorId(id);
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  const { pass: _pass, ...data } = usuario;
  res.json(data);
}

export async function crear(req: Request, res: Response) {
  const data = req.body;

  if (!data.id_rol || !data.email || !data.pass || !data.nombres || !data.apellidos || !data.dpi) {
    res.status(400).json({ error: 'Faltan campos requeridos: id_rol, email, pass, nombres, apellidos, dpi' });
    return;
  }

  const existe = await usuariosService.existeCorreoODpi(data.email, data.dpi);
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
    detalle: `Creó el usuario id ${id} (${data.email})`,
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

export async function registroPublico(req: Request, res: Response) {
  const data = req.body;

  const password = data.password || data.pass;

  if (!data.email || !password || !data.nombres || !data.apellidos || !data.dpi) {
    res.status(400).json({ error: 'Faltan campos requeridos: email, contraseña, nombres, apellidos, dpi' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    return;
  }

  const existe = await usuariosService.existeCorreoODpi(data.email, data.dpi);
  if (existe) {
    res.status(409).json({ error: 'Ya existe una cuenta con ese correo o DPI' });
    return;
  }

  try {
    const id = await usuariosService.crear({
      id_rol: 3,
      email: data.email,
      pass: password,
      nombres: data.nombres,
      apellidos: data.apellidos,
      dpi: data.dpi,
      foto_perfil: data.foto_perfil ?? null,
      activo: true,
    });

    res.status(201).json({ id, mensaje: 'Cuenta creada exitosamente' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: `Error al crear usuario: ${msg}` });
  }
}
