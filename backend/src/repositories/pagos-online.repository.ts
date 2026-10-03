import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import { generarReferencia, PagoError, type ModoPago } from '../services/pasarela.service';

export interface PagoOnline extends RowDataPacket {
  id_pago: number; id_usuario: number; id_ticket: number; placa: string;
  monto: string | number; codigo_validacion: string; estado_pago: string;
  transaction_id: string | null; gateway_response: { modo: ModoPago; url_pago?: string } | string;
}
export function gateway(pago: PagoOnline): { modo: ModoPago; url_pago?: string } {
  return typeof pago.gateway_response === 'string' ? JSON.parse(pago.gateway_response) : pago.gateway_response;
}

export async function cotizar(parqueoId: number) {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT tv.precio_efectivo, tv.precio_linea, t.placa FROM Parqueos p
     JOIN Tickets t ON t.id_ticket = p.id_ticket JOIN Tipo_vehiculo tv ON tv.id_tipo = t.id_tipo
     WHERE p.id_parqueo = ? AND p.fecha_liberacion IS NULL AND t.activo = 1 AND t.fecha_salida IS NULL`, [parqueoId]);
  if (!rows[0]) throw new PagoError(404, 'No hay un parqueo activo');
  const online = Number(rows[0].precio_linea);
  if (!Number.isFinite(online) || online < 5) throw new PagoError(400, 'La tarifa en línea debe ser al menos Q5.00');
  return { efectivo: Number(rows[0].precio_efectivo), online };
}

/** El bloqueo del ticket también coordina con el procedimiento de pagos en efectivo. */
export async function reservar(parqueoId: number, usuario: number, modo: ModoPago, montoEsperado: number) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [tickets] = await conn.query<RowDataPacket[]>(
      `SELECT t.id_ticket, t.placa, t.id_tipo, tv.precio_linea FROM Tickets t
       JOIN Parqueos p ON p.id_ticket = t.id_ticket JOIN Tipo_vehiculo tv ON tv.id_tipo = t.id_tipo
       WHERE p.id_parqueo = ? AND p.fecha_liberacion IS NULL AND t.activo = 1 AND t.fecha_salida IS NULL FOR UPDATE`, [parqueoId]);
    const ticket = tickets[0];
    if (!ticket) throw new PagoError(404, 'No hay un parqueo activo');
    const [pagos] = await conn.query<PagoOnline[]>('SELECT * FROM Pagos WHERE id_ticket = ? ORDER BY id_pago DESC FOR UPDATE', [ticket.id_ticket]);
    const existente = pagos[0];
    if (existente) {
      if (pagos.some(p => p.estado_pago === 'completado')) throw new PagoError(409, 'Este parqueo ya está pagado');
      if (existente.id_usuario !== usuario || gateway(existente)?.modo !== modo) throw new PagoError(409, 'Este ticket ya tiene un pago en otro usuario o ambiente');
      if (existente.estado_pago === 'reembolsado') throw new PagoError(409, 'Este pago requiere revisión administrativa');
      if (Math.round(Number(existente.monto) * 100) !== Math.round(montoEsperado * 100)) throw new PagoError(409, 'El pago pendiente tiene otra tarifa. Continúa desde tu historial de pagos');
      await conn.commit();
      return { pago: existente, nuevo: false };
    }
    const monto = Number(ticket.precio_linea);
    if (!Number.isFinite(monto) || monto < 5) throw new PagoError(400, 'La tarifa en línea debe ser al menos Q5.00');
    if (Math.round(monto * 100) !== Math.round(montoEsperado * 100)) throw new PagoError(409, 'La tarifa cambió. Consulta de nuevo tu parqueo');
    const referencia = generarReferencia();
    const [insert] = await conn.query<ResultSetHeader>(
      `INSERT INTO Pagos (id_ticket, id_usuario, placa, id_tipo, metodo_pago, monto, codigo_validacion, estado_pago, gateway_response, observacion)
       VALUES (?, ?, ?, ?, 'linea', ?, ?, 'pendiente', ?, ?)`,
      [ticket.id_ticket, usuario, ticket.placa, ticket.id_tipo, monto, referencia, JSON.stringify({ modo }), modo === 'live' ? 'Recurrente' : `PRUEBA ${modo}: sin dinero real`]);
    await conn.commit();
    return { nuevo: true, pago: { id_pago: insert.insertId, id_ticket: ticket.id_ticket, id_usuario: usuario, placa: ticket.placa,
      monto, codigo_validacion: referencia, estado_pago: 'pendiente', transaction_id: null, gateway_response: { modo } } as PagoOnline };
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}

export async function porReferencia(referencia: string, usuario?: number) {
  const [rows] = await getPool().query<PagoOnline[]>(
    `SELECT * FROM Pagos WHERE codigo_validacion = ? AND metodo_pago = 'linea'${usuario === undefined ? '' : ' AND id_usuario = ?'}`,
    usuario === undefined ? [referencia] : [referencia, usuario]);
  if (!rows[0]) throw new PagoError(404, 'Pago no encontrado');
  return rows[0];
}

export async function guardarCheckout(pago: PagoOnline, checkout: { id: string; url_pago: string }) {
  await getPool().query(`UPDATE Pagos SET transaction_id = ?, gateway_response = ? WHERE id_pago = ? AND (transaction_id IS NULL OR transaction_id = ?)`,
    [checkout.id, JSON.stringify({ modo: gateway(pago).modo, url_pago: checkout.url_pago }), pago.id_pago, checkout.id]);
}

export async function actualizarEstado(id: number, estado: 'completado' | 'fallido' | 'pendiente') {
  // Idempotente: un rechazo tardío o una entrega repetida no revierte un pago confirmado.
  await getPool().query(`UPDATE Pagos SET estado_pago = ?, fecha_confirmacion = IF(? = 'completado', NOW(), fecha_confirmacion)
    WHERE id_pago = ? AND estado_pago IN ('pendiente', 'fallido')`, [estado, estado, id]);
}

export async function pendientes(ultimoId = 0) {
  const [rows] = await getPool().query<PagoOnline[]>(`SELECT * FROM Pagos WHERE metodo_pago = 'linea'
    AND estado_pago IN ('pendiente', 'fallido') AND transaction_id LIKE 'ch_%'
    AND id_pago > ? ORDER BY id_pago LIMIT 100`, [ultimoId]);
  return rows;
}
