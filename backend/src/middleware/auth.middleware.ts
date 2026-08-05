import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { TokenPayload, AuthRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'parqueo-zona19-secret-key-2026';

export function verificarToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    (req as AuthRequest).usuario = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function verificarRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = (req as AuthRequest).usuario;
    if (!usuario || !roles.includes(usuario.rol)) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' });
      return;
    }
    next();
  };
}
