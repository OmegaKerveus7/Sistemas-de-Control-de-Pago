import { getPool } from '../config/database';
import type { RowDataPacket } from 'mysql2/promise';
import type { Parqueo } from '../models';

export async function listar(): Promise<Parqueo[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_parqueo_listar()');
  return (results as unknown as [Parqueo[]])[0];
}

export async function obtenerPorId(id: number): Promise<Parqueo | null> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_parqueo_obtener_por_id(?)', [id]);
  return (results as unknown as [Parqueo[]])[0][0] ?? null;
}

export async function obtenerActivoPorPlaca(placa: string): Promise<Parqueo | null> {
  const pool = getPool();
  // El procedimiento instalado en algunas BD usa el nombre antiguo Estados_Lugares.
  // Consultamos el esquema actual directamente para el flujo de pago.
  const [rows] = await pool.query<(Parqueo & RowDataPacket)[]>(
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
  return rows[0] ?? null;
}

export async function historialPorPlaca(
  placa: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<Parqueo[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_parqueo_historial_por_placa(?, ?, ?)', [
    placa.toUpperCase(),
    fechaInicio,
    fechaFin,
  ]);
  return (results as unknown as [Parqueo[]])[0];
}
