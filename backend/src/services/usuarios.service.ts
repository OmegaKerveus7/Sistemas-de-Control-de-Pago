import bcrypt from 'bcryptjs';
import { getPool, sql } from '../config/database';
import type { Usuario } from '../models';

export async function listar(): Promise<Usuario[]> {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT id, dpi, nombres, apellidos, correo, telefono, rol, activo, creado_en, actualizado_en FROM Usuarios ORDER BY id');
  return result.recordset;
}

export async function obtenerPorId(id: number): Promise<Usuario | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT id, dpi, nombres, apellidos, correo, telefono, rol, activo, creado_en, actualizado_en FROM Usuarios WHERE id = @id');
  return result.recordset[0] ?? null;
}

export async function crear(data: Omit<Usuario, 'id' | 'creado_en' | 'actualizado_en'>): Promise<number> {
  const pool = await getPool();
  const hash = await bcrypt.hash(data.password_hash, 10);
  const result = await pool.request()
    .input('dpi', sql.NVarChar, data.dpi)
    .input('nombres', sql.NVarChar, data.nombres)
    .input('apellidos', sql.NVarChar, data.apellidos)
    .input('correo', sql.NVarChar, data.correo)
    .input('telefono', sql.NVarChar, data.telefono ?? null)
    .input('password_hash', sql.NVarChar, hash)
    .input('rol', sql.NVarChar, data.rol)
    .query(`INSERT INTO Usuarios (dpi, nombres, apellidos, correo, telefono, password_hash, rol, activo)
            VALUES (@dpi, @nombres, @apellidos, @correo, @telefono, @password_hash, @rol, 1);
            SELECT SCOPE_IDENTITY() AS id;`);
  return result.recordset[0]!.id;
}

export async function actualizar(id: number, data: Partial<Usuario>): Promise<boolean> {
  const pool = await getPool();
  const request = pool.request().input('id', sql.Int, id);
  const sets: string[] = [];

  if (data.dpi !== undefined) { sets.push('dpi = @dpi'); request.input('dpi', sql.NVarChar, data.dpi); }
  if (data.nombres !== undefined) { sets.push('nombres = @nombres'); request.input('nombres', sql.NVarChar, data.nombres); }
  if (data.apellidos !== undefined) { sets.push('apellidos = @apellidos'); request.input('apellidos', sql.NVarChar, data.apellidos); }
  if (data.correo !== undefined) { sets.push('correo = @correo'); request.input('correo', sql.NVarChar, data.correo); }
  if (data.telefono !== undefined) { sets.push('telefono = @telefono'); request.input('telefono', sql.NVarChar, data.telefono); }
  if (data.rol !== undefined) { sets.push('rol = @rol'); request.input('rol', sql.NVarChar, data.rol); }
  if (data.activo !== undefined) { sets.push('activo = @activo'); request.input('activo', sql.Bit, data.activo); }
  if (data.password_hash !== undefined) {
    const hash = await bcrypt.hash(data.password_hash, 10);
    sets.push('password_hash = @password_hash');
    request.input('password_hash', sql.NVarChar, hash);
  }

  if (sets.length === 0) return false;
  sets.push('actualizado_en = GETDATE()');

  await request.query(`UPDATE Usuarios SET ${sets.join(', ')} WHERE id = @id`);
  return true;
}

export async function eliminar(id: number): Promise<boolean> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('DELETE FROM Usuarios WHERE id = @id');
  return result.rowsAffected[0]! > 0;
}
