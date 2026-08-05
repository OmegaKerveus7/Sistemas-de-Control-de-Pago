import { getPool, sql } from '../config/database';
import type { Parqueo } from '../models';

export async function listar(): Promise<Parqueo[]> {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT * FROM Parqueo ORDER BY creado_en DESC');
  return result.recordset;
}

export async function obtenerPorId(id: number): Promise<Parqueo | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM Parqueo WHERE id = @id');
  return result.recordset[0] ?? null;
}

export async function obtenerActivoPorPlaca(placa: string): Promise<Parqueo | null> {
  const pool = await getPool();
  const result = await pool.request()
    .input('placa', sql.NVarChar, placa.toUpperCase())
    .query('SELECT * FROM Parqueo WHERE placa = @placa AND estado = \'activo\'');
  return result.recordset[0] ?? null;
}

export async function registrarEntrada(placa: string): Promise<number> {
  const pool = await getPool();
  const ticket = `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const result = await pool.request()
    .input('placa', sql.NVarChar, placa.toUpperCase())
    .input('ticket', sql.NVarChar, ticket)
    .query(`INSERT INTO Parqueo (placa, hora_entrada, estado, ticket)
            VALUES (@placa, GETDATE(), 'activo', @ticket);
            SELECT SCOPE_IDENTITY() AS id;`);
  return result.recordset[0]!.id;
}

export async function registrarSalida(id: number, costo: number): Promise<boolean> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('costo', sql.Decimal(10, 2), costo)
    .query(`UPDATE Parqueo SET hora_salida = GETDATE(), costo = @costo, estado = 'completado'
            WHERE id = @id AND estado = 'activo'`);
  return result.rowsAffected[0]! > 0;
}

export async function cancelar(id: number): Promise<boolean> {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query("UPDATE Parqueo SET estado = 'cancelado' WHERE id = @id");
  return result.rowsAffected[0]! > 0;
}
