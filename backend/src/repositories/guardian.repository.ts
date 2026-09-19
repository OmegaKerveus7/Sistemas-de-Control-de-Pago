import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database';
import type { CriterioGuardian, RegistroEntradaGuardian, TipoVehiculoGuardian } from '../models';
import { GuardianError } from '../models';
import { parsearQrGuardian } from '../utils/guardian-qr';

type Movimiento = 'entrada' | 'salida' | 'autorizacion_salida';

interface VehiculoActivo extends RowDataPacket {
  placa: string;
  id_usuario: number | null;
  activo: number;
  id_tipo: number;
  tipo_nombre: string;
}

interface LugarDisponible extends RowDataPacket {
  id_lugar: number;
  codigo: string;
  id_zona: number;
  zona_nombre: string;
}

interface ResumenGuardianTotal extends RowDataPacket {
  total: number | string;
  disponibles: number | string;
  ocupados: number | string;
}

interface OcupacionAnteriorGuardian extends RowDataPacket {
  id: number;
  lugar: string;
  zona: string;
}

interface TicketActivo extends RowDataPacket {
  id_ticket: number;
  id_lugar: number;
  id_usuario: number | null;
  numero_ticket: string;
  placa: string;
  codigo_lugar: string;
  zona_nombre: string;
  tipo_nombre: string | null;
  pago_id: number | null;
  pago_estado: string | null;
  pago_completado: number;
}

function normalizarPlaca(placa: string): string {
  return placa.trim().toUpperCase();
}

function validarPlaca(placa: string): { placaNormalizada: string; tipo: TipoVehiculoGuardian } {
  const normalizada = normalizarPlaca(placa);
  const coincidencia = /^([PM])[0-9]{3}[A-Z]{3}$/.exec(normalizada);
  if (!coincidencia) {
    throw new GuardianError(400, 'La placa debe iniciar con P (carro) o M (moto), seguido de 3 números y 3 letras. Ej: P123ABC o M123ABC', 'PLACA_INVALIDA');
  }
  const tipo: TipoVehiculoGuardian = coincidencia[1] === 'P' ? 'carro' : 'moto';
  return { placaNormalizada: normalizada, tipo };
}

function tipoCoincideConPlaca(nombreTipo: string, tipoDetectado: TipoVehiculoGuardian): boolean {
  const normalizado = nombreTipo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const alias = tipoDetectado === 'moto'
    ? ['moto', 'motocicl']
    : ['auto', 'carro', 'camioneta', 'camin', 'pickup', 'suv'];
  return alias.some((valor) => normalizado.includes(valor));
}

function criterioConsulta(criterio: CriterioGuardian): { where: string; params: string[] } {
  if (criterio.placa) return { where: 'UPPER(t.placa) = ?', params: [normalizarPlaca(criterio.placa)] };
  if (criterio.ticket) return { where: 't.numero_ticket = ?', params: [criterio.ticket.trim()] };
  if (criterio.referencia) {
    return {
      where: 'EXISTS (SELECT 1 FROM Pagos pr WHERE pr.id_ticket = t.id_ticket AND pr.codigo_validacion = ?)',
      params: [criterio.referencia.trim()],
    };
  }
  if (criterio.qr) {
    const qr = parsearQrGuardian(criterio.qr);
    return {
      where: `UPPER(t.placa) = ? AND EXISTS (
        SELECT 1 FROM Pagos pr WHERE pr.id_ticket = t.id_ticket AND pr.codigo_validacion = ?
      )`,
      params: [qr.placa, qr.referencia],
    };
  }
  throw new GuardianError(400, 'Indica placa, ticket, referencia de pago o QR', 'CRITERIO_REQUERIDO');
}

async function idMovimiento(conn: PoolConnection, movimiento: Movimiento): Promise<number> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    'SELECT id_movimiento FROM Movimientos WHERE nombre = ? LIMIT 1',
    [movimiento],
  );
  const id = rows[0]?.id_movimiento as number | undefined;
  if (!id) throw new GuardianError(503, `No existe el catálogo de movimiento ${movimiento}`, 'CATALOGO_INCOMPLETO');
  return id;
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
       t.id_usuario,
       t.numero_ticket,
       t.placa,
       l.codigo AS codigo_lugar,
       z.nombre AS zona_nombre,
       tv.nombre AS tipo_nombre,
       pago_reciente.id_pago AS pago_id,
       pago_reciente.estado_pago AS pago_estado,
       EXISTS(
         SELECT 1 FROM Pagos pago_completo
         WHERE pago_completo.id_ticket = t.id_ticket AND pago_completo.estado_pago = 'completado'
       ) AS pago_completado
     FROM Tickets t
     JOIN Lugares l ON l.id_lugar = t.id_lugar
     JOIN Zonas z ON z.id_zona = l.id_zona
     LEFT JOIN Tipo_vehiculo tv ON tv.id_tipo = t.id_tipo
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
  const [totales] = await pool.query<ResumenGuardianTotal[]>(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(el.nombre = 'disponible'), 0) AS disponibles,
       COALESCE(SUM(el.nombre = 'ocupado'), 0) AS ocupados
     FROM Lugares l
     JOIN Estado_Lugar el ON el.id_estado = l.id_estado
     WHERE l.activo = 1`,
  );
  const [porZona] = await pool.query<RowDataPacket[]>(
    `SELECT z.id_zona AS id, z.nombre AS zona,
            COUNT(l.id_lugar) AS total,
            COALESCE(SUM(el.nombre = 'disponible'), 0) AS disponibles,
            COALESCE(SUM(el.nombre = 'ocupado'), 0) AS ocupados
     FROM Zonas z
     LEFT JOIN Lugares l ON l.id_zona = z.id_zona AND l.activo = 1
     LEFT JOIN Estado_Lugar el ON el.id_estado = l.id_estado
     GROUP BY z.id_zona, z.nombre
     ORDER BY z.nombre`,
  );
  const [ocupacionesAnteriores] = await pool.query<OcupacionAnteriorGuardian[]>(
    `SELECT l.id_lugar AS id, l.codigo AS lugar, z.nombre AS zona
     FROM Tickets t
     JOIN Lugares l ON l.id_lugar = t.id_lugar
     JOIN Zonas z ON z.id_zona = l.id_zona
     WHERE t.activo = 1
       AND t.fecha_salida IS NULL
       AND t.fecha_entrada < CURDATE()
     GROUP BY l.id_lugar, l.codigo, z.nombre
     ORDER BY z.nombre, l.codigo`,
  );
  const detalleOcupacionesAnteriores = ocupacionesAnteriores.map(({ id, lugar, zona }) => ({ id, lugar, zona }));
  const total = totales[0] ?? { total: 0, disponibles: 0, ocupados: 0 };
  return {
    total: total.total,
    disponibles: total.disponibles,
    ocupados: total.ocupados,
    ocupados_anteriores: detalleOcupacionesAnteriores.length,
    ocupados_anteriores_detalle: detalleOcupacionesAnteriores,
    por_zona: porZona,
  };
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
    `SELECT l.id_lugar AS id, l.codigo, l.codigo AS lugar, z.id_zona AS zona_id, z.nombre AS zona,
            el.nombre AS estado, el.color,
            permitido.nombre AS tipo_permitido,
            t.numero_ticket AS ticket, t.placa
     FROM Lugares l
     JOIN Zonas z ON z.id_zona = l.id_zona
     JOIN Estado_Lugar el ON el.id_estado = l.id_estado
     LEFT JOIN Tipo_vehiculo permitido ON permitido.id_tipo = l.id_tipo_permitido
     LEFT JOIN Tickets t ON t.id_lugar = l.id_lugar AND t.activo = 1
     WHERE l.activo = 1
     ORDER BY z.nombre, l.codigo`,
  );
  return rows;
}

export async function buscar(criterio: CriterioGuardian) {
  const conn = await getPool().getConnection();
  try {
    const ticket = await ticketActivo(conn, criterio);
    if (!ticket) throw new GuardianError(404, 'No se encontró un vehículo activo', 'VEHICULO_NO_ACTIVO');
    return { ...ticket, lugar: ticket.codigo_lugar, zona: ticket.zona_nombre, tipo_vehiculo: ticket.tipo_nombre };
  } finally {
    conn.release();
  }
}

export async function registrarEntrada(registro: RegistroEntradaGuardian, idGuardia: number, ip: string) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const { placaNormalizada, tipo } = validarPlaca(registro.placa);

    const [vehiculos] = await conn.execute<VehiculoActivo[]>(
      `SELECT v.placa, v.id_usuario, v.id_tipo, v.activo, tv.nombre AS tipo_nombre
       FROM Vehiculos v
       JOIN Tipo_vehiculo tv ON tv.id_tipo = v.id_tipo
       WHERE UPPER(v.placa) = ?
       LIMIT 1 FOR UPDATE`,
      [placaNormalizada],
    );
    const vehiculo = vehiculos[0];
    const idUsuario = vehiculo?.id_usuario ?? null;
    let idTipo: number;
    let tipoNombre: string;
    const esExterno = idUsuario === null ? 1 : 0;

    if (vehiculo) {
      if (Number(vehiculo.activo) !== 1) {
        throw new GuardianError(409, 'Este vehículo está desactivado', 'VEHICULO_INACTIVO');
      }
      idTipo = vehiculo.id_tipo;
      tipoNombre = vehiculo.tipo_nombre;
      if (!tipoCoincideConPlaca(tipoNombre, tipo)) {
        throw new GuardianError(409, `Esta placa ya está registrada como ${tipoNombre}, no coincide con ${tipo}`, 'TIPO_VEHICULO_DISTINTO');
      }
    } else {
      const [tipos] = await conn.execute<RowDataPacket[]>(
        'SELECT id_tipo, nombre FROM Tipo_vehiculo WHERE nombre = ? LIMIT 1',
        [tipo],
      );
      const catalogoTipo = tipos[0];
      if (!catalogoTipo) throw new GuardianError(503, 'No existe el tipo de vehículo solicitado en el catálogo', 'CATALOGO_INCOMPLETO');
      idTipo = catalogoTipo.id_tipo;
      tipoNombre = catalogoTipo.nombre;
      // La FK del ticket requiere que la placa exista, incluso para visitantes.
      // Se revierte junto con la entrada si falla cualquiera de los pasos siguientes.
      await conn.execute(
        `INSERT INTO Vehiculos (placa, id_usuario, id_tipo, activo)
         VALUES (?, NULL, ?, 1)`,
        [placaNormalizada, idTipo],
      );
    }

    const [duplicados] = await conn.execute<RowDataPacket[]>(
      'SELECT id_ticket FROM Tickets WHERE UPPER(placa) = ? AND activo = 1 LIMIT 1 FOR UPDATE',
      [placaNormalizada],
    );
    if (duplicados.length > 0) throw new GuardianError(409, 'Ya existe una entrada activa para esta placa', 'PLACA_ACTIVA');

    const filtrosLugar = [
      'l.activo = 1',
      "el.nombre = 'disponible'",
      '(l.id_tipo_permitido IS NULL OR l.id_tipo_permitido = ?)',
      'NOT EXISTS (SELECT 1 FROM Tickets activo WHERE activo.id_lugar = l.id_lugar AND activo.activo = 1)',
    ];
    const parametrosLugar: number[] = [idTipo];
    if (registro.lugar_id !== undefined) {
      filtrosLugar.push('l.id_lugar = ?');
      parametrosLugar.push(registro.lugar_id);
    }
    if (registro.zona_id !== undefined) {
      filtrosLugar.push('l.id_zona = ?');
      parametrosLugar.push(registro.zona_id);
    }

    const [lugares] = await conn.execute<LugarDisponible[]>(
      `SELECT l.id_lugar, l.codigo, l.id_zona, z.nombre AS zona_nombre
       FROM Lugares l
       JOIN Zonas z ON z.id_zona = l.id_zona
       JOIN Estado_Lugar el ON el.id_estado = l.id_estado
       WHERE ${filtrosLugar.join('\n         AND ')}
       ${registro.lugar_id === undefined ? 'ORDER BY RAND()' : ''}
       LIMIT 1 FOR UPDATE`,
      parametrosLugar,
    );
    const lugar = lugares[0];
    if (!lugar && registro.lugar_id !== undefined) {
      throw new GuardianError(409, 'El espacio seleccionado ya no está disponible o no es compatible con el vehículo', 'LUGAR_NO_DISPONIBLE');
    }
    if (!lugar && registro.zona_id !== undefined) {
      throw new GuardianError(409, 'No hay espacios disponibles compatibles en el parqueo seleccionado', 'SIN_LUGAR_EN_ZONA');
    }
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
         numero_ticket, id_lugar, placa, id_tipo, id_usuario,
         nombre_externo, telefono_externo, es_externo,
         id_guardia_entrada, fecha_entrada, activo
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)`,
      [
        numeroTicket,
        lugar.id_lugar,
        placaNormalizada,
        idTipo,
        idUsuario,
        esExterno ? 'Registro manual por guardia' : null,
        null,
        esExterno,
        idGuardia,
      ],
    );
    const idTicket = ticketResult.insertId;

    await conn.execute('UPDATE Lugares SET id_estado = 2 WHERE id_lugar = ?', [lugar.id_lugar]);
    await conn.execute(
      'INSERT INTO Parqueos (id_lugar, id_ticket, fecha_ocupacion) VALUES (?, ?, NOW())',
      [lugar.id_lugar, idTicket],
    );
    await conn.execute(
      `INSERT INTO Tickets_Detalle (id_ticket, id_movimiento, id_usuario_accion, ip_dispositivo, datos_adicionales)
       VALUES (?, ?, ?, ?, ?)`,
      [idTicket, movimientoEntrada, idGuardia, ip, datosAuditoria({
        placa: placaNormalizada,
        lugar: lugar.codigo,
        zona: lugar.zona_nombre,
        asignacion: registro.lugar_id === undefined ? 'automatica' : 'manual',
      })],
    );

    await conn.commit();
    return {
      id_ticket: idTicket,
      ticket: numeroTicket,
      placa: placaNormalizada,
      tipo_vehiculo: tipoNombre,
      es_externo: esExterno === 1,
      lugar: { id: lugar.id_lugar, numero: lugar.codigo, zona: lugar.zona_nombre },
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
      `INSERT INTO Tickets_Detalle (id_ticket, id_movimiento, id_usuario_accion, ip_dispositivo, datos_adicionales)
       VALUES (?, ?, ?, ?, ?)`,
      [
        ticket.id_ticket,
        movimiento,
        idGuardia,
        ip,
        datosAuditoria({ accion: 'validacion_pago', autorizado, pago_id: ticket.pago_id, estado_pago: ticket.pago_estado }),
      ],
    );
    await conn.commit();
    return { ...ticket, lugar: ticket.codigo_lugar, zona: ticket.zona_nombre, tipo_vehiculo: ticket.tipo_nombre,
      autorizado, mensaje: autorizado ? 'Pago completado; salida disponible para confirmación del guardia' : 'Pago no completado; salida bloqueada' };
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
      `SELECT id_pago, estado_pago, monto
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
      'UPDATE Tickets SET fecha_salida = NOW(), activo = 0, id_guardia_salida = ? WHERE id_ticket = ? AND activo = 1',
      [idGuardia, ticket.id_ticket],
    );
    await conn.execute('UPDATE Lugares SET id_estado = 1 WHERE id_lugar = ?', [ticket.id_lugar]);
    await conn.execute('UPDATE Parqueos SET fecha_liberacion = NOW() WHERE id_ticket = ? AND fecha_liberacion IS NULL', [ticket.id_ticket]);
    await conn.execute(
      `INSERT INTO Tickets_Detalle (id_ticket, id_movimiento, id_usuario_accion, ip_dispositivo, datos_adicionales)
       VALUES (?, ?, ?, ?, ?)`,
      [ticket.id_ticket, movimientoSalida, idGuardia, ip, datosAuditoria({ accion: 'salida', pago_id: pago.id_pago })],
    );

    await conn.commit();
    return { ticket: ticket.numero_ticket, placa: ticket.placa, lugar: ticket.codigo_lugar, zona: ticket.zona_nombre, monto_pagado: pago.monto };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
