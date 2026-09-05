import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Vehiculo, VehiculoConDueno } from '../models';

export async function listar(): Promise<VehiculoConDueno[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_vehiculos_listar()');
  return (results as unknown as [VehiculoConDueno[]])[0];
}

export async function obtenerPorId(id: number): Promise<VehiculoConDueno | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_vehiculos_obtener_por_id(?)', [id]);
  return (results as unknown as [VehiculoConDueno[]])[0][0] ?? null;
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

export async function crear(data: Vehiculo): Promise<number> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO vehiculos (placa, marca, modelo, color, tipo, foto) VALUES (?, ?, ?, ?, ?, ?)',
    [data.placa.toUpperCase(), data.marca, data.modelo, data.color, data.tipo, data.foto ?? null],
  );
  return result.insertId;
}

export async function actualizar(id: number, data: Partial<Vehiculo>): Promise<boolean> {
  const pool = getPool();
  const sets: string[] = [];
  const values: Array<string | number | null> = [];

  if (data.placa !== undefined) { sets.push('placa = ?'); values.push(data.placa.toUpperCase()); }
  if (data.marca !== undefined) { sets.push('marca = ?'); values.push(data.marca); }
  if (data.modelo !== undefined) { sets.push('modelo = ?'); values.push(data.modelo); }
  if (data.color !== undefined) { sets.push('color = ?'); values.push(data.color); }
  if (data.tipo !== undefined) { sets.push('tipo = ?'); values.push(data.tipo); }
  if (data.foto !== undefined) { sets.push('foto = ?'); values.push(data.foto); }

  if (sets.length === 0) return false;
  values.push(id);

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE vehiculos SET ${sets.join(', ')} WHERE id_vehiculo = ?`,
    values,
  );
  return result.affectedRows > 0;
}

export async function eliminar(id: number): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM vehiculos WHERE id_vehiculo = ?', [id]);
  return result.affectedRows > 0;
}

// ==================== USUARIO_VEHICULOS ====================

export async function vehiculosPorUsuario(idUsuario: number): Promise<Vehiculo[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT v.id_vehiculo AS id, v.placa, v.marca, v.modelo, v.color, v.tipo, v.foto, v.creado_en
     FROM vehiculos v
     JOIN usuario_vehiculos uv ON uv.id_vehiculo = v.id_vehiculo
     WHERE uv.id_usuario = ?
     ORDER BY v.id_vehiculo`,
    [idUsuario],
  );
  return rows as unknown as Vehiculo[];
}

export async function asignarVehiculoAUsuario(idUsuario: number, idVehiculo: number): Promise<number> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO usuario_vehiculos (id_usuario, id_vehiculo) VALUES (?, ?)',
    [idUsuario, idVehiculo],
  );
  return (result as ResultSetHeader).insertId;
}

export async function removerVehiculoDeUsuario(idUsuario: number, idVehiculo: number): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM usuario_vehiculos WHERE id_usuario = ? AND id_vehiculo = ?',
    [idUsuario, idVehiculo],
  );
  return (result as ResultSetHeader).affectedRows > 0;
}

export async function usuarioTieneVehiculo(idUsuario: number, idVehiculo: number): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id_usuario_vehiculo FROM usuario_vehiculos WHERE id_usuario = ? AND id_vehiculo = ? LIMIT 1',
    [idUsuario, idVehiculo],
  );
  return (rows as unknown[]).length > 0;
}
