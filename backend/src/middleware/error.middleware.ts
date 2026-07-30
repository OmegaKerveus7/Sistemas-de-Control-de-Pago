import type { Request, Response, NextFunction } from 'express';

export function manejadorErrores(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
}
