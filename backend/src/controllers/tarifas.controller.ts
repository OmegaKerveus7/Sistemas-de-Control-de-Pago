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
  const { id_tipo_vehiculo, id_tipo_pago, precio, costo_transaccion } = req.body;

  if (!id_tipo_vehiculo || !id_tipo_pago || precio === undefined) {
    res.status(400).json({ error: 'id_tipo_vehiculo, id_tipo_pago y precio son requeridos' });
    return;
  }

  const existe = await tarifasService.existeCombinacion(Number(id_tipo_vehiculo), Number(id_tipo_pago));
  if (existe) {
    res.status(409).json({ error: 'Ya existe una tarifa para ese tipo de vehículo y método de pago' });
    return;
  }

  const id = await tarifasService.crear({
    id_tipo_vehiculo: Number(id_tipo_vehiculo),
    id_tipo_pago: Number(id_tipo_pago),
    precio: Number(precio),
    costo_transaccion: costo_transaccion != null ? Number(costo_transaccion) : null,
  });
  res.status(201).json({ id });
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { precio, costo_transaccion, activo } = req.body;

  const ok = await tarifasService.actualizar(id, {
    precio: precio !== undefined ? Number(precio) : undefined,
    costo_transaccion: costo_transaccion !== undefined ? (costo_transaccion === null ? null : Number(costo_transaccion)) : undefined,
    activo,
  });
  if (!ok) { res.status(404).json({ error: 'Tarifa no encontrada' }); return; }
  res.json({ mensaje: 'Tarifa actualizada' });
}
