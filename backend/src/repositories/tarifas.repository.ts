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
  id_tipo_pago: number;
  precio: number;
  costo_transaccion: number | null;
}

export async function crear(datos: DatosTarifa): Promise<number> {
  const conn = await getPool().getConnection();
  try {
    await conn.query('CALL sp_tarifas_crear(?, ?, ?, ?, @id_tarifa)', [
      datos.id_tipo_vehiculo,
      datos.id_tipo_pago,
      datos.precio,
      datos.costo_transaccion,
    ]);
    const [rows] = await conn.query('SELECT @id_tarifa AS id_tarifa');
    return (rows as Array<{ id_tarifa: number }>)[0]!.id_tarifa;
  } finally {
    conn.release();
  }
}

export async function actualizar(
  id: number,
  datos: Partial<DatosTarifa> & { activo?: boolean },
): Promise<boolean> {
  const actual = await obtenerPorId(id);
  if (!actual) return false;

  const precio = datos.precio ?? actual.precio;
  const costoTransaccion = datos.costo_transaccion !== undefined ? datos.costo_transaccion : actual.costo_transaccion;
  const activoProvisto = datos.activo !== undefined;

  const conn = await getPool().getConnection();
  try {
    await conn.query('CALL sp_tarifas_actualizar(?, ?, ?, ?, ?, @afectado)', [
      id,
      precio,
      costoTransaccion,
      activoProvisto ? (datos.activo ? 1 : 0) : null,
      activoProvisto ? 1 : 0,
    ]);
    const [rows] = await conn.query('SELECT @afectado AS afectado');
    return Boolean((rows as Array<{ afectado: number }>)[0]!.afectado);
  } finally {
    conn.release();
  }
}

export async function existeCombinacion(idTipoVehiculo: number, idTipoPago: number): Promise<boolean> {
  const conn = await getPool().getConnection();
  try {
    await conn.query('CALL sp_tarifas_existe_combinacion(?, ?, @existe)', [idTipoVehiculo, idTipoPago]);
    const [rows] = await conn.query('SELECT @existe AS existe');
    return Boolean((rows as Array<{ existe: number }>)[0]!.existe);
  } finally {
    conn.release();
  }
}
