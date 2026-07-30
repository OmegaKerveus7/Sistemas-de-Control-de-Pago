import { getPool, sql } from '../config/database';
import type { Vehiculo } from '../models';

export async function listar(): Promise<Vehiculo[]> {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM Vehiculos ORDER BY id');
  return result.recordset;
}

export async function obtenerPorId(id: number): Promise<Vehiculo | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM Vehiculos WHERE id = @id');
  return result.recordset[0] ?? null;
}

export async function obtenerPorPlaca(placa: string): Promise<Vehiculo | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('placa', sql.NVarChar, placa)
    .query('SELECT * FROM Vehiculos WHERE placa = @placa');
  return result.recordset[0] ?? null;
}

export async function crear(data: Vehiculo): Promise<number> {
  const pool = await getPool();
  const result = await pool.request()
    .input('placa', sql.NVarChar, data.placa.toUpperCase())
    .input('marca', sql.NVarChar, data.marca)
    .input('modelo', sql.NVarChar, data.modelo)
    .input('color', sql.NVarChar, data.color)
    .input('tipo', sql.NVarChar, data.tipo)
    .input('propietario_dpi', sql.NVarChar, data.propietario_dpi)
    .input('propietario_nombre', sql.NVarChar, data.propietario_nombre)
    .query(`INSERT INTO Vehiculos (placa, marca, modelo, color, tipo, propietario_dpi, propietario_nombre)
            VALUES (@placa, @marca, @modelo, @color, @tipo, @propietario_dpi, @propietario_nombre);
            SELECT SCOPE_IDENTITY() AS id;`);
  return result.recordset[0]!.id;
}

export async function actualizar(id: number, data: Partial<Vehiculo>): Promise<boolean> {
  const pool = await getPool();
  const request = pool.request().input('id', sql.Int, id);
  const sets: string[] = [];

  if (data.placa !== undefined) { sets.push('placa = @placa'); request.input('placa', sql.NVarChar, data.placa.toUpperCase()); }
  if (data.marca !== undefined) { sets.push('marca = @marca'); request.input('marca', sql.NVarChar, data.marca); }
  if (data.modelo !== undefined) { sets.push('modelo = @modelo'); request.input('modelo', sql.NVarChar, data.modelo); }
  if (data.color !== undefined) { sets.push('color = @color'); request.input('color', sql.NVarChar, data.color); }
  if (data.tipo !== undefined) { sets.push('tipo = @tipo'); request.input('tipo', sql.NVarChar, data.tipo); }

  if (sets.length === 0) return false;
  await request.query(`UPDATE Vehiculos SET ${sets.join(', ')} WHERE id = @id`);
  return true;
}

export async function eliminar(id: number): Promise<boolean> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('DELETE FROM Vehiculos WHERE id = @id');
  return result.rowsAffected[0]! > 0;
}
