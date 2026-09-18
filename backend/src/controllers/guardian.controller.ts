import type { Request, Response } from 'express';
import type { AuthRequest } from '../types';
import { GuardianError, type CriterioGuardian, type RegistroEntradaGuardian } from '../models';
import * as guardianService from '../services/guardian.service';

function ipDe(req: Request): string {
  const forward = req.headers['x-forwarded-for'];
  if (forward) return String(forward).split(',')[0]?.trim() ?? 'desconocida';
  return req.socket.remoteAddress?.replace('::ffff:', '') ?? 'desconocida';
}

function criterioDesde(body: unknown): CriterioGuardian {
  const datos = (body ?? {}) as Record<string, unknown>;
  const criterio: CriterioGuardian = {};
  for (const campo of ['placa', 'ticket', 'referencia', 'qr'] as const) {
    const valor = datos[campo];
    if (typeof valor === 'string' && valor.trim()) criterio[campo] = valor.trim();
  }
  if (Object.keys(criterio).length !== 1) {
    throw new GuardianError(400, 'Indica exactamente uno: placa, ticket, referencia o QR', 'CRITERIO_INVALIDO');
  }
  return criterio;
}

function responderError(error: unknown, res: Response) {
  if (error instanceof GuardianError) {
    res.status(error.status).json({ error: error.message, codigo: error.codigo });
    return;
  }
  console.error('[Guardian]', error);
  res.status(500).json({ error: 'Error interno del servidor' });
}

function guardiaAutenticado(req: Request): number {
  const id = (req as AuthRequest).usuario?.id;
  if (!id) throw new GuardianError(401, 'Usuario no autenticado', 'NO_AUTENTICADO');
  return id;
}

function idOpcional(valor: unknown, campo: string): number | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new GuardianError(400, `${campo} debe ser un identificador válido`, 'UBICACION_INVALIDA');
  }
  return id;
}

export async function obtenerResumen(_req: Request, res: Response) {
  try { res.json(await guardianService.resumen()); } catch (error) { responderError(error, res); }
}

export async function obtenerEstadisticas(_req: Request, res: Response) {
  try { res.json(await guardianService.estadisticas()); } catch (error) { responderError(error, res); }
}

export async function listarLugares(_req: Request, res: Response) {
  try { res.json(await guardianService.lugares()); } catch (error) { responderError(error, res); }
}

export async function entrada(req: Request, res: Response) {
  try {
    const placa = typeof req.body?.placa === 'string' ? req.body.placa.trim() : '';
    if (!placa) throw new GuardianError(400, 'La placa es requerida', 'PLACA_REQUERIDA');
    const registro: RegistroEntradaGuardian = {
      placa,
      zona_id: idOpcional(req.body?.zona_id, 'zona_id'),
      lugar_id: idOpcional(req.body?.lugar_id, 'lugar_id'),
    };
    const resultado = await guardianService.registrarEntrada(registro, guardiaAutenticado(req), ipDe(req));
    res.status(201).json(resultado);
  } catch (error) { responderError(error, res); }
}

export async function buscar(req: Request, res: Response) {
  try { res.json(await guardianService.buscar(criterioDesde(req.body))); } catch (error) { responderError(error, res); }
}

export async function validarPago(req: Request, res: Response) {
  try {
    const resultado = await guardianService.validarPago(criterioDesde(req.body), guardiaAutenticado(req), ipDe(req));
    res.json(resultado);
  } catch (error) { responderError(error, res); }
}

export async function salida(req: Request, res: Response) {
  try {
    const resultado = await guardianService.registrarSalida(criterioDesde(req.body), guardiaAutenticado(req), ipDe(req));
    res.json({ mensaje: 'Salida registrada y lugar liberado', ...resultado });
  } catch (error) { responderError(error, res); }
}
