import type { Request, Response } from 'express';
import * as parqueoService from '../services/parqueo.service';

export async function listar(_req: Request, res: Response) {
  res.json(await parqueoService.listar());
}

export async function obtenerPorId(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parqueo = await parqueoService.obtenerPorId(id);
  if (!parqueo) { res.status(404).json({ error: 'Registro de parqueo no encontrado' }); return; }
  res.json(parqueo);
}

export async function obtenerActivoPorPlaca(req: Request, res: Response) {
  const placa = req.params.placa as string;
  const parqueo = await parqueoService.obtenerActivoPorPlaca(placa);
  if (!parqueo) { res.status(404).json({ error: 'No hay parqueo activo para esta placa' }); return; }
  res.json(parqueo);
}

export async function historialPorPlaca(req: Request, res: Response) {
  const placa = req.params.placa as string;
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    res.status(400).json({ error: 'Se requieren fecha_inicio y fecha_fin' });
    return;
  }

  const historial = await parqueoService.historialPorPlaca(
    placa,
    fecha_inicio as string,
    fecha_fin as string,
  );
  res.json(historial);
}
