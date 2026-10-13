import type { Request, Response, NextFunction } from 'express';

/** IP del cliente. Solo se confía en X-Forwarded-For si el backend corre detrás de un proxy propio (TRUST_PROXY=true). */
export function ipCliente(req: Request): string {
  if (process.env.TRUST_PROXY === 'true') {
    const forward = req.headers['x-forwarded-for'];
    const primera = forward ? String(forward).split(',')[0]?.trim() : '';
    if (primera) return primera;
  }
  return req.socket.remoteAddress?.replace('::ffff:', '') ?? 'desconocida';
}

/** Límite de peticiones por IP en una ventana fija, en memoria (basta para una sola instancia del backend). */
export function limitarPeticiones(nombre: string, maximo: number, ventanaMs: number) {
  const contadores = new Map<string, { cuenta: number; reinicio: number }>();
  const limpieza = setInterval(() => {
    const ahora = Date.now();
    for (const [clave, entrada] of contadores) if (entrada.reinicio <= ahora) contadores.delete(clave);
  }, ventanaMs);
  limpieza.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ahora = Date.now();
    const clave = `${nombre}:${ipCliente(req)}`;
    const actual = contadores.get(clave);
    if (!actual || actual.reinicio <= ahora) {
      contadores.set(clave, { cuenta: 1, reinicio: ahora + ventanaMs });
      next();
      return;
    }
    actual.cuenta += 1;
    if (actual.cuenta > maximo) {
      res.setHeader('Retry-After', String(Math.ceil((actual.reinicio - ahora) / 1000)));
      res.status(429).json({ error: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' });
      return;
    }
    next();
  };
}
