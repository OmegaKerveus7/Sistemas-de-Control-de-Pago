import type { Request, Response } from 'express';
import * as vehiculosService from '../services/vehiculos.service';

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
  const { placa, id_usuario, id_tipo, id_marca, color } = req.body;
  if (!placa || !id_usuario || !id_tipo) {
    res.status(400).json({ error: 'Faltan campos: placa, id_usuario, id_tipo' });
    return;
  }
  const placaCreada = await vehiculosService.crear(req.body);
  res.status(201).json({ placa: placaCreada });
}

export async function actualizar(req: Request, res: Response) {
  const placa = req.params.id as string;
  const ok = await vehiculosService.actualizar(placa, req.body);
  if (!ok) { res.status(404).json({ error: 'Vehículo no encontrado' }); return; }
  res.json({ mensaje: 'Vehículo actualizado' });
}

export async function eliminar(req: Request, res: Response) {
  const placa = req.params.id as string;
  const ok = await vehiculosService.eliminar(placa);
  if (!ok) { res.status(404).json({ error: 'Vehículo no encontrado' }); return; }
  res.json({ mensaje: 'Vehículo desactivado' });
}

export async function vehiculosPorUsuario(req: Request, res: Response) {
  const idUsuario = Number(req.params.idUsuario);
  res.json(await vehiculosService.vehiculosPorUsuario(idUsuario));
}
