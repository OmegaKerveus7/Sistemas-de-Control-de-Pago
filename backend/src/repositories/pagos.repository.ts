import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Pago, FilaReporteMensual, PagoHistorial } from '../models';

export async function listar(): Promise<Pago[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_pagos_listar()');
  return (results as unknown as [Pago[]])[0];
}

export async function obtenerPorId(id: number): Promise<Pago | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_pagos_obtener_por_id(?)', [id]);
  return (results as unknown as [Pago[]])[0][0] ?? null;
}

export async function obtenerPorTicket(idTicket: number): Promise<Pago | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_pagos_obtener_por_ticket(?)', [idTicket]);
  return (results as unknown as [Pago[]])[0][0] ?? null;
}

export async function reporteMensual(): Promise<FilaReporteMensual[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_pagos_reporte_mensual()');
  return (results as unknown as [FilaReporteMensual[]])[0];
}

/** Historial de pagos del usuario autenticado. */
export async function listarPorUsuario(idUsuario: number): Promise<PagoHistorial[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pg.id_pago AS id, pg.codigo_validacion, pg.monto, pg.estado_pago, pg.metodo_pago,
            pg.fecha_pago, pg.fecha_confirmacion,
            t.numero_ticket, t.placa, t.fecha_entrada, t.fecha_salida,
            l.codigo AS lugar, z.nombre AS zona
     FROM Pagos pg
     JOIN Tickets t ON t.id_ticket = pg.id_ticket
     LEFT JOIN Parqueos p ON p.id_ticket = t.id_ticket
     LEFT JOIN Lugares l ON l.id_lugar = p.id_lugar
     LEFT JOIN Zonas z ON z.id_zona = l.id_zona
     WHERE pg.id_usuario = ?
     ORDER BY pg.fecha_pago DESC`,
    [idUsuario],
  );
  return rows as PagoHistorial[];
}

export interface DatosPagoEfectivo {
  placa: string;
  id_tipo_vehiculo: number;
  id_guardia: number;
}

export async function crearEfectivo(datos: DatosPagoEfectivo): Promise<{ id: number; monto: number }> {
  const conn = await getPool().getConnection();
  try {
    await conn.query('CALL sp_pagos_crear_efectivo(?, ?, ?, @id_pago, @monto, @mensaje)', [
      datos.placa.toUpperCase(),
      datos.id_tipo_vehiculo,
      datos.id_guardia,
    ]);
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT @id_pago AS id_pago, @monto AS monto, @mensaje AS mensaje',
    );
    const fila = rows[0] as { id_pago: number | null; monto: string | null; mensaje: string };
    if (fila.id_pago == null) throw new Error(fila.mensaje);
    return { id: fila.id_pago, monto: Number(fila.monto) };
  } finally {
    conn.release();
  }
}
