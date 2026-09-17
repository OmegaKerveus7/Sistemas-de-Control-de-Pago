import type { Request, Response } from 'express';
import * as pagosService from '../services/pagos.service';
import * as correoService from '../services/correo.service';
import type { AuthRequest } from '../types';
import { PagoError } from '../services/pasarela.service';

export async function listar(_req: Request, res: Response) {
  res.json(await pagosService.listar());
}

export async function obtenerPorId(req: Request, res: Response) {
  const id = Number(req.params.id);
  const pago = await pagosService.obtenerPorId(id);
  if (!pago) { res.status(404).json({ error: 'Pago no encontrado' }); return; }
  res.json(pago);
}

export async function obtenerPorTicket(req: Request, res: Response) {
  const idTicket = Number(req.params.idTicket);
  const pago = await pagosService.obtenerPorTicket(idTicket);
  if (!pago) { res.status(404).json({ error: 'Pago no encontrado para este ticket' }); return; }
  res.json(pago);
}

export async function registrarEfectivo(req: Request, res: Response) {
  const usuario = (req as AuthRequest).usuario;
  const { placa, id_tipo_vehiculo } = req.body;

  if (!placa || !id_tipo_vehiculo) {
    res.status(400).json({ error: 'placa e id_tipo_vehiculo son requeridos' });
    return;
  }
  if (!usuario?.id) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  try {
    const resultado = await pagosService.crearEfectivo({
      placa: String(placa),
      id_tipo_vehiculo: Number(id_tipo_vehiculo),
      id_guardia: usuario.id,
    });
    res.status(201).json({ id: resultado.id, monto: resultado.monto });

    if (resultado.dueno_email && resultado.dueno_nombre) {
      correoService.enviarComprobantePago({
        correoDestino: resultado.dueno_email,
        nombreUsuario: resultado.dueno_nombre,
        placa: resultado.placa,
        ticket: resultado.ticket,
        monto: resultado.monto,
        fechaPago: new Date().toLocaleString('es-GT'),
        lugar: resultado.lugar,
        zona: resultado.zona,
        codigoValidacion: resultado.codigo_validacion,
      }).catch((err) => console.error('[Correo comprobante]', err));
    }
  } catch (err) {
    if (err instanceof PagoError) {
      res.status(err.status).json({ error: err.message });
    } else {
      console.error('[Pagos efectivo]', err);
      res.status(500).json({ error: 'No se pudo registrar el pago en efectivo. Consulta con administración.' });
    }
  }
}

export async function reporteMensual(_req: Request, res: Response) {
  res.json(await pagosService.reporteMensual());
}

export async function reporteDetallado(req: Request, res: Response) {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  if (!anio || !mes || mes < 1 || mes > 12) {
    res.status(400).json({ error: 'Se requieren parámetros anio y mes (1-12)' });
    return;
  }
  res.json(await pagosService.reporteDetallado(anio, mes));
}

export async function misPagos(req: Request, res: Response) {
  const usuario = (req as AuthRequest).usuario;
  if (!usuario) { res.status(401).json({ error: 'No autenticado' }); return; }
  res.json(await pagosService.listarPorUsuario(usuario.id));
}
