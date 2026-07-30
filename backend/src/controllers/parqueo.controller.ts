import type { Request, Response } from 'express';
import * as parqueoService from '../services/parqueo.service';
import * as vehiculosService from '../services/vehiculos.service';

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

export async function registrarEntrada(req: Request, res: Response) {
  const { placa } = req.body;
  if (!placa) { res.status(400).json({ error: 'La placa es requerida' }); return; }

  const activo = await parqueoService.obtenerActivoPorPlaca(placa);
  if (activo) { res.status(400).json({ error: 'Ya hay un parqueo activo para esta placa' }); return; }

  const id = await parqueoService.registrarEntrada(placa);
  res.status(201).json({ id });
}

export async function registrarSalida(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { costo } = req.body;
  if (costo === undefined) { res.status(400).json({ error: 'El costo es requerido' }); return; }
  const ok = await parqueoService.registrarSalida(id, costo);
  if (!ok) { res.status(404).json({ error: 'Parqueo no encontrado o ya completado' }); return; }
  res.json({ mensaje: 'Salida registrada' });
}

export async function cancelar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = await parqueoService.cancelar(id);
  if (!ok) { res.status(404).json({ error: 'Parqueo no encontrado' }); return; }
  res.json({ mensaje: 'Parqueo cancelado' });
}
