import type { Request, Response } from 'express';
import * as pagosService from '../services/pagos.service';
import * as parqueoService from '../services/parqueo.service';
import * as pasarelaService from '../services/pasarela.service';
import { precioFijo } from '../config/precios';
import type { AuthRequest } from '../types';
import type { MetodoPago } from '../models';

function obtenerIp(req: Request): string {
  const forward = req.headers['x-forwarded-for'];
  if (forward) return String(forward).split(',')[0]?.trim() ?? 'desconocida';
  return req.socket?.remoteAddress?.replace('::ffff:', '') || 'desconocida';
}

export async function listar(_req: Request, res: Response) {
  res.json(await pagosService.listar());
}

export async function obtenerPorId(req: Request, res: Response) {
  const id = Number(req.params.id);
  const pago = await pagosService.obtenerPorId(id);
  if (!pago) { res.status(404).json({ error: 'Pago no encontrado' }); return; }
  res.json(pago);
}

export async function obtenerPorParqueo(req: Request, res: Response) {
  const parqueoId = Number(req.params.parqueoId);
  const pago = await pagosService.obtenerPorParqueo(parqueoId);
  if (!pago) { res.status(404).json({ error: 'Pago no encontrado para este parqueo' }); return; }
  res.json(pago);
}

export async function precio(req: Request, res: Response) {
  const tipo = String(req.query.tipo ?? '').toLowerCase();
  const online = precioFijo(tipo);
  if (online === undefined) { res.status(404).json({ error: 'Precio no definido para este tipo de vehículo' }); return; }
  res.json({ tipo, online });
}

export async function crear(req: Request, res: Response) {
  const usuario = (req as AuthRequest).usuario;
  const { parqueo_id, tipo_vehiculo, metodo = 'tarjeta' } = req.body;

  if (!parqueo_id || !tipo_vehiculo) {
    res.status(400).json({ error: 'parqueo_id y tipo_vehiculo son requeridos' });
    return;
  }

  const parqueo = await parqueoService.obtenerPorId(Number(parqueo_id));
  if (!parqueo || parqueo.estado !== 'activo') {
    res.status(400).json({ error: 'No hay un parqueo activo para este registro' });
    return;
  }

  const monto = precioFijo(String(tipo_vehiculo).toLowerCase());
  if (monto === undefined) {
    res.status(404).json({ error: 'Precio no definido para este tipo de vehículo' });
    return;
  }

  const referencia = pasarelaService.generarReferencia();
  const ip = obtenerIp(req);

  const id = await pagosService.crear({
    parqueo_id: Number(parqueo_id),
    monto,
    metodo: metodo as MetodoPago,
    estado: 'pendiente',
    referencia,
    ip_inicio: ip,
    procesado_por: usuario?.id,
  });

  const checkout = await pasarelaService.crearCheckout({
    id,
    parqueo_id: Number(parqueo_id),
    monto,
    metodo: metodo as MetodoPago,
    estado: 'pendiente',
    referencia,
  });

  res.status(201).json({ id, monto, referencia, url_pago: checkout.url_pago });
}

export async function confirmar(req: Request, res: Response) {
  const referencia = String(req.query.referencia ?? '').trim();
  if (!referencia) { res.status(400).json({ error: 'referencia es requerida' }); return; }

  const pago = await pagosService.obtenerPorReferencia(referencia);
  if (!pago || !pago.id) { res.status(404).json({ error: 'Pago no encontrado' }); return; }

  if (pago.estado === 'completado') {
    res.json({ aprobado: true, id: pago.id, monto: pago.monto, referencia, ya_confirmado: true });
    return;
  }

  const verificacion = await pasarelaService.verificarPago(referencia);
  if (!verificacion.aprobado) {
    res.json({ aprobado: false, referencia, mensaje: verificacion.mensaje ?? 'Pago rechazado' });
    return;
  }

  const ok = await pagosService.confirmar(pago.id, referencia, obtenerIp(req));
  if (ok && pago.parqueo_id) {
    await parqueoService.registrarSalida(pago.parqueo_id, pago.monto);
  }

  res.json({ aprobado: true, id: pago.id, monto: pago.monto, referencia });
}

export async function reporteMensual(_req: Request, res: Response) {
  res.json(await pagosService.reporteMensual());
}

export async function mockCheckout(req: Request, res: Response) {
  if (!pasarelaService.esModoPrueba()) {
    res.status(404).send('No disponible');
    return;
  }

  const referencia = String(req.query.referencia ?? '').trim();
  if (!referencia) { res.status(400).send('referencia requerida'); return; }

  const pago = await pagosService.obtenerPorReferencia(referencia);
  if (!pago) { res.status(404).send('Pago no encontrado'); return; }

  const retorno = pasarelaService.urlRetorno(referencia);
  res.type('html').send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Simulación de pago</title></head>
<body style="font-family:system-ui,sans-serif;max-width:420px;margin:40px auto;text-align:center">
<h2>Pasarela de prueba (sandbox)</h2>
<p>No se realizará ningún cargo real.</p>
<p><strong>Pago:</strong> ${pago.id}</p>
<p><strong>Monto:</strong> Q${Number(pago.monto).toFixed(2)}</p>
<p><strong>Referencia:</strong> ${referencia}</p>
<a href="${retorno}" style="display:inline-block;margin:8px;padding:12px 24px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:6px">Pagar (aprobado)</a>
<a href="${retorno}&estado=cancelado" style="display:inline-block;margin:8px;padding:12px 24px;background:#b71c1c;color:#fff;text-decoration:none;border-radius:6px">Cancelar</a>
</body>
</html>`);
}