import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { PagoError } from '../services/pasarela.service';

export const MENSAJE_SIN_ENTRADA = 'Esta placa no tiene una entrada activa. Solicita al guardia que registre tu ingreso';

/** A registered vehicle alone is not an entry: its ticket and assigned space must remain open. */
export async function exigirEntradaActiva(db: Pool | PoolConnection, placa: string, bloquear = false): Promise<number> {
  const [tickets] = await db.query<RowDataPacket[]>(
    `SELECT t.id_ticket FROM Tickets t
     JOIN Parqueos p ON p.id_ticket = t.id_ticket AND p.fecha_liberacion IS NULL
     WHERE t.placa = ? AND t.activo = 1 AND t.fecha_salida IS NULL
     ORDER BY t.id_ticket DESC LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`, [placa]);
  if (!tickets[0]) throw new PagoError(404, MENSAJE_SIN_ENTRADA);
  return Number(tickets[0].id_ticket);
}
