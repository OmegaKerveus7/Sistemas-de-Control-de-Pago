import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Pago, PagoLegacy, FilaReporteMensual } from '../models';

const SELECT_BASE = `
  SELECT
    pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, t.placa_automovil AS placa,
    pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
    tp.nom_tipo_pago AS metodo, pg.monto_total AS monto, pg.estado_pago AS estado,
    pg.codigo_pago, pg.fecha_pago, pg.fecha_confirmacion,
    pg.id_guardia, g.nombres AS guardia_nombres, g.apellidos AS guardia_apellidos
  FROM Pagos pg
  JOIN Tickets t ON t.id_ticket = pg.id_ticket
  JOIN Usuarios u ON u.id_usuarios = pg.id_usuario
  JOIN Tipos_pagos tp ON tp.id_tipo_pago = pg.id_tipo_pago
  LEFT JOIN Usuarios g ON g.id_usuarios = pg.id_guardia
`;

export async function listar(): Promise<Pago[]> {
  const pool = getPool();
  const [rows] = await pool.query(`${SELECT_BASE} ORDER BY pg.fecha_pago DESC`);
  return rows as Pago[];
}

export async function obtenerPorId(id: number): Promise<Pago | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BASE} WHERE pg.id_pago = ?`, [id]);
  return (rows as unknown as Pago[])[0] ?? null;
}

export async function obtenerPorTicket(idTicket: number): Promise<Pago | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BASE} WHERE pg.id_ticket = ?`, [idTicket]);
  return (rows as unknown as Pago[])[0] ?? null;
}

export async function reporteMensual(): Promise<FilaReporteMensual[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(fecha_pago, '%Y-%m') AS mes,
            COUNT(*) AS cantidad_pagos,
            COALESCE(SUM(monto_total), 0) AS total_cobrado
     FROM Pagos
     WHERE estado_pago = 'completado'
     GROUP BY mes
     ORDER BY mes DESC`,
  );
  return rows as FilaReporteMensual[];
}

export interface DatosPagoEfectivo {
  placa: string;
  id_tipo_vehiculo: number;
  id_guardia: number;
}

const ID_TIPO_PAGO_EFECTIVO = 1;

export async function crearEfectivo(datos: DatosPagoEfectivo): Promise<{ id: number; monto: number }> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [ticketRows] = await conn.query<RowDataPacket[]>(
      `SELECT id_ticket, id_usuario FROM Tickets
       WHERE UPPER(placa_automovil) = ? AND activo = 1 AND fecha_salida IS NULL
       ORDER BY id_ticket DESC LIMIT 1 FOR UPDATE`,
      [datos.placa.toUpperCase()],
    );
    const ticket = ticketRows[0];
    if (!ticket) throw new Error('No hay un ticket activo para esa placa');

    const [pagoExistente] = await conn.query<RowDataPacket[]>(
      'SELECT id_pago FROM Pagos WHERE id_ticket = ? LIMIT 1',
      [ticket.id_ticket],
    );
    if (pagoExistente[0]) throw new Error('Este ticket ya tiene un pago registrado');

    const [tarifaRows] = await conn.query<RowDataPacket[]>(
      `SELECT id_tarifa, precio FROM Tarifas
       WHERE id_tipo_vehiculo = ? AND id_tipo_pago = ? AND activo = 1 LIMIT 1`,
      [datos.id_tipo_vehiculo, ID_TIPO_PAGO_EFECTIVO],
    );
    const tarifa = tarifaRows[0];
    if (!tarifa) throw new Error('No existe una tarifa en efectivo para este tipo de vehículo');

    const idUsuario = ticket.id_usuario ?? datos.id_guardia;
    const codigoPago = `PAGO-${Date.now().toString(36).toUpperCase()}`;

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO Pagos (id_ticket, id_tarifa, id_usuario, id_tipo_pago, monto_total, monto_neto, codigo_pago, estado_pago, fecha_pago, fecha_confirmacion, id_guardia)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'completado', NOW(), NOW(), ?)`,
      [ticket.id_ticket, tarifa.id_tarifa, idUsuario, ID_TIPO_PAGO_EFECTIVO, tarifa.precio, tarifa.precio, codigoPago, datos.id_guardia],
    );

    await conn.commit();
    return { id: result.insertId, monto: Number(tarifa.precio) };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// ==================== LEGACY: flujo de pago en línea (pasarela) ====================
// TODO(pagos-online): sigue apuntando a una tabla `pagos` que no existe en la BD real.
// Pendiente de rediseño (requiere resolver id_ticket/id_tarifa desde el parqueo, igual que
// se hizo arriba para el pago en efectivo). Fuera del alcance de "pagos en efectivo".

const SELECT_LEGACY = `
  SELECT id_pago AS id, parqueo_id, monto, metodo, estado, referencia,
         ip_inicio, ip_pago, procesado_por, creado_en
  FROM pagos
`;

export async function obtenerPorReferencia(referencia: string): Promise<PagoLegacy | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_LEGACY} WHERE referencia = ? LIMIT 1`,
    [referencia],
  );
  return (rows as unknown as PagoLegacy[])[0] ?? null;
}

export async function crearLegacy(data: PagoLegacy): Promise<number> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO pagos (parqueo_id, monto, metodo, estado, referencia, ip_inicio, ip_pago, procesado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.parqueo_id,
      data.monto,
      data.metodo,
      data.estado ?? 'pendiente',
      data.referencia ?? null,
      data.ip_inicio ?? null,
      data.ip_pago ?? null,
      data.procesado_por ?? null,
    ],
  );
  return result.insertId;
}

export async function confirmarLegacy(id: number, referencia: string, ipPago: string): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE pagos SET estado = 'completado', referencia = ?, ip_pago = ?
     WHERE id_pago = ? AND estado = 'pendiente'`,
    [referencia, ipPago, id],
  );
  return result.affectedRows > 0;
}
