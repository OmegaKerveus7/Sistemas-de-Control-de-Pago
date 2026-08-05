import type { Request, Response } from 'express';
import * as tarifasService from '../services/tarifas.service';

export async function listar(_req: Request, res: Response) {
  res.json(await tarifasService.listar());
}

export async function obtenerPorId(req: Request, res: Response) {
  const id = Number(req.params.id);
  const tarifa = await tarifasService.obtenerPorId(id);
  if (!tarifa) { res.status(404).json({ error: 'Tarifa no encontrada' }); return; }
  res.json(tarifa);
}

export async function obtenerPorTipoVehiculo(req: Request, res: Response) {
  const tipo = req.params.tipo as string;
  const tarifa = await tarifasService.obtenerPorTipoVehiculo(tipo);
  if (!tarifa) { res.status(404).json({ error: 'Tarifa no encontrada para este tipo' }); return; }
  res.json(tarifa);
}

export async function crear(req: Request, res: Response) {
  const id = await tarifasService.crear(req.body);
  res.status(201).json({ id });
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = await tarifasService.actualizar(id, req.body);
  if (!ok) { res.status(404).json({ error: 'Tarifa no encontrada' }); return; }
  res.json({ mensaje: 'Tarifa actualizada' });
}

export async function eliminar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = await tarifasService.eliminar(id);
  if (!ok) { res.status(404).json({ error: 'Tarifa no encontrada' }); return; }
  res.json({ mensaje: 'Tarifa eliminada' });
}
