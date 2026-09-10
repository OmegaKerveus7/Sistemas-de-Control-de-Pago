import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Pago, PagoLegacy, FilaReporteMensual, PagoHistorial } from '../models';

// NOTA: las funciones de abajo (listar/crear/confirmar/...) apuntan a una tabla
// `pagos` en minúscula que no existe en la base real (solo existe `Pagos`, con un
// esquema normalizado distinto: Tickets, Tarifas, Tipos_pagos). listarPorUsuario()
// sí usa el esquema real y es lo único de este archivo que funciona hoy contra la BD.
const CAMPOS_HISTORIAL = `
  p.id_pago AS id, p.codigo_pago, p.monto_total, p.comision, p.monto_neto,
  p.estado_pago, p.fecha_pago, p.fecha_confirmacion,
  tp.nom_tipo_pago AS tipo_pago,
  t.numero_ticket, t.placa_automovil AS placa, t.fecha_entrada, t.fecha_salida,
  l.lugar, z.nom_zona AS zona
`;

const FROM_HISTORIAL = `
  FROM Pagos p
  JOIN Tickets t ON t.id_ticket = p.id_ticket
  JOIN Tipos_pagos tp ON tp.id_tipo_pago = p.id_tipo_pago
  LEFT JOIN Lugares l ON l.id_lugar = t.id_lugar
  LEFT JOIN Zonas z ON z.id_zona = l.id_zona
`;

/** Historial de pagos del usuario autenticado, contra el esquema real (Pagos.id_usuario). */
export async function listarPorUsuario(idUsuario: number): Promise<PagoHistorial[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ${CAMPOS_HISTORIAL} ${FROM_HISTORIAL} WHERE p.id_usuario = ? ORDER BY p.fecha_pago DESC`,
    [idUsuario],
  );
  return rows as PagoHistorial[];
}

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

// ==================== LEGACY: flujo de pago en línea (pasarela) ====================
// TODO(pagos-online): sigue apuntando a una tabla `pagos` que no existe en la BD real.
// Pendiente de rediseño (requiere resolver id_ticket/id_tarifa desde el parqueo, igual que
// se hizo arriba para el pago en efectivo). Fuera del alcance de "pagos en efectivo".

const SELECT_LEGACY = `
  SELECT id_pago AS id, parqueo_id, monto, metodo, estado, referencia,
         ip_inicio, ip_pago, procesado_por, creado_en
  FROM pagos
`;

export async function obtenerPorReferencia(referencia: string): Promise<PagoLegacy | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_LEGACY} WHERE referencia = ? LIMIT 1`,
    [referencia],
  );
  return (rows as unknown as PagoLegacy[])[0] ?? null;
}

export async function crearLegacy(data: PagoLegacy): Promise<number> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO pagos (parqueo_id, monto, metodo, estado, referencia, ip_inicio, ip_pago, procesado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.parqueo_id,
      data.monto,
      data.metodo,
      data.estado ?? 'pendiente',
      data.referencia ?? null,
      data.ip_inicio ?? null,
      data.ip_pago ?? null,
      data.procesado_por ?? null,
    ],
  );
  return result.insertId;
}

export async function confirmarLegacy(id: number, referencia: string, ipPago: string): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE pagos SET estado = 'completado', referencia = ?, ip_pago = ?
     WHERE id_pago = ? AND estado = 'pendiente'`,
    [referencia, ipPago, id],
  );
  return result.affectedRows > 0;
}
