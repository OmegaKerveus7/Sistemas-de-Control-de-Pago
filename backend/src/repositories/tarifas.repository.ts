import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Tarifa } from '../models';

const SELECT_BASE = `
  SELECT
    t.id_tarifa, t.id_tipo_vehiculo, tv.nom_tipo_vehiculo, t.id_tipo_pago, tp.nom_tipo_pago,
    t.precio, t.costo_transaccion, t.ganancia, t.activo, t.fecha_creacion, t.fecha_modificacion
  FROM Tarifas t
  JOIN Tipo_vehiculos tv ON tv.id_modelo = t.id_tipo_vehiculo
  JOIN Tipos_pagos tp ON tp.id_tipo_pago = t.id_tipo_pago
`;

export async function listar(): Promise<Tarifa[]> {
  const pool = getPool();
  const [rows] = await pool.query(`${SELECT_BASE} ORDER BY tv.nom_tipo_vehiculo, tp.nom_tipo_pago`);
  return rows as Tarifa[];
}

export async function obtenerPorId(id: number): Promise<Tarifa | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_BASE} WHERE t.id_tarifa = ?`, [id]);
  return (rows as unknown as Tarifa[])[0] ?? null;
}

export interface DatosTarifa {
  id_tipo_vehiculo: number;
  id_tipo_pago: number;
  precio: number;
  costo_transaccion: number | null;
}

function calcularGanancia(precio: number, costoTransaccion: number | null): number | null {
  return costoTransaccion == null ? null : Number((precio - costoTransaccion).toFixed(2));
}

export async function crear(datos: DatosTarifa): Promise<number> {
  const pool = getPool();
  const ganancia = calcularGanancia(datos.precio, datos.costo_transaccion);
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO Tarifas (id_tipo_vehiculo, id_tipo_pago, precio, costo_transaccion, ganancia, activo)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [datos.id_tipo_vehiculo, datos.id_tipo_pago, datos.precio, datos.costo_transaccion, ganancia],
  );
  return result.insertId;
}

export async function actualizar(
  id: number,
  datos: Partial<DatosTarifa> & { activo?: boolean },
): Promise<boolean> {
  const pool = getPool();
  const actual = await obtenerPorId(id);
  if (!actual) return false;

  const precio = datos.precio ?? actual.precio;
  const costoTransaccion = datos.costo_transaccion !== undefined ? datos.costo_transaccion : actual.costo_transaccion;
  const ganancia = calcularGanancia(precio, costoTransaccion);

  const sets: string[] = ['precio = ?', 'costo_transaccion = ?', 'ganancia = ?', 'fecha_modificacion = NOW()'];
  const values: Array<string | number | null> = [precio, costoTransaccion, ganancia];

  if (datos.activo !== undefined) {
    sets.push('activo = ?');
    values.push(datos.activo ? 1 : 0);
  }

  values.push(id);

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE Tarifas SET ${sets.join(', ')} WHERE id_tarifa = ?`,
    values,
  );
  return result.affectedRows > 0;
}

export async function existeCombinacion(idTipoVehiculo: number, idTipoPago: number): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id_tarifa FROM Tarifas WHERE id_tipo_vehiculo = ? AND id_tipo_pago = ? LIMIT 1',
    [idTipoVehiculo, idTipoPago],
  );
  return rows.length > 0;
}
