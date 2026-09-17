import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Vehiculo, VehiculoConDueno } from '../models';

export interface ResultadoSP {
  codigo: number;
  mensaje: string;
  data: unknown;
}

export interface Marca {
  id_marca: number;
  nombre: string;
}

export interface TipoVehiculoCatalogo {
  id_tipo: number;
  nombre: string;
  precio_efectivo: number;
  precio_linea: number;
}

export async function listar(): Promise<VehiculoConDueno[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_vehiculos_listar()');
  return (results as unknown as [VehiculoConDueno[]])[0];
}

export async function obtenerPorPlaca(placa: string): Promise<VehiculoConDueno | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_vehiculos_obtener_por_placa(?)', [placa.toUpperCase()]);
  return (results as unknown as [VehiculoConDueno[]])[0][0] ?? null;
}

export async function buscar(filtro: string): Promise<VehiculoConDueno[]> {
  const pool = getPool();
  const termino = filtro.trim().toUpperCase();
  if (!termino) return [];
  const [rows] = await pool.query<(VehiculoConDueno & RowDataPacket)[]>(
    `SELECT v.placa, v.id_tipo, tv.nombre AS tipo, m.nombre AS marca, v.color, v.activo,
            v.id_usuario AS id_dueno, u.nombres AS dueno_nombres, u.apellidos AS dueno_apellidos,
            u.DPI AS dueno_dpi, u.email AS dueno_email
     FROM Vehiculos v
     LEFT JOIN Marcas m ON m.id_marca = v.id_marca
     LEFT JOIN Tipo_vehiculo tv ON tv.id_tipo = v.id_tipo
     LEFT JOIN Usuarios u ON u.id_usuario = v.id_usuario
     WHERE LOCATE(?, UPPER(v.placa)) > 0 OR LOCATE(?, UPPER(m.nombre)) > 0
        OR LOCATE(?, UPPER(CONCAT_WS(' ', u.nombres, u.apellidos))) > 0
        OR LOCATE(?, u.DPI) > 0
     ORDER BY v.placa`, [termino, termino, termino, termino]);
  return rows;
}

export async function crear(
  data: Vehiculo,
  idUsuarioAccion: number,
  ip: string,
): Promise<ResultadoSP> {
  const conn = await getPool().getConnection();
  try {
    await conn.query(
      'CALL sp_vehiculos_crear(?, ?, ?, ?, ?, ?, ?, @pcodigo_s, @pmensaje, @pdata)',
      [
        data.placa.toUpperCase(),
        data.id_usuario,
        data.id_tipo,
        data.id_marca ?? null,
        data.color ?? null,
        idUsuarioAccion,
        ip,
      ],
    );
    const [rows] = await conn.query(
      'SELECT @pcodigo_s AS pcodigo_s, @pmensaje AS pmensaje, @pdata AS pdata',
    );
    const fila = (rows as Array<{ pcodigo_s: number; pmensaje: string; pdata: string | null }>)[0];
    return {
      codigo: fila?.pcodigo_s ?? 500,
      mensaje: fila?.pmensaje ?? 'Error interno',
      data: fila?.pdata ? JSON.parse(fila.pdata) : null,
    };
  } finally {
    conn.release();
  }
}

export async function actualizar(
  placa: string,
  data: Partial<Vehiculo>,
  idUsuarioAccion: number,
  ip: string,
): Promise<ResultadoSP> {
  const conn = await getPool().getConnection();
  try {
    await conn.query(
      'CALL sp_vehiculos_actualizar(?, ?, ?, ?, ?, ?, ?, ?, @pcodigo_s, @pmensaje, @pdata)',
      [
        placa.toUpperCase(),
        data.id_usuario ?? null,
        data.id_tipo ?? null,
        data.id_marca ?? null,
        data.color ?? null,
        data.activo === undefined ? null : data.activo ? 1 : 0,
        idUsuarioAccion,
        ip,
      ],
    );
    const [rows] = await conn.query(
      'SELECT @pcodigo_s AS pcodigo_s, @pmensaje AS pmensaje, @pdata AS pdata',
    );
    const fila = (rows as Array<{ pcodigo_s: number; pmensaje: string; pdata: string | null }>)[0];
    return {
      codigo: fila?.pcodigo_s ?? 500,
      mensaje: fila?.pmensaje ?? 'Error interno',
      data: fila?.pdata ? JSON.parse(fila.pdata) : null,
    };
  } finally {
    conn.release();
  }
}

export async function eliminar(
  placa: string,
  idUsuarioAccion: number,
  ip: string,
): Promise<ResultadoSP> {
  const conn = await getPool().getConnection();
  try {
    await conn.query(
      'CALL sp_vehiculos_desactivar(?, ?, ?, @pcodigo_s, @pmensaje, @pdata)',
      [placa.toUpperCase(), idUsuarioAccion, ip],
    );
    const [rows] = await conn.query(
      'SELECT @pcodigo_s AS pcodigo_s, @pmensaje AS pmensaje, @pdata AS pdata',
    );
    const fila = (rows as Array<{ pcodigo_s: number; pmensaje: string; pdata: string | null }>)[0];
    return {
      codigo: fila?.pcodigo_s ?? 500,
      mensaje: fila?.pmensaje ?? 'Error interno',
      data: fila?.pdata ? JSON.parse(fila.pdata) : null,
    };
  } finally {
    conn.release();
  }
}

/** Catálogo de tipos de vehículo desde la tabla Tipo_vehiculo. */
export async function listarTiposVehiculo(): Promise<TipoVehiculoCatalogo[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id_tipo, nombre, precio_efectivo, precio_linea FROM Tipo_vehiculo ORDER BY id_tipo',
  );
  return rows as unknown as TipoVehiculoCatalogo[];
}

/** Marcas agrupadas por tipo de vehículo usando la vista v_marcas_por_tipo. */
export async function marcasPorTipo(): Promise<Array<{ tipo_vehiculo: string; marcas: Marca[] }>> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT tipo_vehiculo, marcas FROM v_marcas_por_tipo',
  );
  return rows.map((r) => ({
    tipo_vehiculo: String(r.tipo_vehiculo),
    marcas: typeof r.marcas === 'string' ? JSON.parse(r.marcas) : (r.marcas as Marca[]),
  }));
}

/** Obtener vehículos de un usuario (por id_usuario en la tabla Vehiculos). */
export async function vehiculosPorUsuario(idUsuario: number): Promise<Vehiculo[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT v.placa, v.id_usuario, v.id_tipo, v.id_marca, v.color, v.activo, v.fecha_registro
     FROM Vehiculos v
     WHERE v.id_usuario = ?
     ORDER BY v.placa`,
    [idUsuario],
  );
  return rows as unknown as Vehiculo[];
}
