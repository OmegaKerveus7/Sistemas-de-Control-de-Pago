import type { Request, Response } from 'express';
import * as vehiculosService from '../services/vehiculos.service';

export async function listar(_req: Request, res: Response) {
  res.json(await vehiculosService.listar());
}

export async function obtenerPorId(req: Request, res: Response) {
  const id = Number(req.params.id);
  const vehiculo = await vehiculosService.obtenerPorId(id);
  if (!vehiculo) { res.status(404).json({ error: 'Vehículo no encontrado' }); return; }
  res.json(vehiculo);
}

export async function obtenerPorPlaca(req: Request, res: Response) {
  const placa = req.params.placa as string;
  const vehiculo = await vehiculosService.obtenerPorPlaca(placa);
  if (!vehiculo) { res.status(404).json({ error: 'Vehículo no encontrado' }); return; }
  res.json(vehiculo);
}

export async function crear(req: Request, res: Response) {
  const id = await vehiculosService.crear(req.body);
  res.status(201).json({ id });
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = await vehiculosService.actualizar(id, req.body);
  if (!ok) { res.status(404).json({ error: 'Vehículo no encontrado' }); return; }
  res.json({ mensaje: 'Vehículo actualizado' });
}

export async function eliminar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = await vehiculosService.eliminar(id);
  if (!ok) { res.status(404).json({ error: 'Vehículo no encontrado' }); return; }
  res.json({ mensaje: 'Vehículo eliminado' });
}
