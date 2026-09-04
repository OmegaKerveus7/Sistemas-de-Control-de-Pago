import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { CriterioGuardian, RegistroEntradaGuardian, TipoVehiculoGuardian } from '../models';
import { GuardianError } from '../models';
import { parsearQrGuardian } from '../utils/guardian-qr';

type Movimiento = 'entrada' | 'salida' | 'autorizacion_salida';

interface VehiculoActivo extends RowDataPacket {
  id_vehiculo: number;
  id_usuario: number;
  id_tipo_vehiculo: number;
  tipo_vehiculo: string;
}

interface TipoVehiculo extends RowDataPacket {
  id_modelo: number;
  nom_tipo_vehiculo: TipoVehiculoGuardian;
}

interface LugarDisponible extends RowDataPacket {
  id_lugar: number;
  lugar: string;
  id_zona: number;
  zona: string;
}

interface TicketActivo extends RowDataPacket {
  id_ticket: number;
  id_lugar: number;
  id_vehiculo: number | null;
  id_usuario: number | null;
  numero_ticket: string;
  placa: string;
  lugar: string;
  zona: string;
  tipo_vehiculo: string | null;
  pago_id: number | null;
  pago_estado: string | null;
  pago_completado: number;
}

function normalizarPlaca(placa: string): string {
  return placa.trim().toUpperCase();
}

function validarPlaca(placa: string, tipo?: TipoVehiculoGuardian): string {
  const normalizada = normalizarPlaca(placa);
  if (!/^[PM][0-9]{3}[A-Z]{3}$/.test(normalizada)) {
    throw new GuardianError(400, 'La placa debe tener el formato P123ABC para carro o M123ABC para moto', 'PLACA_INVALIDA');
  }
  if (tipo && !normalizada.startsWith(tipo === 'carro' ? 'P' : 'M')) {
    throw new GuardianError(400, `La placa de ${tipo} debe iniciar con ${tipo === 'carro' ? 'P' : 'M'}`, 'PLACA_TIPO_INCOMPATIBLE');
  }
  return normalizada;
}

function criterioConsulta(criterio: CriterioGuardian): { where: string; params: string[] } {
  if (criterio.placa) return { where: 'UPPER(t.placa_automovil) = ?', params: [normalizarPlaca(criterio.placa)] };
  if (criterio.ticket) return { where: 't.numero_ticket = ?', params: [criterio.ticket.trim()] };
  if (criterio.referencia) {
    return {
      where: 'EXISTS (SELECT 1 FROM Pagos pr WHERE pr.id_ticket = t.id_ticket AND (pr.referencia_pago = ? OR pr.codigo_pago = ?))',
      params: [criterio.referencia.trim(), criterio.referencia.trim()],
    };
  }
  if (criterio.qr) {
    const qr = parsearQrGuardian(criterio.qr);
    return {
      where: `UPPER(t.placa_automovil) = ? AND EXISTS (
        SELECT 1 FROM Pagos pr WHERE pr.id_ticket = t.id_ticket AND pr.referencia_pago = ?
      )`,
      params: [qr.placa, qr.referencia],
    };
  }
  throw new GuardianError(400, 'Indica placa, ticket, referencia de pago o QR', 'CRITERIO_REQUERIDO');
}

async function idMovimiento(conn: PoolConnection, movimiento: Movimiento): Promise<number> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT id_movimiento FROM Movimientos WHERE tipo_movimiento = ? AND activo = 1 LIMIT 1',
    [movimiento],
  );
  const id = rows[0]?.id_movimiento as number | undefined;
  if (!id) throw new GuardianError(503, `No existe el catálogo de movimiento ${movimiento}`, 'CATALOGO_INCOMPLETO');
  return id;
}

async function compatibilidadConfigurada(conn: PoolConnection): Promise<boolean> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Lugares' AND COLUMN_NAME = 'id_tipo_vehiculo'
     LIMIT 1`,
  );
  return rows.length > 0;
}

async function ticketActivo(
  conn: PoolConnection,
  criterio: CriterioGuardian,
  bloquear = false,
): Promise<TicketActivo | null> {
  const { where, params } = criterioConsulta(criterio);
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT
       t.id_ticket,
       t.id_lugar,
       t.id_vehiculo,
       t.id_usuario,
       t.numero_ticket,
       t.placa_automovil AS placa,
       l.lugar,
       z.nom_zona AS zona,
       tv.nom_tipo_vehiculo AS tipo_vehiculo,
       pago_reciente.id_pago AS pago_id,
       pago_reciente.estado_pago AS pago_estado,
       EXISTS(
         SELECT 1 FROM Pagos pago_completo
         WHERE pago_completo.id_ticket = t.id_ticket AND pago_completo.estado_pago = 'completado'
       ) AS pago_completado
     FROM Tickets t
     JOIN Lugares l ON l.id_lugar = t.id_lugar
     JOIN Zonas z ON z.id_zona = l.id_zona
     LEFT JOIN Vehiculos v ON v.id_vehiculo = t.id_vehiculo
     LEFT JOIN Tipo_vehiculos tv ON tv.id_modelo = v.id_tipo_vehiculo
     LEFT JOIN Pagos pago_reciente ON pago_reciente.id_pago = (
       SELECT p.id_pago FROM Pagos p
       WHERE p.id_ticket = t.id_ticket
       ORDER BY COALESCE(p.fecha_confirmacion, p.fecha_pago) DESC, p.id_pago DESC
       LIMIT 1
     )
     WHERE t.activo = 1 AND ${where}
     ORDER BY t.id_ticket DESC
     LIMIT 1${bloquear ? ' FOR UPDATE' : ''}`,
    params,
  );
  return (rows[0] as TicketActivo | undefined) ?? null;
}

function datosAuditoria(datos: Record<string, unknown>): string {
  return JSON.stringify(datos);
}

function nuevoNumeroTicket(): string {
  return `TK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function resumen() {
  const pool = getPool();
  const [totales] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(el.nom_estado = 'disponible'), 0) AS disponibles,
       COALESCE(SUM(el.nom_estado = 'ocupado'), 0) AS ocupados
     FROM Lugares l
     JOIN Estados_Lugares el ON el.id_estado_lugar = l.id_estado_lugar
     WHERE l.activo = 1 AND el.activo = 1`,
  );
  const [porZona] = await pool.query<RowDataPacket[]>(
    `SELECT z.id_zona AS id, z.nom_zona AS zona,
            COUNT(l.id_lugar) AS total,
            COALESCE(SUM(el.nom_estado = 'disponible'), 0) AS disponibles,
            COALESCE(SUM(el.nom_estado = 'ocupado'), 0) AS ocupados
     FROM Zonas z
     LEFT JOIN Lugares l ON l.id_zona = z.id_zona AND l.activo = 1
     LEFT JOIN Estados_Lugares el ON el.id_estado_lugar = l.id_estado_lugar AND el.activo = 1
     WHERE z.activo = 1
     GROUP BY z.id_zona, z.nom_zona
     ORDER BY z.nom_zona`,
  );
  return { ...(totales[0] ?? { total: 0, disponibles: 0, ocupados: 0 }), por_zona: porZona };
}

export async function estadisticas() {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM Tickets WHERE activo = 1) AS vehiculos_activos,
       (SELECT COUNT(*) FROM Tickets WHERE DATE(fecha_entrada) = CURDATE()) AS entradas_hoy,
       (SELECT COUNT(*) FROM Tickets WHERE DATE(fecha_salida) = CURDATE()) AS salidas_hoy,
       (SELECT COUNT(DISTINCT t.id_ticket)
        FROM Tickets t
        JOIN Pagos p ON p.id_ticket = t.id_ticket
        WHERE t.activo = 1 AND p.estado_pago = 'pendiente') AS pagos_pendientes,
       (SELECT COUNT(*) FROM Tickets t
        WHERE t.activo = 1
          AND NOT EXISTS (SELECT 1 FROM Pagos p WHERE p.id_ticket = t.id_ticket)) AS sin_pago`,
  );
  return rows[0] ?? { vehiculos_activos: 0, entradas_hoy: 0, salidas_hoy: 0, pagos_pendientes: 0, sin_pago: 0 };
}

export async function lugares() {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.id_lugar AS id, l.lugar, z.id_zona AS zona_id, z.nom_zona AS zona,
            el.nom_estado AS estado, el.color_hex AS color,
            t.numero_ticket AS ticket, t.placa_automovil AS placa
     FROM Lugares l
     JOIN Zonas z ON z.id_zona = l.id_zona
     JOIN Estados_Lugares el ON el.id_estado_lugar = l.id_estado_lugar
     LEFT JOIN Tickets t ON t.id_lugar = l.id_lugar AND t.activo = 1
     WHERE l.activo = 1 AND z.activo = 1 AND el.activo = 1
     ORDER BY z.nom_zona, l.lugar`,
  );
  return rows;
}

export async function buscar(criterio: CriterioGuardian) {
  const conn = await getPool().getConnection();
  try {
    const ticket = await ticketActivo(conn, criterio);
    if (!ticket) throw new GuardianError(404, 'No se encontró un vehículo activo', 'VEHICULO_NO_ACTIVO');
    return ticket;
  } finally {
    conn.release();
  }
}

export async function registrarEntrada(registro: RegistroEntradaGuardian, idGuardia: number, ip: string) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    if (!(await compatibilidadConfigurada(conn))) {
      throw new GuardianError(
        503,
        'Falta clasificar Lugares por tipo de vehículo. Aplica la migración propuesta antes de registrar entradas.',
        'COMPATIBILIDAD_PENDIENTE',
      );
    }

    const placaNormalizada = validarPlaca(registro.placa, registro.tipo);
    const [vehiculos] = await conn.execute<VehiculoActivo[]>(
      `SELECT v.id_vehiculo, v.id_usuario, v.id_tipo_vehiculo, tv.nom_tipo_vehiculo AS tipo_vehiculo
       FROM Vehiculos v
       JOIN Tipo_vehiculos tv ON tv.id_modelo = v.id_tipo_vehiculo
       WHERE UPPER(v.placa) = ? AND v.activo = 1 AND tv.activo = 1
       LIMIT 1 FOR UPDATE`,
      [placaNormalizada],
    );
    const vehiculo = vehiculos[0];
    let idVehiculo: number | null = vehiculo?.id_vehiculo ?? null;
    let idUsuario: number | null = vehiculo?.id_usuario ?? null;
    let idTipoVehiculo: number;
    let tipoVehiculo: string;
    let esExterno = 0;

    if (vehiculo) {
      idTipoVehiculo = vehiculo.id_tipo_vehiculo;
      tipoVehiculo = vehiculo.tipo_vehiculo;
      if (registro.tipo && registro.tipo !== vehiculo.tipo_vehiculo.toLowerCase()) {
        throw new GuardianError(409, `El vehículo ya está registrado como ${vehiculo.tipo_vehiculo}`, 'TIPO_VEHICULO_DISTINTO');
      }
    } else {
      if (!registro.tipo) {
        throw new GuardianError(404, 'El vehículo no está registrado. Selecciona moto o carro para registrarlo como visitante.', 'TIPO_REQUERIDO');
      }
      const [tipos] = await conn.execute<TipoVehiculo[]>(
        'SELECT id_modelo, nom_tipo_vehiculo FROM Tipo_vehiculos WHERE nom_tipo_vehiculo = ? AND activo = 1 LIMIT 1',
        [registro.tipo],
      );
      const tipo = tipos[0];
      if (!tipo) throw new GuardianError(503, 'No existe el tipo de vehículo solicitado en el catálogo', 'CATALOGO_INCOMPLETO');
      idTipoVehiculo = tipo.id_modelo;
      tipoVehiculo = tipo.nom_tipo_vehiculo;
      esExterno = 1;
    }

    const [duplicados] = await conn.execute<RowDataPacket[]>(
      'SELECT id_ticket FROM Tickets WHERE UPPER(placa_automovil) = ? AND activo = 1 LIMIT 1 FOR UPDATE',
      [placaNormalizada],
    );
    if (duplicados.length > 0) throw new GuardianError(409, 'Ya existe una entrada activa para esta placa', 'PLACA_ACTIVA');

    const [lugares] = await conn.execute<LugarDisponible[]>(
      `SELECT l.id_lugar, l.lugar, l.id_zona, z.nom_zona AS zona
       FROM Lugares l
       JOIN Zonas z ON z.id_zona = l.id_zona
       JOIN Estados_Lugares el ON el.id_estado_lugar = l.id_estado_lugar
       WHERE l.activo = 1 AND z.activo = 1 AND el.nom_estado = 'disponible'
         AND l.id_tipo_vehiculo = ?
       ORDER BY z.nom_zona, l.lugar
       LIMIT 1 FOR UPDATE`,
      [idTipoVehiculo],
    );
    const lugar = lugares[0];
    if (!lugar) throw new GuardianError(409, 'No hay lugares disponibles compatibles con el vehículo', 'SIN_LUGAR_DISPONIBLE');

    const [ocupacionActiva] = await conn.execute<RowDataPacket[]>(
      'SELECT id_ticket FROM Tickets WHERE id_lugar = ? AND activo = 1 LIMIT 1 FOR UPDATE',
      [lugar.id_lugar],
    );
    if (ocupacionActiva.length > 0) throw new GuardianError(409, 'El lugar seleccionado ya está ocupado', 'LUGAR_OCUPADO');

    const movimientoEntrada = await idMovimiento(conn, 'entrada');
    const numeroTicket = nuevoNumeroTicket();
    const [ticketResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO Tickets (
         id_lugar, id_usuario, id_vehiculo, numero_ticket, numero_marbete,
         placa_automovil, id_guardia, fecha_entrada, id_movimiento, activo, es_externo, nombre_externo
       ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1, ?, ?)`,
      [
        lugar.id_lugar,
        idUsuario,
        idVehiculo,
        numeroTicket,
        lugar.lugar,
        placaNormalizada,
        idGuardia,
        movimientoEntrada,
        esExterno,
        esExterno ? 'Registro manual por guardia' : null,
      ],
    );
    const idTicket = ticketResult.insertId;

    await conn.execute('UPDATE Lugares SET id_estado_lugar = 2, fecha_modificacion = NOW() WHERE id_lugar = ?', [lugar.id_lugar]);
    await conn.execute(
      'INSERT INTO Parqueos (id_lugar, id_ticket, id_usuario, fecha_ocupacion) VALUES (?, ?, ?, NOW())',
      [lugar.id_lugar, idTicket, idUsuario],
    );
    await conn.execute(
      `INSERT INTO Tickets_Detalle (id_ticket, id_movimiento, id_usuario, fecha_hora, datos_adicionales, ip_dispositivo)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [idTicket, movimientoEntrada, idGuardia, datosAuditoria({ placa: placaNormalizada, lugar: lugar.lugar, zona: lugar.zona }), ip],
    );
    await conn.execute(
      `INSERT INTO Parqueos_Detalle (
         id_lugar, id_usuario_accion, estado_anterior, estado_nuevo, fecha_cambio, motivo, datos_adicionales, ip_dispositivo
       ) VALUES (?, ?, 'disponible', 'ocupado', NOW(), 'Registro de entrada', ?, ?)`,
      [lugar.id_lugar, idGuardia, datosAuditoria({ id_ticket: idTicket, placa: placaNormalizada }), ip],
    );

    await conn.commit();
    return {
      id_ticket: idTicket,
      ticket: numeroTicket,
      placa: placaNormalizada,
      tipo_vehiculo: tipoVehiculo,
      es_externo: esExterno === 1,
      lugar: { id: lugar.id_lugar, numero: lugar.lugar, zona: lugar.zona },
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function validarPago(criterio: CriterioGuardian, idGuardia: number, ip: string) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const ticket = await ticketActivo(conn, criterio, true);
    if (!ticket) throw new GuardianError(404, 'No se encontró un vehículo activo', 'VEHICULO_NO_ACTIVO');

    const movimiento = await idMovimiento(conn, 'autorizacion_salida');
    const autorizado = Number(ticket.pago_completado) === 1;
    await conn.execute(
      `INSERT INTO Tickets_Detalle (id_ticket, id_movimiento, id_usuario, fecha_hora, datos_adicionales, ip_dispositivo)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [
        ticket.id_ticket,
        movimiento,
        idGuardia,
        datosAuditoria({ accion: 'validacion_pago', autorizado, pago_id: ticket.pago_id, estado_pago: ticket.pago_estado }),
        ip,
      ],
    );
    if (ticket.pago_id) {
      await conn.execute(
        `INSERT INTO Pagos_Detalle (
           id_pago, id_usuario_accion, id_movimiento, accion, estado_anterior, estado_nuevo,
           fecha_hora, datos_adicionales, ip_dispositivo
         ) VALUES (?, ?, ?, 'VALIDACION_PAGO', ?, ?, NOW(), ?, ?)`,
        [
          ticket.pago_id,
          idGuardia,
          movimiento,
          ticket.pago_estado,
          autorizado ? 'completado' : String(ticket.pago_estado ?? 'sin_pago'),
          datosAuditoria({ ticket: ticket.numero_ticket, autorizado }),
          ip,
        ],
      );
    }
    await conn.commit();
    return { ...ticket, autorizado, mensaje: autorizado ? 'Pago completado; salida disponible para confirmación del guardia' : 'Pago no completado; salida bloqueada' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function registrarSalida(criterio: CriterioGuardian, idGuardia: number, ip: string) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const ticket = await ticketActivo(conn, criterio, true);
    if (!ticket) throw new GuardianError(404, 'No se encontró un vehículo activo', 'VEHICULO_NO_ACTIVO');

    const [pagosCompletados] = await conn.execute<RowDataPacket[]>(
      `SELECT id_pago, estado_pago, monto_total
       FROM Pagos
       WHERE id_ticket = ? AND estado_pago = 'completado'
       ORDER BY COALESCE(fecha_confirmacion, fecha_pago) DESC, id_pago DESC
       LIMIT 1 FOR UPDATE`,
      [ticket.id_ticket],
    );
    const pago = pagosCompletados[0];
    if (!pago) throw new GuardianError(409, 'La salida está bloqueada: no existe un pago completado para este ticket', 'PAGO_NO_COMPLETADO');

    const movimientoSalida = await idMovimiento(conn, 'salida');
    await conn.execute(
      'UPDATE Tickets SET fecha_salida = NOW(), activo = 0, id_movimiento = ? WHERE id_ticket = ? AND activo = 1',
      [movimientoSalida, ticket.id_ticket],
    );
    await conn.execute('UPDATE Lugares SET id_estado_lugar = 1, fecha_modificacion = NOW() WHERE id_lugar = ?', [ticket.id_lugar]);
    await conn.execute('UPDATE Parqueos SET fecha_liberacion = NOW() WHERE id_ticket = ? AND fecha_liberacion IS NULL', [ticket.id_ticket]);
    await conn.execute(
      `INSERT INTO Tickets_Detalle (id_ticket, id_movimiento, id_usuario, fecha_hora, datos_adicionales, ip_dispositivo)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [ticket.id_ticket, movimientoSalida, idGuardia, datosAuditoria({ accion: 'salida', pago_id: pago.id_pago }), ip],
    );
    await conn.execute(
      `INSERT INTO Parqueos_Detalle (
         id_lugar, id_usuario_accion, estado_anterior, estado_nuevo, fecha_cambio, motivo, datos_adicionales, ip_dispositivo
       ) VALUES (?, ?, 'ocupado', 'disponible', NOW(), 'Salida autorizada con pago completado', ?, ?)`,
      [ticket.id_lugar, idGuardia, datosAuditoria({ id_ticket: ticket.id_ticket, id_pago: pago.id_pago }), ip],
    );
    await conn.execute(
      `INSERT INTO Pagos_Detalle (
         id_pago, id_usuario_accion, id_movimiento, accion, estado_anterior, estado_nuevo,
         fecha_hora, datos_adicionales, ip_dispositivo
       ) VALUES (?, ?, ?, 'SALIDA_AUTORIZADA', 'completado', 'completado', NOW(), ?, ?)`,
      [pago.id_pago, idGuardia, movimientoSalida, datosAuditoria({ id_ticket: ticket.id_ticket, placa: ticket.placa }), ip],
    );

    await conn.commit();
    return { ticket: ticket.numero_ticket, placa: ticket.placa, lugar: ticket.lugar, zona: ticket.zona, monto_pagado: pago.monto_total };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
