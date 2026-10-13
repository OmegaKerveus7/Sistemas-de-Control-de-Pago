import { randomBytes } from 'node:crypto';
import { PagoError } from '../services/pasarela.service';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { Pago, FilaReporteMensual, PagoHistorial } from '../models';
import { FacturacionError, validarFacturacion, type DatosFacturacion } from '../utils/facturacion';
import { hoyGuatemala } from '../utils/fecha';
import { tipoCoincideConPlaca, tipoPorPlaca } from '../utils/placa';

export async function listar(): Promise<Pago[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, pg.placa,
            pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
            pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
            pg.codigo_validacion, pg.fecha_pago, pg.fecha_confirmacion, pg.nit, pg.nombre_facturacion
     FROM Pagos pg
     LEFT JOIN Tickets t ON t.id_ticket = pg.id_ticket
     LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
     ORDER BY pg.fecha_pago DESC`,
  );
  return rows as Pago[];
}

export async function obtenerPorId(id: number): Promise<Pago | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, pg.placa,
            pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
            pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
            pg.codigo_validacion, pg.fecha_pago, pg.fecha_confirmacion, pg.nit, pg.nombre_facturacion
     FROM Pagos pg
     LEFT JOIN Tickets t ON t.id_ticket = pg.id_ticket
     LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
     WHERE pg.id_pago = ? LIMIT 1`,
    [id],
  );
  return (rows as (Pago & RowDataPacket)[])[0] ?? null;
}

export async function obtenerPorTicket(idTicket: number): Promise<Pago | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pg.id_pago AS id, pg.id_ticket, t.numero_ticket AS ticket, pg.placa,
            pg.id_usuario, u.nombres AS pagador_nombres, u.apellidos AS pagador_apellidos,
            pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
            pg.codigo_validacion, pg.fecha_pago, pg.fecha_confirmacion, pg.nit, pg.nombre_facturacion
     FROM Pagos pg
     JOIN Tickets t ON t.id_ticket = pg.id_ticket
     LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
     WHERE pg.id_ticket = ? LIMIT 1`,
    [idTicket],
  );
  return (rows as (Pago & RowDataPacket)[])[0] ?? null;
}

export async function reporteMensual(): Promise<FilaReporteMensual[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(pg.fecha_pago, '%Y-%m') AS mes,
            COUNT(*) AS cantidad_pagos,
            COALESCE(SUM(pg.monto), 0) AS total_cobrado
     FROM Pagos pg
     WHERE pg.estado_pago = 'completado'
     GROUP BY mes
     ORDER BY mes DESC`,
  );
  return rows as FilaReporteMensual[];
}

export interface FilaReporteDetallado {
  id: number;
  id_ticket: number;
  ticket: string;
  placa: string;
  tipo_vehiculo: string;
  pagador: string;
  /** Dueño del vehículo del ticket (o el visitante); "pagador" puede ser el guardia que cobró. */
  nombre_completo: string;
  dpi: string;
  metodo: string;
  monto: number;
  estado: string;
  fecha_pago: string;
  /** Datos del recibo (NIT y nombre) con los que se emitió el pago. */
  nit: string | null;
  nombre_facturacion: string | null;
  lugar: string;
  zona: string;
}

export async function reporteDetallado(anio: number, mes: number): Promise<FilaReporteDetallado[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pg.id_pago AS id, pg.id_ticket, COALESCE(t.numero_ticket, '') AS ticket, pg.placa,
            tv.nombre AS tipo_vehiculo,
            CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellidos, '')) AS pagador,
            COALESCE(NULLIF(TRIM(CONCAT(COALESCE(d.nombres, ''), ' ', COALESCE(d.apellidos, ''))), ''),
                     t.nombre_externo, '') AS nombre_completo,
            COALESCE(d.DPI, '') AS dpi,
            pg.metodo_pago AS metodo, pg.monto, pg.estado_pago AS estado,
            pg.fecha_pago, pg.nit, pg.nombre_facturacion,
            COALESCE(l.codigo, 'N/A') AS lugar,
            COALESCE(z.nombre, 'N/A') AS zona
     FROM Pagos pg
     LEFT JOIN Tickets t ON t.id_ticket = pg.id_ticket
     JOIN Tipo_vehiculo tv ON tv.id_tipo = pg.id_tipo
     LEFT JOIN Usuarios u ON u.id_usuario = pg.id_usuario
     LEFT JOIN Usuarios d ON d.id_usuario = t.id_usuario
     LEFT JOIN Parqueos p ON p.id_ticket = t.id_ticket
     LEFT JOIN Lugares l ON l.id_lugar = p.id_lugar
     LEFT JOIN Zonas z ON z.id_zona = l.id_zona
     WHERE YEAR(pg.fecha_pago) = ? AND MONTH(pg.fecha_pago) = ?
     ORDER BY pg.fecha_pago DESC`,
    [anio, mes],
  );
  return rows as FilaReporteDetallado[];
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

/** Historial de pagos del usuario vía SP sp_historial_pagos_usuario (con info anidada del vehículo, ticket y parqueo). */
export async function historialUsuario(
  idUsuario: number,
  fechaInicio?: string | null,
  fechaFin?: string | null,
): Promise<{ codigo: number; mensaje: string; data: PagoHistorial[] }> {
  const conn = await getPool().getConnection();
  try {
    await conn.query(
      'CALL sp_historial_pagos_usuario(?, ?, ?, @pcodigo_s, @pmensaje, @pdata)',
      [idUsuario, fechaInicio ?? null, fechaFin ?? null],
    );
    const [rows] = await conn.query(
      'SELECT @pcodigo_s AS pcodigo_s, @pmensaje AS pmensaje, @pdata AS pdata',
    );
    const fila = (rows as Array<{ pcodigo_s: number; pmensaje: string; pdata: string | null }>)[0];
    const rawData = fila?.pdata;
    let data: PagoHistorial[] = [];
    if (typeof rawData === 'string' && rawData.trim() && rawData !== 'null') {
      try { data = JSON.parse(rawData) as PagoHistorial[]; }
      catch { data = []; }
    } else if (Array.isArray(rawData)) {
      data = rawData as PagoHistorial[];
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

export interface DatosPagoEfectivo {
  placa: string;
  id_tipo_vehiculo: number;
  id_guardia: number;
  /** Opcionales: sin ellos el recibo queda a nombre de Consumidor Final (CF). */
  nit?: unknown;
  nombre?: unknown;
}

export interface ResultadoPagoEfectivo {
  id: number;
  monto: number;
  dueno_email: string | null;
  dueno_nombre: string | null;
  placa: string;
  ticket: string;
  lugar: string;
  zona: string;
  codigo_validacion: string;
}

function facturacionEfectivo(datos: DatosPagoEfectivo): DatosFacturacion {
  if (datos.nit === undefined && datos.nombre === undefined) return { nit: 'CF', nombre: 'Consumidor Final' };
  try { return validarFacturacion(datos.nit || 'CF', datos.nombre); }
  catch (error) {
    if (error instanceof FacturacionError) throw new PagoError(400, error.message);
    throw error;
  }
}

async function datosDelDueno(conn: PoolConnection, idUsuario: number | null) {
  if (!idUsuario) return { dueno_email: null, dueno_nombre: null };
  const [usuarios] = await conn.query<RowDataPacket[]>(
    'SELECT email, nombres, apellidos FROM Usuarios WHERE id_usuario = ?', [idUsuario]);
  if (!usuarios[0]?.email) return { dueno_email: null, dueno_nombre: null };
  return { dueno_email: usuarios[0].email as string, dueno_nombre: `${usuarios[0].nombres} ${usuarios[0].apellidos}` };
}

/**
 * Cobro en efectivo del guardia/cobrador. Con ticket abierto cobra ese ticket; sin ticket registra el pago
 * del día por placa (flujo "pagar primero"): la entrada posterior lo enlaza al ticket.
 */
export async function crearEfectivo(datos: DatosPagoEfectivo): Promise<ResultadoPagoEfectivo> {
  const placa = datos.placa.trim().toUpperCase();
  if (!/^[PM][0-9]{3}[A-Z]{3}$/.test(placa)) throw new PagoError(400, 'Placa inválida. Ejemplo: P123ABC');
  const facturacion = facturacionEfectivo(datos);
  const hoy = hoyGuatemala();
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [tickets] = await conn.query<RowDataPacket[]>(
      `SELECT t.id_ticket, t.id_usuario, t.id_tipo, tv.precio_efectivo,
              t.numero_ticket, l.codigo AS lugar, z.nombre AS zona
       FROM Tickets t
       JOIN Tipo_vehiculo tv ON tv.id_tipo = t.id_tipo
       LEFT JOIN Parqueos p ON p.id_ticket = t.id_ticket
       LEFT JOIN Lugares l ON l.id_lugar = p.id_lugar
       LEFT JOIN Zonas z ON z.id_zona = l.id_zona
       WHERE t.placa = ? AND t.activo = 1 AND t.fecha_salida IS NULL
       ORDER BY t.id_ticket DESC LIMIT 1 FOR UPDATE`, [placa]);
    const ticket = tickets[0];
    // Cubre tanto los pagos del ticket como el pago del día aún sin enlazar.
    const [pagos] = ticket
      ? await conn.query<RowDataPacket[]>(
        'SELECT id_pago, estado_pago FROM Pagos WHERE id_ticket = ? OR (placa = ? AND fecha_vigencia = ?) FOR UPDATE',
        [ticket.id_ticket, placa, hoy])
      : await conn.query<RowDataPacket[]>(
        'SELECT id_pago, estado_pago FROM Pagos WHERE placa = ? AND fecha_vigencia = ? FOR UPDATE', [placa, hoy]);
    if (pagos.some(p => p.estado_pago === 'completado')) throw new PagoError(409, ticket ? 'Este ticket ya está pagado; no se puede cobrar otra vez' : 'Esta placa ya pagó hoy; no se puede cobrar otra vez');
    if (pagos.length) throw new PagoError(409, 'Este ticket ya tiene un pago registrado. Revisa ese pago antes de cobrar en efectivo');

    let idTicket: number | null = null;
    let idTipo: number;
    let monto: number;
    let idUsuario: number | null;
    let numeroTicket = '';
    let lugar = 'N/A';
    let zona = 'N/A';
    if (ticket) {
      if (Number(ticket.id_tipo) !== datos.id_tipo_vehiculo) throw new PagoError(400, 'El tipo seleccionado no coincide con el vehículo del ticket');
      idTicket = ticket.id_ticket;
      idTipo = ticket.id_tipo;
      monto = Number(ticket.precio_efectivo);
      idUsuario = ticket.id_usuario ?? null;
      numeroTicket = ticket.numero_ticket;
      lugar = ticket.lugar ?? 'N/A';
      zona = ticket.zona ?? 'N/A';
    } else {
      const [vehiculos] = await conn.query<RowDataPacket[]>(
        `SELECT v.id_usuario, v.activo, tv.id_tipo, tv.nombre, tv.precio_efectivo
         FROM Vehiculos v JOIN Tipo_vehiculo tv ON tv.id_tipo = v.id_tipo
         WHERE UPPER(v.placa) = ? LIMIT 1 FOR UPDATE`, [placa]);
      const vehiculo = vehiculos[0];
      if (vehiculo) {
        if (Number(vehiculo.activo) !== 1) throw new PagoError(409, 'Este vehículo está desactivado');
        if (Number(vehiculo.id_tipo) !== datos.id_tipo_vehiculo) throw new PagoError(400, 'El tipo seleccionado no coincide con el vehículo registrado');
        idTipo = vehiculo.id_tipo;
        monto = Number(vehiculo.precio_efectivo);
        idUsuario = vehiculo.id_usuario ?? null;
      } else {
        const [tipos] = await conn.query<RowDataPacket[]>(
          'SELECT id_tipo, nombre, precio_efectivo FROM Tipo_vehiculo WHERE id_tipo = ?', [datos.id_tipo_vehiculo]);
        const tipo = tipos[0];
        if (!tipo) throw new PagoError(400, 'El tipo de vehículo seleccionado no existe');
        if (!tipoCoincideConPlaca(String(tipo.nombre), tipoPorPlaca(placa)!)) throw new PagoError(400, 'El tipo seleccionado no coincide con el prefijo de la placa');
        idTipo = tipo.id_tipo;
        monto = Number(tipo.precio_efectivo);
        idUsuario = null;
        // La FK de Pagos exige que la placa exista en Vehiculos; se registra como visitante.
        await conn.query('INSERT INTO Vehiculos (placa, id_usuario, id_tipo, activo) VALUES (?, NULL, ?, 1)', [placa, idTipo]);
      }
    }
    if (!Number.isFinite(monto) || monto <= 0) throw new PagoError(400, 'No existe una tarifa en efectivo válida para este vehículo');

    const referencia = `E-${randomBytes(9).toString('hex')}`;
    const [insert] = await conn.query<ResultSetHeader>(
      `INSERT INTO Pagos (id_ticket, id_usuario, placa, id_tipo, metodo_pago, monto,
        codigo_validacion, estado_pago, fecha_pago, fecha_confirmacion, observacion, fecha_vigencia, nit, nombre_facturacion)
       VALUES (?, ?, ?, ?, 'efectivo', ?, ?, 'completado', NOW(), NOW(), ?, ?, ?, ?)`,
      [idTicket, idUsuario ?? datos.id_guardia, placa, idTipo, monto, referencia,
       `Cobro en efectivo registrado por guardia ${datos.id_guardia}`, hoy, facturacion.nit, facturacion.nombre]);

    const dueno = await datosDelDueno(conn, idUsuario);
    await conn.commit();
    return { id: insert.insertId, monto, ...dueno, placa, ticket: numeroTicket, lugar, zona, codigo_validacion: referencia };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
