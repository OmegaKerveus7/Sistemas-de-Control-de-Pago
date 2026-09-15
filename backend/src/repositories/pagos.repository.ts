import { randomBytes } from 'node:crypto';
import { PagoError } from '../services/pasarela.service';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Pago, FilaReporteMensual, PagoHistorial } from '../models';

export async function listar(): Promise<Pago[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_pagos_listar()');
  return (results as unknown as [Pago[]])[0];
}

export async function obtenerPorId(id: number): Promise<Pago | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_pagos_obtener_por_id(?)', [id]);
  return (results as unknown as [Pago[]])[0][0] ?? null;
}

export async function obtenerPorTicket(idTicket: number): Promise<Pago | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_pagos_obtener_por_ticket(?)', [idTicket]);
  return (results as unknown as [Pago[]])[0][0] ?? null;
}

export async function reporteMensual(): Promise<FilaReporteMensual[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_pagos_reporte_mensual()');
  return (results as unknown as [FilaReporteMensual[]])[0];
}

/** Historial de pagos del usuario autenticado. */
export async function listarPorUsuario(idUsuario: number): Promise<PagoHistorial[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pg.id_pago AS id, pg.codigo_validacion, pg.monto, pg.estado_pago, pg.metodo_pago,
            pg.fecha_pago, pg.fecha_confirmacion,
            t.numero_ticket, t.placa, t.fecha_entrada, t.fecha_salida,
            l.codigo AS lugar, z.nombre AS zona
     FROM Pagos pg
     JOIN Tickets t ON t.id_ticket = pg.id_ticket
     LEFT JOIN Parqueos p ON p.id_ticket = t.id_ticket
     LEFT JOIN Lugares l ON l.id_lugar = p.id_lugar
     LEFT JOIN Zonas z ON z.id_zona = l.id_zona
     WHERE pg.id_usuario = ?
     ORDER BY pg.fecha_pago DESC`,
    [idUsuario],
  );
  return rows as PagoHistorial[];
}

export interface DatosPagoEfectivo {
  placa: string;
  id_tipo_vehiculo: number;
  id_guardia: number;
}

export async function crearEfectivo(datos: DatosPagoEfectivo): Promise<{ id: number; monto: number }> {
  const placa = datos.placa.trim().toUpperCase();
  if (!/^[PM][0-9]{3}[A-Z]{3}$/.test(placa)) throw new PagoError(400, 'Placa inválida. Ejemplo: P123ABC');
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    // El mismo bloqueo de ticket que utiliza el pago en línea evita cobros simultáneos.
    const [tickets] = await conn.query<RowDataPacket[]>(
      `SELECT t.id_ticket, t.id_usuario, t.id_tipo, tv.precio_efectivo
       FROM Tickets t JOIN Tipo_vehiculo tv ON tv.id_tipo = t.id_tipo
       WHERE t.placa = ? AND t.activo = 1 AND t.fecha_salida IS NULL
       ORDER BY t.id_ticket DESC LIMIT 1 FOR UPDATE`, [placa]);
    const ticket = tickets[0];
    if (!ticket) throw new PagoError(404, 'No hay un ticket activo para esa placa');
    const [pagos] = await conn.query<RowDataPacket[]>(
      'SELECT id_pago, estado_pago FROM Pagos WHERE id_ticket = ? FOR UPDATE', [ticket.id_ticket]);
    if (pagos.some(p => p.estado_pago === 'completado')) throw new PagoError(409, 'Este ticket ya está pagado; no se puede cobrar otra vez');
    if (pagos.length) throw new PagoError(409, 'Este ticket ya tiene un pago registrado. Revisa ese pago antes de cobrar en efectivo');
    if (Number(ticket.id_tipo) !== datos.id_tipo_vehiculo) throw new PagoError(400, 'El tipo seleccionado no coincide con el vehículo del ticket');
    const monto = Number(ticket.precio_efectivo);
    if (!Number.isFinite(monto) || monto <= 0) throw new PagoError(400, 'No existe una tarifa en efectivo válida para este vehículo');
    const referencia = `E-${randomBytes(9).toString('hex')}`;
    const [insert] = await conn.query<ResultSetHeader>(
      `INSERT INTO Pagos (id_ticket, id_usuario, placa, id_tipo, metodo_pago, monto,
        codigo_validacion, estado_pago, fecha_pago, fecha_confirmacion, observacion)
       VALUES (?, ?, ?, ?, 'efectivo', ?, ?, 'completado', NOW(), NOW(), ?)`,
      [ticket.id_ticket, ticket.id_usuario ?? datos.id_guardia, placa, ticket.id_tipo, monto,
       referencia, `Cobro en efectivo registrado por guardia ${datos.id_guardia}`]);
    await conn.commit();
    return { id: insert.insertId, monto };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
