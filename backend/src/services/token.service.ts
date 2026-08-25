import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';

export async function crearToken(idUsuario: number): Promise<string> {
  const pool = getPool();
  const codigo = String(Math.floor(100000 + Math.random() * 900000));

  await pool.execute(
    'INSERT INTO tokens_recuperacion (id_usuario, codigo, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
    [idUsuario, codigo],
  );

  return codigo;
}

export async function validarToken(idUsuario: number, codigo: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id_token FROM tokens_recuperacion
     WHERE id_usuario = ? AND codigo = ? AND usado = 0 AND expira_en > NOW()
     LIMIT 1`,
    [idUsuario, codigo],
  );

  if ((rows as unknown[]).length === 0) return false;

  await pool.execute(
    'UPDATE tokens_recuperacion SET usado = 1 WHERE id_usuario = ? AND codigo = ?',
    [idUsuario, codigo],
  );

  return true;
}

export async function existeCorreo(correo: string): Promise<number | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1',
    [correo],
  );
  return (rows as unknown[]).length > 0 ? (rows as RowDataPacket[])[0].id_usuario : null;
}
