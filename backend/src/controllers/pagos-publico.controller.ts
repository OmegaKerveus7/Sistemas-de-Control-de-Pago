import type { Request, Response } from 'express';
import * as service from '../services/pagos-publico.service';
import { PagoError } from '../services/pasarela.service';
import { manejarPago } from './pagos-online.controller';

function placaDe(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.trim()) throw new PagoError(400, 'Ingresa la placa del vehículo');
  return valor;
}
function referenciaValida(valor: unknown): string {
  if (typeof valor !== 'string' || !/^P-[a-f0-9]{18}$/.test(valor)) throw new PagoError(400, 'Referencia inválida');
  return valor;
}

export const consultar = manejarPago(async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await service.consultar(placaDe(req.params.placa)));
});

export const crear = manejarPago(async (req: Request, res: Response) => {
  const monto = req.body?.monto_esperado;
  if (typeof monto !== 'number' || !Number.isFinite(monto) || monto < 5) throw new PagoError(400, 'Consulta la tarifa antes de pagar');
  res.status(201).json(await service.crear(placaDe(req.body?.placa), req.body?.nit, req.body?.nombre, monto));
});

export const confirmar = manejarPago(async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await service.confirmar(referenciaValida(req.params.referencia)));
});

export const simular = manejarPago(async (req: Request, res: Response) => {
  res.json(await service.simular(referenciaValida(req.params.referencia), req.body?.estado));
});

/** Para personal autenticado: incluye referencia y datos de facturación del pago. */
export const permisoDePlaca = manejarPago(async (req: Request, res: Response) => {
  res.json(await service.consultarDetalle(placaDe(req.params.placa)));
});

export const estadoHoy = manejarPago(async (_req: Request, res: Response) => {
  res.json(await service.estadoDelDia());
});
