import { randomBytes } from 'node:crypto';
import { PagoError } from '../services/pasarela.service';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Pago, FilaReporteMensual, PagoHistorial } from '../models';

export async function listar(): Promise<Pago[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, pg.placa,
            pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
            pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
            pg.codigo_validacion, pg.fecha_pago, pg.fecha_confirmacion
     FROM Pagos pg
     JOIN Tickets t ON t.id_ticket = pg.id_ticket
     LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
     ORDER BY pg.fecha_pago DESC`,
  );
  return rows as Pago[];
}

export async function obtenerPorId(id: number): Promise<Pago | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, pg.placa,
            pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
            pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
            pg.codigo_validacion, pg.fecha_pago, pg.fecha_confirmacion
     FROM Pagos pg
     JOIN Tickets t ON t.id_ticket = pg.id_ticket
     LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
     WHERE pg.id_pago = ? LIMIT 1`,
    [id],
  );
  return (rows as (Pago & RowDataPacket)[])[0] ?? null;
}

export async function obtenerPorTicket(idTicket: number): Promise<Pago | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, pg.placa,
            pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
            pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
            pg.codigo_validacion, pg.fecha_pago, pg.fecha_confirmacion
     FROM Pagos pg
     JOIN Tickets t ON t.id_ticket = pg.id_ticket
     LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
     WHERE pg.id_ticket = ? LIMIT 1`,
    [idTicket],
  );
  return (rows as (Pago & RowDataPacket)[])[0] ?? null;
}

export async function reporteMensual(): Promise<FilaReporteMensual[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(pg.fecha_pago, '%Y-%m') AS mes,
            COUNT(*) AS cantidad_pagos,
            COALESCE(SUM(pg.monto), 0) AS total_cobrado
     FROM Pagos pg
     WHERE pg.estado_pago = 'completado'
     GROUP BY mes
     ORDER BY mes DESC`,
  );
  return rows as FilaReporteMensual[];
}

export interface FilaReporteDetallado {
  id: number;
  ticket: string;
  placa: string;
  tipo_vehiculo: string;
  pagador: string;
  metodo: string;
  monto: number;
  estado: string;
  fecha_pago: string;
  lugar: string;
  zona: string;
}

export async function reporteDetallado(anio: number, mes: number): Promise<FilaReporteDetallado[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pg.id_pago AS id, t.numero_ticket AS ticket, pg.placa,
            tv.nombre AS tipo_vehiculo,
            CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS pagador,
            pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
            pg.fecha_pago,
            COALESCE(l.codigo, 'N/A') AS lugar,
            COALESCE(z.nombre, 'N/A') AS zona
     FROM Pagos pg
     JOIN Tickets t ON t.id_ticket = pg.id_ticket
     JOIN Tipo_vehiculo tv ON tv.id_tipo = pg.id_tipo
     LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
     LEFT JOIN Parqueos p ON p.id_ticket = t.id_ticket
     LEFT JOIN Lugares l ON l.id_lugar = p.id_lugar
     LEFT JOIN Zonas z ON z.id_zona = l.id_zona
     WHERE YEAR(pg.fecha_pago) = ? AND MONTH(pg.fecha_pago) = ?
     ORDER BY pg.fecha_pago DESC`,
    [anio, mes],
  );
  return rows as FilaReporteDetallado[];
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

export interface ResultadoPagoEfectivo {
  id: number;
  monto: number;
  dueno_email: string | null;
  dueno_nombre: string | null;
  placa: string;
  ticket: string;
  lugar: string;
  zona: string;
  codigo_validacion: string;
}

export async function crearEfectivo(datos: DatosPagoEfectivo): Promise<ResultadoPagoEfectivo> {
  const placa = datos.placa.trim().toUpperCase();
  if (!/^[PM][0-9]{3}[A-Z]{3}$/.test(placa)) throw new PagoError(400, 'Placa inválida. Ejemplo: P123ABC');
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [tickets] = await conn.query<RowDataPacket[]>(
      `SELECT t.id_ticket, t.id_usuario, t.id_tipo, tv.precio_efectivo,
              t.numero_ticket, l.codigo AS lugar, z.nombre AS zona
       FROM Tickets t
       JOIN Tipo_vehiculo tv ON tv.id_tipo = t.id_tipo
       LEFT JOIN Parqueos p ON p.id_ticket = t.id_ticket
       LEFT JOIN Lugares l ON l.id_lugar = p.id_lugar
       LEFT JOIN Zonas z ON z.id_zona = l.id_zona
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

    let dueno_email: string | null = null;
    let dueno_nombre: string | null = null;
    if (ticket.id_usuario) {
      const [usuarios] = await conn.query<RowDataPacket[]>(
        'SELECT correo, nombres, apellidos FROM Usuarios WHERE id_usuario = ?', [ticket.id_usuario]);
      if (usuarios[0]?.correo) {
        dueno_email = usuarios[0].correo;
        dueno_nombre = `${usuarios[0].nombres} ${usuarios[0].apellidos}`;
      }
    }

    await conn.commit();
    return {
      id: insert.insertId,
      monto,
      dueno_email,
      dueno_nombre,
      placa,
      ticket: ticket.numero_ticket,
      lugar: ticket.lugar ?? 'N/A',
      zona: ticket.zona ?? 'N/A',
      codigo_validacion: referencia,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
