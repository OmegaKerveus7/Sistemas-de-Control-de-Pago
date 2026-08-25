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

export async function registrarEntrada(req: Request, res: Response) {
  const { placa, num_parqueo } = req.body;
  if (!placa) { res.status(400).json({ error: 'La placa es requerida' }); return; }
  if (!num_parqueo) { res.status(400).json({ error: 'El número de parqueo es requerido' }); return; }

  const activo = await parqueoService.obtenerActivoPorPlaca(placa);
  if (activo) { res.status(400).json({ error: 'Ya hay un parqueo activo para esta placa' }); return; }

  const ocupado = await parqueoService.numParqueoOcupado(num_parqueo);
  if (ocupado) { res.status(400).json({ error: 'El número de parqueo ya está ocupado' }); return; }

  const id = await parqueoService.registrarEntrada(placa, num_parqueo);
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
