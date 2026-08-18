import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/database';
import type { Credenciales, NombreRol, ResultadoAutenticacion } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'parqueo-zona19-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

interface FilaLogin {
  id_usuario: number;
  rol: number;
  nombre_rol?: string;
  correo: string;
  dpi: string;
  nombres: string;
  apellidos: string;
  contraseña?: string;
}

function emitirSesion(row: FilaLogin): ResultadoAutenticacion {
  const payload = {
    id: Number(row.id_usuario),
    nombres: row.nombres,
    apellidos: row.apellidos,
    rol: (row.nombre_rol ?? String(row.rol)) as NombreRol,
    correo: row.correo,
    dpi: row.dpi,
  };

  const token = jwt.sign(
    { id: Number(row.id_usuario), rol: payload.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
  );

  return { exitoso: true, usuario: payload, token };
}

export async function autenticar(creds: Credenciales, ip: string): Promise<ResultadoAutenticacion> {
  const conn = await getPool().getConnection();

  try {
    await conn.query('CALL loginN(?, ?, ?, @codigo, @mensaje, @data)', [creds.identificador, creds.password, ip]);
    const [rows] = await conn.query('SELECT @codigo AS pcodigo_s, @mensaje AS pmensaje, @data AS pdata');
    const fila = (rows as Array<{ pcodigo_s: number; pmensaje: string; pdata: string | null }>)[0];
    if (!fila) return { exitoso: false, mensaje: 'Credenciales inválidas' };

    if (fila.pcodigo_s === 401) {
      return { exitoso: false, mensaje: 'Usuario desactivado' };
    }

    if (fila.pcodigo_s !== 200 || !fila.pdata) {
      return { exitoso: false, mensaje: fila.pmensaje || 'Credenciales inválidas' };
    }

    const usuario = JSON.parse(fila.pdata) as FilaLogin;

    const passwordValida = await bcrypt.compare(creds.password, usuario.contraseña ?? '');
    if (!passwordValida) {
      return { exitoso: false, mensaje: 'Credenciales inválidas' };
    }

    return emitirSesion(usuario);
  } catch (error) {
    console.error('[AuthService] Error:', error);
    return { exitoso: false, mensaje: 'Error interno del servidor' };
  } finally {
    conn.release();
  }
}