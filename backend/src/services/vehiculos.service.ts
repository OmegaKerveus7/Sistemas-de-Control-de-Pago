import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Vehiculo } from '../models';

const SELECT_BASE = `
  SELECT id_vehiculo AS id, modelo_vehiculo AS modelo, foto_vehiculo
  FROM vehiculos
`;

export async function listar(): Promise<Vehiculo[]> {
  const pool = getPool();
  const [rows] = await pool.query(`${SELECT_BASE} ORDER BY id_vehiculo`);
  return rows as unknown as Vehiculo[];
}

export async function obtenerPorId(id: number): Promise<Vehiculo | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BASE} WHERE id_vehiculo = ?`, [id]);
  return (rows as unknown as Vehiculo[])[0] ?? null;
}

export async function obtenerPorPlaca(placa: string): Promise<Vehiculo | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BASE} WHERE modelo_vehiculo = ? LIMIT 1`, [placa]);
  return (rows as unknown as Vehiculo[])[0] ?? null;
}

export async function crear(data: Vehiculo): Promise<number> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO vehiculos (modelo_vehiculo, foto_vehiculo) VALUES (?, ?)',
    [data.modelo || data.placa, ''],
  );
  return result.insertId;
}

export async function actualizar(id: number, data: Partial<Vehiculo>): Promise<boolean> {
  const pool = getPool();
  if (data.modelo === undefined && data.placa === undefined) return false;
  const modelo = (data.modelo ?? data.placa) as string;
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE vehiculos SET modelo_vehiculo = ? WHERE id_vehiculo = ?',
    [modelo, id],
  );
  return result.affectedRows > 0;
}

export async function eliminar(id: number): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM vehiculos WHERE id_vehiculo = ?', [id]);
  return result.affectedRows > 0;
}