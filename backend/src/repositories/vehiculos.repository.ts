import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Vehiculo, VehiculoConDueno } from '../models';

export async function listar(): Promise<VehiculoConDueno[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_vehiculos_listar()');
  return (results as unknown as [VehiculoConDueno[]])[0];
}

export async function obtenerPorPlaca(placa: string): Promise<VehiculoConDueno | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_vehiculos_obtener_por_placa(?)', [placa.toUpperCase()]);
  return (results as unknown as [VehiculoConDueno[]])[0][0] ?? null;
}

export async function buscar(filtro: string): Promise<VehiculoConDueno[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_vehiculos_buscar(?)', [filtro]);
  return (results as unknown as [VehiculoConDueno[]])[0];
}

export async function crear(data: Vehiculo): Promise<string> {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO Vehiculos (placa, id_usuario, id_tipo, id_marca, color, activo)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [
      data.placa.toUpperCase(),
      data.id_usuario,
      data.id_tipo,
      data.id_marca ?? null,
      data.color ?? null,
    ],
  );
  return data.placa.toUpperCase();
}

export async function actualizar(placa: string, data: Partial<Vehiculo>): Promise<boolean> {
  const pool = getPool();
  const sets: string[] = [];
  const values: Array<string | number | null> = [];

  if (data.id_usuario !== undefined) { sets.push('id_usuario = ?'); values.push(data.id_usuario); }
  if (data.id_tipo !== undefined) { sets.push('id_tipo = ?'); values.push(data.id_tipo); }
  if (data.id_marca !== undefined) { sets.push('id_marca = ?'); values.push(data.id_marca); }
  if (data.color !== undefined) { sets.push('color = ?'); values.push(data.color); }
  if (data.activo !== undefined) { sets.push('activo = ?'); values.push(data.activo ? 1 : 0); }

  if (sets.length === 0) return false;
  values.push(placa.toUpperCase());

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE Vehiculos SET ${sets.join(', ')} WHERE UPPER(placa) = ?`,
    values,
  );
  return result.affectedRows > 0;
}

export async function eliminar(placa: string): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE Vehiculos SET activo = 0 WHERE UPPER(placa) = ?',
    [placa.toUpperCase()],
  );
  return result.affectedRows > 0;
}

/** Obtener vehículos de un usuario (por id_usuario en la tabla Vehiculos). */
export async function vehiculosPorUsuario(idUsuario: number): Promise<Vehiculo[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT v.placa, v.id_usuario, v.id_tipo, v.id_marca, v.color, v.activo, v.fecha_registro
     FROM Vehiculos v
     WHERE v.id_usuario = ?
     ORDER BY v.placa`,
    [idUsuario],
  );
  return rows as unknown as Vehiculo[];
}
