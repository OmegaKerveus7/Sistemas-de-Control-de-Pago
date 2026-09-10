import { getPool } from '../config/database';
import type { Parqueo } from '../models';

export async function listar(): Promise<Parqueo[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_parqueo_listar()');
  return (results as unknown as [Parqueo[]])[0];
}

export async function obtenerPorId(id: number): Promise<Parqueo | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_parqueo_obtener_por_id(?)', [id]);
  return (results as unknown as [Parqueo[]])[0][0] ?? null;
}

export async function obtenerActivoPorPlaca(placa: string): Promise<Parqueo | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_parqueo_obtener_activo_por_placa(?)', [placa.toUpperCase()]);
  return (results as unknown as [Parqueo[]])[0][0] ?? null;
}

export async function historialPorPlaca(
  placa: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<Parqueo[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_parqueo_historial_por_placa(?, ?, ?)', [
    placa.toUpperCase(),
    fechaInicio,
    fechaFin,
  ]);
  return (results as unknown as [Parqueo[]])[0];
}
