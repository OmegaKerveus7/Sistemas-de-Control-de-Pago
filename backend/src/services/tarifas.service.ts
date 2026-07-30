import { getPool, sql } from '../config/database';
import type { Tarifa } from '../models';

export async function listar(): Promise<Tarifa[]> {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM Tarifas ORDER BY tipo_vehiculo');
  return result.recordset;
}

export async function obtenerPorId(id: number): Promise<Tarifa | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM Tarifas WHERE id = @id');
  return result.recordset[0] ?? null;
}

export async function obtenerPorTipoVehiculo(tipo: string): Promise<Tarifa | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('tipo', sql.NVarChar, tipo)
    .query('SELECT * FROM Tarifas WHERE tipo_vehiculo = @tipo AND activo = 1');
  return result.recordset[0] ?? null;
}

export async function crear(data: Tarifa): Promise<number> {
  const pool = await getPool();
  const result = await pool.request()
    .input('tipo_vehiculo', sql.NVarChar, data.tipo_vehiculo)
    .input('costo_por_hora', sql.Decimal(10, 2), data.costo_por_hora)
    .input('costo_maximo_diario', sql.Decimal(10, 2), data.costo_maximo_diario ?? null)
    .query(`INSERT INTO Tarifas (tipo_vehiculo, costo_por_hora, costo_maximo_diario, activo)
            VALUES (@tipo_vehiculo, @costo_por_hora, @costo_maximo_diario, 1);
            SELECT SCOPE_IDENTITY() AS id;`);
  return result.recordset[0]!.id;
}

export async function actualizar(id: number, data: Partial<Tarifa>): Promise<boolean> {
  const pool = await getPool();
  const request = pool.request().input('id', sql.Int, id);
  const sets: string[] = [];

  if (data.tipo_vehiculo !== undefined) { sets.push('tipo_vehiculo = @tipo_vehiculo'); request.input('tipo_vehiculo', sql.NVarChar, data.tipo_vehiculo); }
  if (data.costo_por_hora !== undefined) { sets.push('costo_por_hora = @costo_por_hora'); request.input('costo_por_hora', sql.Decimal(10, 2), data.costo_por_hora); }
  if (data.costo_maximo_diario !== undefined) { sets.push('costo_maximo_diario = @costo_maximo_diario'); request.input('costo_maximo_diario', sql.Decimal(10, 2), data.costo_maximo_diario); }
  if (data.activo !== undefined) { sets.push('activo = @activo'); request.input('activo', sql.Bit, data.activo); }

  if (sets.length === 0) return false;
  sets.push('actualizado_en = GETDATE()');
  await request.query(`UPDATE Tarifas SET ${sets.join(', ')} WHERE id = @id`);
  return true;
}

export async function eliminar(id: number): Promise<boolean> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('DELETE FROM Tarifas WHERE id = @id');
  return result.rowsAffected[0]! > 0;
}
