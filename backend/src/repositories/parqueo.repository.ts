import type { ResultSetHeader } from 'mysql2/promise';
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
