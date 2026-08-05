import type { Request, Response } from 'express';
import * as pagosService from '../services/pagos.service';
import type { AuthRequest } from '../types';

export async function listar(_req: Request, res: Response) {
  res.json(await pagosService.listar());
}

export async function obtenerPorId(req: Request, res: Response) {
  const id = Number(req.params.id);
  const pago = await pagosService.obtenerPorId(id);
  if (!pago) { res.status(404).json({ error: 'Pago no encontrado' }); return; }
  res.json(pago);
}

export async function obtenerPorParqueo(req: Request, res: Response) {
  const parqueoId = Number(req.params.parqueoId);
  const pago = await pagosService.obtenerPorParqueo(parqueoId);
  if (!pago) { res.status(404).json({ error: 'Pago no encontrado para este parqueo' }); return; }
  res.json(pago);
}

export async function crear(req: Request, res: Response) {
  const usuario = (req as AuthRequest).usuario;
  const data = { ...req.body, procesado_por: usuario?.id };
  const id = await pagosService.crear(data);
  res.status(201).json({ id });
}
