import type { Request, Response } from 'express';
import { autenticar } from '../services/auth.service';
import type { Credenciales } from '../types';

export async function login(req: Request, res: Response) {
  const credenciales = req.body as Credenciales;

  if (!credenciales.identificador || !credenciales.password) {
    res.status(400).json({ error: 'Identificador y contraseña son requeridos' });
    return;
  }

  const resultado = await autenticar(credenciales);

  if (!resultado.exitoso) {
    res.status(401).json({ error: resultado.mensaje });
    return;
  }

  res.json(resultado);
}
