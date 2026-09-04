import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { UsuarioMySQL } from '../models';

const CAMPOS_BASE = `
  u.id_usuarios, u.id_rol, r.nom_rol, u.email, u.nombres, u.apellidos, u.DPI,
  u.foto_perfil, u.activo, u.fecha_nacimiento, u.fecha_creacion
`;

export async function listar(): Promise<UsuarioMySQL[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_BASE} FROM Usuarios u JOIN Roles r ON r.id_rol = u.id_rol ORDER BY u.id_usuarios`,
  );
  return rows as UsuarioMySQL[];
}

export async function obtenerPorId(id: number): Promise<UsuarioMySQL | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_BASE} FROM Usuarios u JOIN Roles r ON r.id_rol = u.id_rol WHERE u.id_usuarios = ?`,
    [id],
  );
  return (rows as UsuarioMySQL[])[0] ?? null;
}

export async function existeCorreoODpi(email: string, dpi: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id_usuarios FROM Usuarios WHERE email = ? OR DPI = ? LIMIT 1',
    [email, dpi],
  );
  return (rows as unknown[]).length > 0;
}

export async function crear(data: Omit<UsuarioMySQL, 'id_usuarios' | 'nom_rol' | 'fecha_creacion'>): Promise<number> {
  const pool = getPool();
  const [result] = await pool.execute(
    `INSERT INTO Usuarios (id_rol, email, pass, nombres, apellidos, DPI, foto_perfil, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id_rol,
      data.email,
      data.pass ?? '',
      data.nombres,
      data.apellidos,
      data.dpi,
      data.foto_perfil ?? null,
      data.activo ? 1 : 0,
    ],
  );
  return (result as ResultSetHeader).insertId;
}

export async function actualizar(id: number, data: Partial<UsuarioMySQL>): Promise<boolean> {
  const pool = getPool();
  const sets: string[] = [];
  const values: Array<string | number | null> = [];

  if (data.id_rol !== undefined) { sets.push('id_rol = ?'); values.push(data.id_rol); }
  if (data.email !== undefined) { sets.push('email = ?'); values.push(data.email); }
  if (data.nombres !== undefined) { sets.push('nombres = ?'); values.push(data.nombres); }
  if (data.apellidos !== undefined) { sets.push('apellidos = ?'); values.push(data.apellidos); }
  if (data.dpi !== undefined) { sets.push('DPI = ?'); values.push(data.dpi); }
  if (data.foto_perfil !== undefined) { sets.push('foto_perfil = ?'); values.push(data.foto_perfil); }
  if (data.activo !== undefined) { sets.push('activo = ?'); values.push(data.activo ? 1 : 0); }
  if (data.pass !== undefined && data.pass) {
    sets.push('pass = ?');
    values.push(data.pass);
  }

  if (sets.length === 0) return false;
  values.push(id);

  const [result] = await pool.execute(
    `UPDATE Usuarios SET ${sets.join(', ')} WHERE id_usuarios = ?`,
    values,
  );
  return (result as ResultSetHeader).affectedRows > 0;
}

export async function eliminar(id: number): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute('UPDATE Usuarios SET activo = 0 WHERE id_usuarios = ?', [id]);
  return (result as ResultSetHeader).affectedRows > 0;
}

export async function obtenerIdPorCorreo(email: string): Promise<number | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id_usuarios FROM Usuarios WHERE email = ? LIMIT 1',
    [email],
  );
  const fila = (rows as RowDataPacket[])[0];
  return fila ? fila.id_usuarios : null;
}

export interface ResultadoLoginSP {
  codigo: number;
  mensaje: string;
  data: string | null;
}

export async function loginSP(identificador: string, password: string, ip: string): Promise<ResultadoLoginSP> {
  const conn = await getPool().getConnection();
  try {
    await conn.query('CALL loginN(?, ?, ?, @codigo, @mensaje, @data)', [identificador, password, ip]);
    const [rows] = await conn.query('SELECT @codigo AS pcodigo_s, @mensaje AS pmensaje, @data AS pdata');
    const fila = (rows as Array<{ pcodigo_s: number; pmensaje: string; pdata: string | null }>)[0];
    return {
      codigo: fila?.pcodigo_s ?? 500,
      mensaje: fila?.pmensaje ?? 'Error interno',
      data: fila?.pdata ?? null,
    };
  } finally {
    conn.release();
  }
}
