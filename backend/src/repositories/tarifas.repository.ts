import { getPool } from '../config/database';
import type { RowDataPacket } from 'mysql2/promise';
import type { Tarifa } from '../models';

export async function listar(): Promise<Tarifa[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT t.id_tarifa, tv.nombre AS tipo_vehiculo,
            t.precio_efectivo, t.precio_linea,
            (t.precio_linea - t.precio_efectivo) AS diferencia
     FROM Tarifas t
     JOIN Tipo_vehiculo tv ON tv.id_tipo = t.id_tipo_vehiculo
     ORDER BY t.id_tarifa`,
  );
  return rows as Tarifa[] & RowDataPacket[];
}

export async function obtenerPorId(id: number): Promise<Tarifa | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT t.id_tarifa, tv.nombre AS tipo_vehiculo,
            t.precio_efectivo, t.precio_linea,
            (t.precio_linea - t.precio_efectivo) AS diferencia
     FROM Tarifas t
     JOIN Tipo_vehiculo tv ON tv.id_tipo = t.id_tipo_vehiculo
     WHERE t.id_tarifa = ?
     LIMIT 1`,
    [id],
  );
  return (rows as (Tarifa & RowDataPacket)[])[0] ?? null;
}

export interface DatosTarifa {
  id_tipo_vehiculo: number;
  precio_efectivo: number;
  precio_linea: number;
}

export async function crear(datos: DatosTarifa): Promise<number> {
  const pool = getPool();
  const [result] = await pool.query(
    'INSERT INTO Tarifas (id_tipo_vehiculo, precio_efectivo, precio_linea) VALUES (?, ?, ?)',
    [datos.id_tipo_vehiculo, datos.precio_efectivo, datos.precio_linea],
  );
  return (result as { insertId: number }).insertId;
}

export async function actualizar(
  id: number,
  datos: Partial<DatosTarifa>,
): Promise<boolean> {
  const actual = await obtenerPorId(id);
  if (!actual) return false;

  const precioEfectivo = datos.precio_efectivo ?? actual.precio_efectivo;
  const precioLinea = datos.precio_linea ?? actual.precio_linea;

  const pool = getPool();
  const [result] = await pool.query(
    'UPDATE Tarifas SET precio_efectivo = ?, precio_linea = ? WHERE id_tarifa = ?',
    [precioEfectivo, precioLinea, id],
  );
  return (result as { affectedRows: number }).affectedRows > 0;
}
