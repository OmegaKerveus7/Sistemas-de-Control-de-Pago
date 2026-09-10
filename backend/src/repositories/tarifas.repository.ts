import { getPool } from '../config/database';
import type { Tarifa } from '../models';

export async function listar(): Promise<Tarifa[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_tarifas_listar()');
  return (results as unknown as [Tarifa[]])[0];
}

export async function obtenerPorId(id: number): Promise<Tarifa | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_tarifas_obtener_por_id(?)', [id]);
  return (results as unknown as [Tarifa[]])[0][0] ?? null;
}

export interface DatosTarifa {
  id_tipo_vehiculo: number;
  precio_efectivo: number;
  precio_linea: number;
}

export async function crear(datos: DatosTarifa): Promise<number> {
  const conn = await getPool().getConnection();
  try {
    await conn.query('CALL sp_tarifas_crear(?, ?, ?, @id_tarifa)', [
      datos.id_tipo_vehiculo,
      datos.precio_efectivo,
      datos.precio_linea,
    ]);
    const [rows] = await conn.query('SELECT @id_tarifa AS id_tarifa');
    return (rows as Array<{ id_tarifa: number }>)[0]!.id_tarifa;
  } finally {
    conn.release();
  }
}

export async function actualizar(
  id: number,
  datos: Partial<DatosTarifa>,
): Promise<boolean> {
  const actual = await obtenerPorId(id);
  if (!actual) return false;

  const precioEfectivo = datos.precio_efectivo ?? actual.precio_efectivo;
  const precioLinea = datos.precio_linea ?? actual.precio_linea;

  const conn = await getPool().getConnection();
  try {
    await conn.query('CALL sp_tarifas_actualizar(?, ?, ?, @afectado)', [
      id,
      precioEfectivo,
      precioLinea,
    ]);
    const [rows] = await conn.query('SELECT @afectado AS afectado');
    return Boolean((rows as Array<{ afectado: number }>)[0]!.afectado);
  } finally {
    conn.release();
  }
}
