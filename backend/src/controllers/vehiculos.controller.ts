import type { Request, Response } from 'express';
import * as vehiculosService from '../services/vehiculos.service';
import type { AuthRequest } from '../types';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    const primero = forwarded.split(',')[0];
    return (primero ?? '').trim() || req.ip || 'desconocida';
  }
  return req.ip ?? 'desconocida';
}

function idUsuarioAccion(req: Request): number {
  const usuario = (req as AuthRequest).usuario;
  return usuario?.id ?? 0;
}

export async function listar(_req: Request, res: Response) {
  res.json(await vehiculosService.listar());
}

export async function obtenerPorPlaca(req: Request, res: Response) {
  const placa = req.params.placa as string;
  const vehiculo = await vehiculosService.obtenerPorPlaca(placa);
  if (!vehiculo) { res.status(404).json({ error: 'Vehículo no encontrado' }); return; }
  res.json(vehiculo);
}

export async function buscar(req: Request, res: Response) {
  const q = req.query.q as string;
  if (!q) { res.status(400).json({ error: 'Parámetro de búsqueda requerido' }); return; }
  res.json(await vehiculosService.buscar(q));
}

export async function crear(req: Request, res: Response) {
  const { placa, id_usuario, id_tipo, id_marca, color } = req.body ?? {};
  if (!placa || !id_usuario || !id_tipo) {
    res.status(400).json({ error: 'Faltan campos: placa, id_usuario, id_tipo' });
    return;
  }
  const resultado = await vehiculosService.crear(
    { placa, id_usuario, id_tipo, id_marca, color },
    idUsuarioAccion(req),
    getClientIp(req),
  );
  if (resultado.codigo >= 400) {
    res.status(resultado.codigo).json({ error: resultado.mensaje });
    return;
  }
  res.status(resultado.codigo).json({ mensaje: resultado.mensaje, data: resultado.data });
}

export async function actualizar(req: Request, res: Response) {
  const placa = req.params.id as string;
  if (!req.body?.id_usuario && !req.body?.id_tipo && !req.body?.id_marca && !req.body?.color && req.body?.activo === undefined) {
    res.status(400).json({ error: 'Debes enviar al menos un campo para actualizar' });
    return;
  }
  const resultado = await vehiculosService.actualizar(
    placa,
    req.body,
    idUsuarioAccion(req),
    getClientIp(req),
  );
  if (resultado.codigo >= 400) {
    res.status(resultado.codigo).json({ error: resultado.mensaje });
    return;
  }
  res.json({ mensaje: resultado.mensaje, data: resultado.data });
}

export async function eliminar(req: Request, res: Response) {
  const placa = req.params.id as string;
  const resultado = await vehiculosService.eliminar(
    placa,
    idUsuarioAccion(req),
    getClientIp(req),
  );
  if (resultado.codigo >= 400) {
    res.status(resultado.codigo).json({ error: resultado.mensaje });
    return;
  }
  res.json({ mensaje: resultado.mensaje, data: resultado.data });
}

export async function vehiculosPorUsuario(req: Request, res: Response) {
  const idUsuario = Number(req.params.idUsuario);
  res.json(await vehiculosService.vehiculosPorUsuario(idUsuario));
}

export async function listarTiposVehiculo(_req: Request, res: Response) {
  res.json(await vehiculosService.listarTiposVehiculo());
}

export async function marcasPorTipo(_req: Request, res: Response) {
  res.json(await vehiculosService.marcasPorTipo());
}
