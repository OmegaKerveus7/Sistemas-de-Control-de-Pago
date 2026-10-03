import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';

export interface PagoPendiente {
  id_ticket: number;
  ticket: string;
  placa: string;
  tipo_vehiculo: string;
  precio_efectivo: number;
  precio_linea: number;
  minutos_estacionado: number;
  lugar: string;
  zona: string;
  nombres: string;
  apellidos: string;
  email: string;
}

/**
 * Tickets activos de usuarios normales (rol "usuario") sin pago completado ni en curso.
 * Los visitantes no aparecen: no tienen cuenta ni correo.
 */
export async function listarPendientesDePago(idTicket?: number): Promise<PagoPendiente[]> {
  const params: number[] = [];
  if (idTicket !== undefined) params.push(idTicket);
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT t.id_ticket, t.numero_ticket AS ticket, t.placa, tv.nombre AS tipo_vehiculo,
            tv.precio_efectivo, tv.precio_linea,
            TIMESTAMPDIFF(MINUTE, t.fecha_entrada, NOW()) AS minutos_estacionado,
            COALESCE(l.codigo, 'N/A') AS lugar, COALESCE(z.nombre, 'N/A') AS zona,
            u.nombres, u.apellidos, u.email
     FROM Tickets t
     JOIN Usuarios u ON u.id_usuario = t.id_usuario AND u.activo = 1
     JOIN Roles r ON r.id_rol = u.id_rol AND r.nom_rol = 'usuario'
     JOIN Tipo_vehiculo tv ON tv.id_tipo = t.id_tipo
     LEFT JOIN Lugares l ON l.id_lugar = t.id_lugar
     LEFT JOIN Zonas z ON z.id_zona = l.id_zona
     WHERE t.activo = 1 AND t.fecha_salida IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM Pagos pg
         WHERE pg.id_ticket = t.id_ticket AND pg.estado_pago IN ('completado', 'pendiente')
       )
       ${idTicket !== undefined ? 'AND t.id_ticket = ?' : ''}
     ORDER BY t.fecha_entrada`,
    params,
  );
  return rows.map((r) => ({
    ...(r as PagoPendiente),
    precio_efectivo: Number(r.precio_efectivo),
    precio_linea: Number(r.precio_linea),
    minutos_estacionado: Number(r.minutos_estacionado),
  }));
}
