import { getPool, sql } from '../config/database';
import type { Pago } from '../models';

export async function listar(): Promise<Pago[]> {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT * FROM Pagos ORDER BY creado_en DESC');
  return result.recordset;
}

export async function obtenerPorId(id: number): Promise<Pago | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM Pagos WHERE id = @id');
  return result.recordset[0] ?? null;
}

export async function obtenerPorParqueo(parqueoId: number): Promise<Pago | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('parqueo_id', sql.Int, parqueoId)
    .query('SELECT * FROM Pagos WHERE parqueo_id = @parqueo_id');
  return result.recordset[0] ?? null;
}

export async function crear(data: Pago): Promise<number> {
  const pool = await getPool();
  const result = await pool.request()
    .input('parqueo_id', sql.Int, data.parqueo_id)
    .input('monto', sql.Decimal(10, 2), data.monto)
    .input('metodo', sql.NVarChar, data.metodo)
    .input('procesado_por', sql.Int, data.procesado_por ?? null)
    .query(`INSERT INTO Pagos (parqueo_id, monto, metodo, estado, procesado_por)
            VALUES (@parqueo_id, @monto, @metodo, 'completado', @procesado_por);
            SELECT SCOPE_IDENTITY() AS id;`);
  return result.recordset[0]!.id;
}
