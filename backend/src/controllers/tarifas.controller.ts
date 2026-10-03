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

export async function crear(req: Request, res: Response) {
  const { id_tipo_vehiculo, precio_efectivo, precio_linea } = req.body;

  if (!id_tipo_vehiculo || precio_efectivo === undefined || precio_linea === undefined) {
    res.status(400).json({ error: 'id_tipo_vehiculo, precio_efectivo y precio_linea son requeridos' });
    return;
  }

  const id = await tarifasService.crear({
    id_tipo_vehiculo: Number(id_tipo_vehiculo),
    precio_efectivo: Number(precio_efectivo),
    precio_linea: Number(precio_linea),
  });
  res.status(201).json({ id });
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { precio_efectivo, precio_linea } = req.body;

  const ok = await tarifasService.actualizar(id, {
    precio_efectivo: precio_efectivo !== undefined ? Number(precio_efectivo) : undefined,
    precio_linea: precio_linea !== undefined ? Number(precio_linea) : undefined,
  });
  if (!ok) { res.status(404).json({ error: 'Tarifa no encontrada' }); return; }
  res.json({ mensaje: 'Tarifa actualizada' });
}
