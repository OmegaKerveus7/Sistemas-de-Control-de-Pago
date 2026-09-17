import { getPool } from '../config/database';
import type { RowDataPacket } from 'mysql2/promise';
import type { Parqueo } from '../models';
export async function listar(): Promise<Parqueo[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id_parqueo AS id, p.id_lugar, l.codigo AS lugar, z.nombre AS zona,
            p.id_ticket, t.numero_ticket AS ticket, t.placa,
            t.fecha_entrada, t.fecha_salida, p.fecha_ocupacion, p.fecha_liberacion,
            CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado,
            pg.monto AS costo, pg.estado_pago
     FROM Parqueos p
     JOIN Lugares l ON l.id_lugar = p.id_lugar
     JOIN Zonas z ON z.id_zona = l.id_zona
     LEFT JOIN Tickets t ON t.id_ticket = p.id_ticket
     LEFT JOIN Pagos pg ON pg.id_pago = (
       SELECT pago.id_pago FROM Pagos pago WHERE pago.id_ticket = t.id_ticket
       ORDER BY (pago.estado_pago = 'completado') DESC, pago.id_pago DESC LIMIT 1
     )
     ORDER BY p.id_parqueo DESC`,
  );
  return (rows as Parqueo[] & RowDataPacket[]);
}

export async function obtenerPorId(id: number): Promise<Parqueo | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id_parqueo AS id, p.id_lugar, l.codigo AS lugar, z.nombre AS zona,
            p.id_ticket, t.numero_ticket AS ticket, t.placa,
            t.fecha_entrada, t.fecha_salida, p.fecha_ocupacion, p.fecha_liberacion,
            CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado,
            pg.monto AS costo, pg.estado_pago
     FROM Parqueos p
     JOIN Lugares l ON l.id_lugar = p.id_lugar
     JOIN Zonas z ON z.id_zona = l.id_zona
     LEFT JOIN Tickets t ON t.id_ticket = p.id_ticket
     LEFT JOIN Pagos pg ON pg.id_pago = (
       SELECT pago.id_pago FROM Pagos pago WHERE pago.id_ticket = t.id_ticket
       ORDER BY (pago.estado_pago = 'completado') DESC, pago.id_pago DESC LIMIT 1
     )
     WHERE p.id_parqueo = ?
     LIMIT 1`,
    [id],
  );
  return (rows as (Parqueo & RowDataPacket)[])[0] ?? null;
}

export async function obtenerActivoPorPlaca(placa: string): Promise<Parqueo | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id_parqueo AS id, p.id_lugar, l.codigo AS lugar, z.nombre AS zona,
            p.id_ticket, t.numero_ticket AS ticket, t.placa,
            t.fecha_entrada, t.fecha_salida, p.fecha_ocupacion, p.fecha_liberacion,
            'activo' AS estado, el.nombre AS estado_lugar, pg.monto AS costo, pg.estado_pago
     FROM Parqueos p
     JOIN Tickets t ON t.id_ticket = p.id_ticket
     JOIN Lugares l ON l.id_lugar = p.id_lugar
     JOIN Zonas z ON z.id_zona = l.id_zona
     JOIN Estado_Lugar el ON el.id_estado = l.id_estado
     LEFT JOIN Pagos pg ON pg.id_pago = (
       SELECT pago.id_pago FROM Pagos pago WHERE pago.id_ticket = t.id_ticket
       ORDER BY (pago.estado_pago = 'completado') DESC, pago.id_pago DESC LIMIT 1
     )
     WHERE t.placa = ? AND t.activo = 1 AND t.fecha_salida IS NULL AND p.fecha_liberacion IS NULL
     ORDER BY p.id_parqueo DESC LIMIT 1`,
    [placa.trim().toUpperCase()],
  );
  return (rows as (Parqueo & RowDataPacket)[])[0] ?? null;
}

export async function historialPorPlaca(
  placa: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<Parqueo[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id_parqueo AS id, p.id_lugar, l.codigo AS lugar, z.nombre AS zona,
            p.id_ticket, t.numero_ticket AS ticket, t.placa,
            t.fecha_entrada, t.fecha_salida, p.fecha_ocupacion, p.fecha_liberacion,
            CASE WHEN p.fecha_liberacion IS NULL THEN 'activo' ELSE 'completado' END AS estado,
            pg.monto AS costo, pg.estado_pago
     FROM Parqueos p
     JOIN Lugares l ON l.id_lugar = p.id_lugar
     JOIN Zonas z ON z.id_zona = l.id_zona
     LEFT JOIN Tickets t ON t.id_ticket = p.id_ticket
     LEFT JOIN Pagos pg ON pg.id_pago = (
       SELECT pago.id_pago FROM Pagos pago WHERE pago.id_ticket = t.id_ticket
       ORDER BY (pago.estado_pago = 'completado') DESC, pago.id_pago DESC LIMIT 1
     )
     WHERE t.placa = ? AND t.fecha_entrada >= ? AND t.fecha_entrada <= ?
     ORDER BY p.id_parqueo DESC`,
    [placa.toUpperCase(), fechaInicio, fechaFin],
  );
  return (rows as Parqueo[] & RowDataPacket[]);
}

export interface ResultadoValidarParqueoSP {
  codigo: number;
  mensaje: string;
  data: unknown;
}

/** Verifica si una placa tiene cualquier registro en el sistema (Vehiculos o Tickets históricos). */
export async function placaExiste(placa: string): Promise<boolean> {
  const limpia = placa.trim().toUpperCase();
  if (!/^[PM][0-9]{3}[A-Z]{3}$/.test(limpia)) return false;
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM Vehiculos WHERE UPPER(placa) = ?) +
       (SELECT COUNT(*) FROM Tickets WHERE UPPER(placa) = ?) AS total`,
    [limpia, limpia],
  );
  return Number(rows[0]?.total ?? 0) > 0;
}

/**
 * Llama al SP sp_validar_parqueo_por_placa. Es público: solo requiere la placa,
 * no necesita autenticación. La autorización de salida la decide siempre el guardia.
 */
export async function validarParqueoPorPlaca(
  placa: string,
): Promise<ResultadoValidarParqueoSP> {
  const limpia = placa.trim().toUpperCase();
  if (!/^[PM][0-9]{3}[A-Z]{3}$/.test(limpia)) {
    return {
      codigo: 400,
      mensaje: 'Placa inválida. Debe iniciar con P o M, seguido de 3 números y 3 letras.',
      data: null,
    };
  }
  const conn = await getPool().getConnection();
  try {
    await conn.query(
      'CALL sp_validar_parqueo_por_placa(?, @pcodigo_s, @pmensaje, @pdata)',
      [limpia],
    );
    const [rows] = await conn.query(
      'SELECT @pcodigo_s AS pcodigo_s, @pmensaje AS pmensaje, @pdata AS pdata',
    );
    const fila = (rows as Array<{ pcodigo_s: number; pmensaje: string; pdata: string | null }>)[0];
    const rawData = fila?.pdata;
    let data: unknown = null;
    if (typeof rawData === 'string' && rawData.trim() && rawData !== 'null') {
      try { data = JSON.parse(rawData); }
      catch { data = rawData; }
    }
    return {
      codigo: fila?.pcodigo_s ?? 500,
      mensaje: fila?.pmensaje ?? 'Error interno',
      data,
    };
  } finally {
    conn.release();
  }
}
