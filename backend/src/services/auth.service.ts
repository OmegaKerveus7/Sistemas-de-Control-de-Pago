import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool, sql } from '../config/database';
import type { Credenciales, ResultadoAutenticacion, UsuarioPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'parqueo-zona19-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export async function autenticar(creds: Credenciales): Promise<ResultadoAutenticacion> {
  try {
    const pool = await getPool();
    const esCorreo = creds.identificador.includes('@');

    let query: string;
    if (esCorreo) {
      query = 'SELECT id, dpi, nombres, apellidos, correo, password_hash, rol FROM Usuarios WHERE correo = @identificador AND activo = 1';
    } else {
      query = 'SELECT id, dpi, nombres, apellidos, correo, password_hash, rol FROM Usuarios WHERE dpi = @identificador AND activo = 1';
    }

    const result = await pool.request()
      .input('identificador', sql.NVarChar, creds.identificador)
      .query(query);

    const row = result.recordset[0];
    if (!row) {
      return { exitoso: false, mensaje: 'Credenciales inválidas' };
    }

    const passwordValida = await bcrypt.compare(creds.password, row.password_hash);
    if (!passwordValida) {
      return { exitoso: false, mensaje: 'Credenciales inválidas' };
    }

    const payload: UsuarioPayload = {
      id: row.id,
      nombres: row.nombres,
      apellidos: row.apellidos,
      rol: row.rol,
      correo: row.correo,
      dpi: row.dpi,
    };

    const token = jwt.sign(
      { id: row.id, rol: row.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
    );

    return {
      exitoso: true,
      usuario: payload,
      token,
    };
  } catch (error) {
    console.error('[AuthService] Error:', error);
    return { exitoso: false, mensaje: 'Error interno del servidor' };
  }
}
