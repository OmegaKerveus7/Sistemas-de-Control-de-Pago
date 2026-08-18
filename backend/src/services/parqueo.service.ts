import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Parqueo } from '../models';

const SELECT_BASE = `
  SELECT id_parqueo AS id, placa, hora_entrada, hora_salida, costo, estado, ticket,
         creado_en, actualizado_en
  FROM parqueo
`;

export async function listar(): Promise<Parqueo[]> {
  const pool = getPool();
  const [rows] = await pool.query(`${SELECT_BASE} ORDER BY creado_en DESC`);
  return rows as Parqueo[];
}

export async function obtenerPorId(id: number): Promise<Parqueo | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BASE} WHERE id_parqueo = ?`, [id]);
  return (rows as unknown as Parqueo[])[0] ?? null;
}

export async function obtenerActivoPorPlaca(placa: string): Promise<Parqueo | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_BASE} WHERE placa = ? AND estado = 'activo' ORDER BY id_parqueo DESC LIMIT 1`,
    [placa.toUpperCase()],
  );
  return (rows as unknown as Parqueo[])[0] ?? null;
}

export async function registrarEntrada(placa: string): Promise<number> {
  const pool = getPool();
  const ticket = `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO parqueo (placa, hora_entrada, estado, ticket)
     VALUES (?, NOW(), 'activo', ?)`,
    [placa.toUpperCase(), ticket],
  );
  return result.insertId;
}

export async function registrarSalida(id: number, costo: number): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE parqueo SET hora_salida = NOW(), costo = ?, estado = 'completado'
     WHERE id_parqueo = ? AND estado = 'activo'`,
    [costo, id],
  );
  return result.affectedRows > 0;
}

export async function cancelar(id: number): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE parqueo SET estado = 'cancelado' WHERE id_parqueo = ?`,
    [id],
  );
  return result.affectedRows > 0;
}