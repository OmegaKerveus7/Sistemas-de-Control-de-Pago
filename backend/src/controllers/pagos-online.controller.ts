import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import * as service from '../services/pagos-online.service';
import { cotizar } from '../repositories/pagos-online.repository';
import { PagoError, modoPago } from '../services/pasarela.service';

export const manejarPago = (handler: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response, next: NextFunction) => {
  try { await handler(req, res); }
  catch (error) {
    if (error instanceof PagoError) res.status(error.status).json({ error: error.message });
    else next(error);
  }
};
function idValido(valor: unknown) {
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id < 1) throw new PagoError(400, 'Parqueo inválido');
  return id;
}
function referenciaValida(valor: unknown) {
  if (typeof valor !== 'string' || !/^P-[a-f0-9]{18}$/.test(valor)) throw new PagoError(400, 'Referencia inválida');
  return valor;
}
export const precio = manejarPago(async (req, res) => {
  res.json({ ...await cotizar(idValido(req.query.parqueo_id)), modo: modoPago() });
});
export const crear = manejarPago(async (req, res) => {
  const monto = req.body?.monto_esperado;
  if (typeof monto !== 'number' || !Number.isFinite(monto) || monto < 5) throw new PagoError(400, 'Consulta la tarifa antes de pagar');
  res.status(201).json(await service.crear(idValido(req.body?.parqueo_id), (req as AuthRequest).usuario!.id, monto));
});
export const confirmar = manejarPago(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await service.confirmar(referenciaValida(req.params.referencia), (req as AuthRequest).usuario!.id));
});
export const simular = manejarPago(async (req, res) => {
  res.json(await service.simular(referenciaValida(req.params.referencia), (req as AuthRequest).usuario!.id, req.body?.estado));
});
export const webhook = manejarPago(async (req, res) => {
  if (!Buffer.isBuffer(req.body)) throw new PagoError(400, 'Se requiere el cuerpo original del webhook');
  await service.webhook(req.body, { id: req.get('svix-id'), timestamp: req.get('svix-timestamp'), signature: req.get('svix-signature') });
  res.sendStatus(204);
});
