import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { UsuarioMySQL } from '../models';

const CAMPOS_BASE = `
  u.id_usuario, u.rol, r.rol AS nombre_rol, u.correo, u.nombres, u.apellidos, u.dpi,
  u.foto_perfil, u.vehiculo, u.activo, u.dispositivo
`;

export async function listar(): Promise<UsuarioMySQL[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_BASE} FROM usuarios u JOIN roles r ON r.id_rol = u.rol ORDER BY u.id_usuario`,
  );
  return rows as UsuarioMySQL[];
}

export async function obtenerPorId(id: number): Promise<UsuarioMySQL | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_BASE} FROM usuarios u JOIN roles r ON r.id_rol = u.rol WHERE u.id_usuario = ?`,
    [id],
  );
  return (rows as UsuarioMySQL[])[0] ?? null;
}

export async function existeCorreoODpi(correo: string, dpi: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE correo = ? OR dpi = ? LIMIT 1',
    [correo, dpi],
  );
  return (rows as unknown[]).length > 0;
}

export async function crear(data: Omit<UsuarioMySQL, 'id_usuario' | 'nombre_rol'>): Promise<number> {
  const pool = getPool();
  const [result] = await pool.execute(
    `INSERT INTO usuarios (rol, correo, contraseña, nombres, apellidos, dpi, foto_perfil, vehiculo, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.rol,
      data.correo,
      data.contraseña ?? '',
      data.nombres,
      data.apellidos,
      data.dpi,
      data.foto_perfil ?? null,
      data.vehiculo ?? null,
      data.activo ? 1 : 0,
    ],
  );
  return (result as ResultSetHeader).insertId;
}

export async function actualizar(id: number, data: Partial<UsuarioMySQL>): Promise<boolean> {
  const pool = getPool();
  const sets: string[] = [];
  const values: Array<string | number | null> = [];

  if (data.rol !== undefined) { sets.push('rol = ?'); values.push(data.rol); }
  if (data.correo !== undefined) { sets.push('correo = ?'); values.push(data.correo); }
  if (data.nombres !== undefined) { sets.push('nombres = ?'); values.push(data.nombres); }
  if (data.apellidos !== undefined) { sets.push('apellidos = ?'); values.push(data.apellidos); }
  if (data.dpi !== undefined) { sets.push('dpi = ?'); values.push(data.dpi); }
  if (data.foto_perfil !== undefined) { sets.push('foto_perfil = ?'); values.push(data.foto_perfil); }
  if (data.vehiculo !== undefined) { sets.push('vehiculo = ?'); values.push(data.vehiculo); }
  if (data.activo !== undefined) { sets.push('activo = ?'); values.push(data.activo ? 1 : 0); }
  if (data.contraseña !== undefined && data.contraseña) {
    sets.push('contraseña = ?');
    values.push(data.contraseña);
  }

  if (sets.length === 0) return false;
  values.push(id);

  const [result] = await pool.execute(
    `UPDATE usuarios SET ${sets.join(', ')} WHERE id_usuario = ?`,
    values,
  );
  return (result as ResultSetHeader).affectedRows > 0;
}

export async function eliminar(id: number): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
  return (result as ResultSetHeader).affectedRows > 0;
}

export async function obtenerIdPorCorreo(correo: string): Promise<number | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1',
    [correo],
  );
  const fila = (rows as RowDataPacket[])[0];
  return fila ? fila.id_usuario : null;
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
