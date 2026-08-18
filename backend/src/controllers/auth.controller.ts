import type { Request, Response } from 'express';
import { autenticar } from '../services/auth.service';
import type { Credenciales } from '../types';

function obtenerIp(req: Request): string {
  const forward = req.headers['x-forwarded-for'];
  if (forward) return String(forward).split(',')[0]?.trim() ?? 'desconocida';
  return req.socket?.remoteAddress?.replace('::ffff:', '') || 'desconocida';
}

export async function login(req: Request, res: Response) {
  const credenciales = req.body as Credenciales;

  if (!credenciales.identificador || !credenciales.password) {
    res.status(400).json({ error: 'Identificador y contraseña son requeridos' });
    return;
  }

  const resultado = await autenticar(credenciales, obtenerIp(req));

  if (!resultado.exitoso) {
    res.status(401).json({ error: resultado.mensaje });
    return;
  }

  res.json(resultado);
}
