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

export async function buscar(req: Request, res: Response) {
  const q = req.query.q as string;
  if (!q) { res.status(400).json({ error: 'Parámetro de búsqueda requerido' }); return; }
  res.json(await vehiculosService.buscar(q));
}

export async function crear(req: Request, res: Response) {
  const { placa, marca, modelo, color, tipo } = req.body;
  if (!placa || !marca || !modelo || !color || !tipo) {
    res.status(400).json({ error: 'Faltan campos: placa, marca, modelo, color, tipo' });
    return;
  }
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

// ==================== USUARIO_VEHICULOS ====================

export async function vehiculosPorUsuario(req: Request, res: Response) {
  const idUsuario = Number(req.params.idUsuario);
  res.json(await vehiculosService.vehiculosPorUsuario(idUsuario));
}

export async function asignarAUsuario(req: Request, res: Response) {
  const { id_usuario, id_vehiculo } = req.body;
  if (!id_usuario || !id_vehiculo) {
    res.status(400).json({ error: 'Se requieren id_usuario e id_vehiculo' });
    return;
  }
  const existe = await vehiculosService.usuarioTieneVehiculo(id_usuario, id_vehiculo);
  if (existe) {
    res.status(409).json({ error: 'El vehículo ya está asignado a este usuario' });
    return;
  }
  await vehiculosService.asignarVehiculoAUsuario(id_usuario, id_vehiculo);
  res.status(201).json({ mensaje: 'Vehículo asignado al usuario' });
}

export async function removerDeUsuario(req: Request, res: Response) {
  const idUsuario = Number(req.params.idUsuario);
  const idVehiculo = Number(req.params.idVehiculo);
  const ok = await vehiculosService.removerVehiculoDeUsuario(idUsuario, idVehiculo);
  if (!ok) { res.status(404).json({ error: 'Relación no encontrada' }); return; }
  res.json({ mensaje: 'Vehículo removido del usuario' });
}
