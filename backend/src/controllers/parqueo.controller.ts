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

export async function validarPorPlaca(req: Request, res: Response) {
  const placa = (req.params.placa as string) ?? '';
  try {
    const resultado = await parqueoService.validarParqueoPorPlaca(placa);
    const data = (resultado.data ?? {}) as { estado?: string };
    const estadosNegocio = new Set(['con_parqueo', 'sin_pago', 'sin_parqueo', 'no_registrada']);
    const esErrorValidacion = resultado.codigo === 400 && placa.trim() === '';
    if (esErrorValidacion) {
      res.status(400).json({ error: resultado.mensaje });
      return;
    }
    if (data.estado && estadosNegocio.has(data.estado)) {
      res.status(200).json({ mensaje: resultado.mensaje, data: resultado.data });
      return;
    }
    if (resultado.codigo === 200 || resultado.codigo === 402) {
      res.status(200).json({ mensaje: resultado.mensaje, data: resultado.data });
      return;
    }
    res.status(resultado.codigo).json({ error: resultado.mensaje });
  } catch (error) {
    console.error('[Parqueo validar]', error);
    res.status(500).json({ error: 'No se pudo validar el parqueo. Inténtalo nuevamente.' });
  }
}
