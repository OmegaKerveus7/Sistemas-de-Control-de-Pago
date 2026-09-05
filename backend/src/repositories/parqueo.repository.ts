import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Parqueo } from '../models';

const SELECT_BASE = `
  SELECT
    p.id_parqueo AS id, p.id_lugar, l.lugar, z.nom_zona AS zona,
    p.id_ticket, t.numero_ticket AS ticket, t.placa_automovil AS placa,
    t.fecha_entrada, t.fecha_salida,
    p.fecha_ocupacion, p.fecha_liberacion,
    el.nom_estado AS estado_lugar,
    pg.monto_total AS costo, pg.estado_pago,
    CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado
  FROM Parqueos p
  JOIN Lugares l ON l.id_lugar = p.id_lugar
  JOIN Zonas z ON z.id_zona = l.id_zona
  JOIN Estados_Lugares el ON el.id_estado_lugar = l.id_estado_lugar
  LEFT JOIN Tickets t ON t.id_ticket = p.id_ticket
  LEFT JOIN Pagos pg ON pg.id_ticket = t.id_ticket
`;

export async function listar(): Promise<Parqueo[]> {
  const pool = getPool();
  const [rows] = await pool.query(`${SELECT_BASE} ORDER BY p.id_parqueo DESC`);
  return rows as Parqueo[];
}

export async function obtenerPorId(id: number): Promise<Parqueo | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BASE} WHERE p.id_parqueo = ?`, [id]);
  return (rows as unknown as Parqueo[])[0] ?? null;
}

export async function obtenerActivoPorPlaca(placa: string): Promise<Parqueo | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_BASE} WHERE t.placa_automovil = ? AND p.fecha_liberacion IS NULL ORDER BY p.id_parqueo DESC LIMIT 1`,
    [placa.toUpperCase()],
  );
  return (rows as unknown as Parqueo[])[0] ?? null;
}

export async function historialPorPlaca(
  placa: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<Parqueo[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_BASE}
     WHERE t.placa_automovil = ? AND DATE(p.fecha_ocupacion) BETWEEN ? AND ?
     ORDER BY p.fecha_ocupacion DESC`,
    [placa.toUpperCase(), fechaInicio, fechaFin],
  );
  return rows as unknown as Parqueo[];
}

// TODO(pagos): pagos.controller.ts todavía depende de esta función legacy para su flujo de
// pago online (gateway/tarjeta), que apunta a una tabla `parqueo` que no existe en la BD real.
// Se corrige junto con el módulo de Pagos.
export async function registrarSalida(id: number, costo: number): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE parqueo SET hora_salida = NOW(), costo = ?, estado = 'completado'
     WHERE id_parqueo = ? AND estado = 'activo'`,
    [costo, id],
  );
  return result.affectedRows > 0;
}
