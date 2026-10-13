import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import { generarReferencia, PagoError, type ModoPago } from '../services/pasarela.service';
import type { DatosFacturacion } from '../utils/facturacion';
import { hoyGuatemala } from '../utils/fecha';
import { normalizarPlaca, REGEX_PLACA, tipoCoincideConPlaca, tipoPorPlaca } from '../utils/placa';
import { gateway, type PagoOnline } from './pagos-online.repository';

type Db = Pool | PoolConnection;

export interface TipoResuelto {
  id_tipo: number;
  nombre: string;
  precio_efectivo: number;
  precio_linea: number;
  registrada: boolean;
  activo: boolean;
}

function placaValida(placa: string): string {
  const limpia = normalizarPlaca(placa);
  if (!REGEX_PLACA.test(limpia)) throw new PagoError(400, 'La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras. Ej: P123ABC');
  return limpia;
}

/**
 * Tipo y tarifa de una placa: el del vehículo registrado o, si es visitante, el que implica su prefijo.
 * El cliente nunca elige el tipo, así que no puede pagar una tarifa menor a la que le corresponde.
 */
async function resolverTipo(db: Db, placa: string, bloquear = false): Promise<TipoResuelto> {
  const [vehiculos] = await db.query<RowDataPacket[]>(
    `SELECT v.activo, tv.id_tipo, tv.nombre, tv.precio_efectivo, tv.precio_linea
     FROM Vehiculos v JOIN Tipo_vehiculo tv ON tv.id_tipo = v.id_tipo
     WHERE UPPER(v.placa) = ? LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`, [placa]);
  const vehiculo = vehiculos[0];
  const tipoPlaca = tipoPorPlaca(placa)!;
  if (vehiculo) {
    if (!tipoCoincideConPlaca(String(vehiculo.nombre), tipoPlaca)) {
      throw new PagoError(409, 'El tipo registrado para esta placa no coincide con su prefijo. Consulta con el guardia');
    }
    return { id_tipo: vehiculo.id_tipo, nombre: vehiculo.nombre, precio_efectivo: Number(vehiculo.precio_efectivo),
      precio_linea: Number(vehiculo.precio_linea), registrada: true, activo: Number(vehiculo.activo) === 1 };
  }
  const [tipos] = await db.query<RowDataPacket[]>(
    'SELECT id_tipo, nombre, precio_efectivo, precio_linea FROM Tipo_vehiculo WHERE nombre = ? LIMIT 1', [tipoPlaca]);
  if (!tipos[0]) throw new PagoError(503, 'No existe el tipo de vehículo en el catálogo. Avisa a administración');
  return { id_tipo: tipos[0].id_tipo, nombre: tipos[0].nombre, precio_efectivo: Number(tipos[0].precio_efectivo),
    precio_linea: Number(tipos[0].precio_linea), registrada: false, activo: true };
}

/**
 * Pagos que cubren a la placa hoy: los del día (fecha_vigencia) y los enlazados al ticket aún abierto
 * (incluye el pago de un ticket que cruzó la medianoche). El completado va primero.
 */
const PAGOS_DE_LA_PLACA = `
  FROM Pagos pg
  WHERE pg.placa = ? AND (pg.fecha_vigencia = ?
    OR pg.id_ticket IN (SELECT t.id_ticket FROM Tickets t WHERE t.placa = ? AND t.activo = 1 AND t.fecha_salida IS NULL))`;

export interface ConsultaPlaca {
  placa: string;
  registrada: boolean;
  id_tipo: number;
  tipo: string;
  tarifa_efectivo: number;
  tarifa_online: number;
  dentro: boolean;
  fecha_vigencia: string;
  pagado_hoy: boolean;
  estado_pago: string | null;
  pago: { metodo: string; monto: number; fecha: string | null; referencia?: string; nit?: string | null; nombre?: string | null } | null;
}

/**
 * Estado de pago de una placa. `detalle` (solo personal autenticado) agrega la referencia y los datos de
 * facturación: la placa es adivinable, así que el endpoint público nunca los expone.
 */
export async function consultarPlaca(placaCruda: string, detalle = false): Promise<ConsultaPlaca> {
  const placa = placaValida(placaCruda);
  const pool = getPool();
  const tipo = await resolverTipo(pool, placa);
  const hoy = hoyGuatemala();
  const [pagos] = await pool.query<RowDataPacket[]>(
    `SELECT pg.estado_pago, pg.metodo_pago, pg.monto, pg.codigo_validacion, pg.fecha_confirmacion, pg.nit, pg.nombre_facturacion
     ${PAGOS_DE_LA_PLACA} AND pg.estado_pago <> 'reembolsado'
     ORDER BY (pg.estado_pago = 'completado') DESC, pg.id_pago DESC LIMIT 1`, [placa, hoy, placa]);
  const [dentro] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM Tickets WHERE placa = ? AND activo = 1 AND fecha_salida IS NULL LIMIT 1', [placa]);
  const pago = pagos[0];
  return {
    placa, registrada: tipo.registrada, id_tipo: tipo.id_tipo, tipo: tipo.nombre,
    tarifa_efectivo: tipo.precio_efectivo, tarifa_online: tipo.precio_linea,
    dentro: dentro.length > 0, fecha_vigencia: hoy,
    pagado_hoy: pago?.estado_pago === 'completado',
    estado_pago: pago?.estado_pago ?? null,
    pago: pago ? {
      metodo: pago.metodo_pago, monto: Number(pago.monto), fecha: pago.fecha_confirmacion ?? null,
      ...(detalle ? { referencia: pago.codigo_validacion, nit: pago.nit, nombre: pago.nombre_facturacion } : {}),
    } : null,
  };
}

/** Reserva (o reutiliza) el pago en línea del día para una placa, sin usuario ni ticket. */
export async function reservarPublico(placaCruda: string, facturacion: DatosFacturacion, modo: ModoPago, montoEsperado: number) {
  const placa = placaValida(placaCruda);
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const tipo = await resolverTipo(conn, placa, true);
    if (!tipo.activo) throw new PagoError(409, 'Este vehículo está desactivado. Consulta con el guardia');
    const monto = tipo.precio_linea;
    if (!Number.isFinite(monto) || monto < 5) throw new PagoError(400, 'La tarifa en línea debe ser al menos Q5.00');
    if (Math.round(monto * 100) !== Math.round(montoEsperado * 100)) throw new PagoError(409, 'La tarifa cambió. Consulta de nuevo tu placa');

    const hoy = hoyGuatemala();
    const [pagos] = await conn.query<PagoOnline[]>(
      `SELECT pg.* ${PAGOS_DE_LA_PLACA} ORDER BY pg.id_pago DESC FOR UPDATE`, [placa, hoy, placa]);
    if (pagos.some(p => p.estado_pago === 'completado')) throw new PagoError(409, 'Esta placa ya pagó hoy. No se realizará otro cobro');
    const existente = pagos[0];
    if (existente) {
      if (gateway(existente)?.modo !== modo) throw new PagoError(409, 'Esta placa tiene un pago de otro ambiente. Consulta con administración');
      if (existente.estado_pago === 'reembolsado') throw new PagoError(409, 'Este pago requiere revisión administrativa');
      if (Math.round(Number(existente.monto) * 100) !== Math.round(monto * 100)) throw new PagoError(409, 'Hay un pago pendiente con otra tarifa. Consulta con el guardia');
      // Se reutiliza tal cual: no se sobrescriben los datos de facturación del pago ya iniciado,
      // porque la placa es lo único que hace falta para llegar aquí.
      await conn.commit();
      return { pago: existente, nuevo: false };
    }

    if (!tipo.registrada) {
      // La FK de Pagos exige que la placa exista en Vehiculos, igual que para un visitante en la entrada.
      await conn.query('INSERT INTO Vehiculos (placa, id_usuario, id_tipo, activo) VALUES (?, NULL, ?, 1)', [placa, tipo.id_tipo]);
    }
    const referencia = generarReferencia();
    const [insert] = await conn.query<ResultSetHeader>(
      `INSERT INTO Pagos (id_ticket, id_usuario, placa, id_tipo, metodo_pago, monto, codigo_validacion, estado_pago,
                          gateway_response, observacion, fecha_vigencia, nit, nombre_facturacion)
       VALUES (NULL, NULL, ?, ?, 'linea', ?, ?, 'pendiente', ?, ?, ?, ?, ?)`,
      [placa, tipo.id_tipo, monto, referencia, JSON.stringify({ modo }),
        modo === 'live' ? 'Recurrente · pago público' : `PRUEBA ${modo}: sin dinero real`, hoy, facturacion.nit, facturacion.nombre]);
    await conn.commit();
    return { nuevo: true, pago: { id_pago: insert.insertId, id_ticket: null, id_usuario: null, placa, monto, codigo_validacion: referencia,
      estado_pago: 'pendiente', transaction_id: null, gateway_response: { modo }, fecha_vigencia: hoy,
      nit: facturacion.nit, nombre_facturacion: facturacion.nombre } as unknown as PagoOnline };
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}

export interface FilaPagoHoy {
  id: number;
  placa: string;
  tipo_vehiculo: string;
  metodo: string;
  monto: number;
  estado: string;
  nit: string | null;
  nombre_facturacion: string | null;
  referencia: string;
  fecha_pago: string;
  fecha_confirmacion: string | null;
  ticket: string | null;
}

export interface EstadoDelDia {
  fecha: string;
  totales: { pagados: number; monto: number; efectivo: number; en_linea: number; pendientes: number; dentro_sin_pago: number };
  pagos: FilaPagoHoy[];
  dentro_sin_pago: { placa: string; ticket: string; lugar: string; zona: string; fecha_entrada: string }[];
}

/** Quiénes pagaron hoy y qué vehículos están dentro sin pago vigente (dashboard). */
export async function estadoDelDia(): Promise<EstadoDelDia> {
  const pool = getPool();
  const hoy = hoyGuatemala();
  const [pagos] = await pool.query<RowDataPacket[]>(
    `SELECT pg.id_pago AS id, pg.placa, tv.nombre AS tipo_vehiculo, pg.metodo_pago AS metodo, pg.monto,
            pg.estado_pago AS estado, pg.nit, pg.nombre_facturacion, pg.codigo_validacion AS referencia,
            pg.fecha_pago, pg.fecha_confirmacion, t.numero_ticket AS ticket
     FROM Pagos pg
     JOIN Tipo_vehiculo tv ON tv.id_tipo = pg.id_tipo
     LEFT JOIN Tickets t ON t.id_ticket = pg.id_ticket
     WHERE pg.fecha_vigencia = ?
     ORDER BY pg.id_pago DESC`, [hoy]);
  const [sinPago] = await pool.query<RowDataPacket[]>(
    `SELECT t.placa, t.numero_ticket AS ticket, COALESCE(l.codigo, 'N/A') AS lugar, COALESCE(z.nombre, 'N/A') AS zona, t.fecha_entrada
     FROM Tickets t
     LEFT JOIN Lugares l ON l.id_lugar = t.id_lugar
     LEFT JOIN Zonas z ON z.id_zona = l.id_zona
     WHERE t.activo = 1 AND t.fecha_salida IS NULL
       AND NOT EXISTS (SELECT 1 FROM Pagos pg WHERE pg.estado_pago = 'completado'
                         AND (pg.id_ticket = t.id_ticket OR (pg.placa = t.placa AND pg.fecha_vigencia = ?)))
     ORDER BY t.fecha_entrada`, [hoy]);
  const filas = (pagos as FilaPagoHoy[]).map(p => ({ ...p, monto: Number(p.monto) }));
  const completados = filas.filter(p => p.estado === 'completado');
  return {
    fecha: hoy,
    totales: {
      pagados: completados.length,
      monto: completados.reduce((suma, p) => suma + p.monto, 0),
      efectivo: completados.filter(p => p.metodo === 'efectivo').length,
      en_linea: completados.filter(p => p.metodo === 'linea').length,
      pendientes: filas.filter(p => p.estado === 'pendiente').length,
      dentro_sin_pago: sinPago.length,
    },
    pagos: filas,
    dentro_sin_pago: sinPago as EstadoDelDia['dentro_sin_pago'],
  };
}
