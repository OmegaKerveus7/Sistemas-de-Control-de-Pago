import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Pago, FilaReporteMensual } from '../models';

const SELECT_BASE = `
  SELECT id_pago AS id, parqueo_id, monto, metodo, estado, referencia,
         ip_inicio, ip_pago, procesado_por, creado_en
  FROM pagos
`;

export async function listar(): Promise<Pago[]> {
  const pool = getPool();
  const [rows] = await pool.query(`${SELECT_BASE} ORDER BY creado_en DESC`);
  return rows as Pago[];
}

export async function obtenerPorId(id: number): Promise<Pago | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BASE} WHERE id_pago = ?`, [id]);
  return (rows as unknown as Pago[])[0] ?? null;
}

export async function obtenerPorParqueo(parqueoId: number): Promise<Pago | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_BASE} WHERE parqueo_id = ? ORDER BY creado_en DESC LIMIT 1`,
    [parqueoId],
  );
  return (rows as unknown as Pago[])[0] ?? null;
}

export async function obtenerPorReferencia(referencia: string): Promise<Pago | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_BASE} WHERE referencia = ? LIMIT 1`,
    [referencia],
  );
  return (rows as unknown as Pago[])[0] ?? null;
}

export async function crear(data: Pago): Promise<number> {
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

export async function confirmar(id: number, referencia: string, ipPago: string): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE pagos SET estado = 'completado', referencia = ?, ip_pago = ?
     WHERE id_pago = ? AND estado = 'pendiente'`,
    [referencia, ipPago, id],
  );
  return result.affectedRows > 0;
}

export async function reporteMensual(): Promise<FilaReporteMensual[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(creado_en, '%Y-%m') AS mes,
            COUNT(*) AS cantidad_pagos,
            COALESCE(SUM(monto), 0) AS total_cobrado
     FROM pagos
     WHERE estado = 'completado'
     GROUP BY mes
     ORDER BY mes DESC`,
  );
  return rows as FilaReporteMensual[];
}
