import { afterEach, expect, mock, test } from 'bun:test';
import { hoyGuatemala } from '../utils/fecha';

let vehicle: Record<string, unknown> | undefined;
let failTicket = false;
let entradaDuplicada = false;
let parametrosVehiculo: unknown[] = [];
let lugarDisponible: Record<string, unknown> | undefined = { id_lugar: 1, codigo: 'C01', id_zona: 1, zona_nombre: 'A' };
let parametrosLugar: unknown[] = [];
let statements: string[] = [];
let queryResponses: Array<Record<string, unknown>[]> = [];
let committed = false;
let rolledBack = false;
let released = false;
let ticketBusqueda: Record<string, unknown> | undefined;
let consultaBusqueda: { sql: string; params: unknown[] } | undefined;
const permisoPagado = { id_pago: 40, id_ticket: null, metodo_pago: 'linea', codigo_validacion: 'P-abc' };
let permisoDia: Record<string, unknown> | undefined = permisoPagado;
let consultaPermiso: { sql: string; params: unknown[] } | undefined;
let enlacePago: unknown[] | undefined;
let pagoSalida: Record<string, unknown> | undefined;
let consultaSalida: { sql: string; params: unknown[] } | undefined;
const connection = {
  beginTransaction: async () => {},
  commit: async () => { committed = true; },
  rollback: async () => { rolledBack = true; },
  release: () => { released = true; },
  execute: async (sql: string, params: unknown[] = []) => {
    statements.push(sql);
    if (sql.includes('AS pago_completado')) { consultaBusqueda = { sql, params }; return [ticketBusqueda ? [ticketBusqueda] : []]; }
    if (sql.includes('FROM Pagos') && sql.includes('fecha_vigencia = ?') && sql.includes('metodo_pago')) { consultaPermiso = { sql, params }; return [permisoDia ? [permisoDia] : []]; }
    if (sql.includes('FROM Pagos') && sql.includes('LIMIT 1 FOR UPDATE')) { consultaSalida = { sql, params }; return [pagoSalida ? [pagoSalida] : []]; }
    if (sql.includes('UPDATE Pagos SET id_ticket')) { enlacePago = params; return [{ affectedRows: 1 }]; }
    if (sql.includes('FROM Vehiculos')) return [vehicle ? [vehicle] : []];
    if (sql.includes('FROM Tipo_vehiculo')) return [[{ id_tipo: 2, nombre: 'carro' }]];
    if (sql.includes('SELECT id_ticket FROM Tickets')) return [entradaDuplicada ? [{ id_ticket: 1 }] : []];
    if (sql.includes('INSERT INTO Vehiculos')) parametrosVehiculo = params;
    if (sql.includes('FROM Lugares')) {
      parametrosLugar = params;
      return [lugarDisponible ? [lugarDisponible] : []];
    }
    if (sql.includes('FROM Movimientos')) return [[{ id_movimiento: 1 }]];
    if (sql.includes('INSERT INTO Tickets (') && failTicket) throw new Error('ticket failure');
    return [{ insertId: 10 }];
  },
};

const pool = {
  getConnection: async () => connection,
  query: async (sql: string) => {
    statements.push(sql);
    return [queryResponses.shift() ?? []];
  },
};

mock.module('../config/database', () => ({ getPool: () => pool }));
const { registrarEntrada, registrarSalida, resumen, buscar, detalleIndicador } = await import('./guardian.repository');
const hoy = hoyGuatemala();

afterEach(() => {
  vehicle = undefined;
  failTicket = false;
  entradaDuplicada = false;
  parametrosVehiculo = [];
  lugarDisponible = { id_lugar: 1, codigo: 'C01', id_zona: 1, zona_nombre: 'A' };
  parametrosLugar = [];
  statements = [];
  queryResponses = [];
  committed = rolledBack = released = false;
  ticketBusqueda = undefined;
  consultaBusqueda = undefined;
  permisoDia = permisoPagado; consultaPermiso = enlacePago = pagoSalida = consultaSalida = undefined;
  delete process.env.EXIGIR_PAGO_EN_ENTRADA;
});

test('incluye en el resumen los espacios ocupados desde días anteriores', async () => {
  queryResponses = [
    [{ total: 80, disponibles: 75, ocupados: 5 }],
    [{ id: 1, zona: 'Parqueo Principal', total: 50, disponibles: 45, ocupados: 5 }],
    [
      { id: 55, lugar: 'B05', zona: 'Parqueo del Domo' },
      { id: 57, lugar: 'B07', zona: 'Parqueo del Domo' },
      { id: 3, lugar: 'A03', zona: 'Parqueo Principal' },
    ],
  ];

  const result = await resumen();

  expect(result.ocupados_anteriores).toBe(3);
  expect(result.ocupados_anteriores_detalle).toEqual([
    { id: 55, lugar: 'B05', zona: 'Parqueo del Domo' },
    { id: 57, lugar: 'B07', zona: 'Parqueo del Domo' },
    { id: 3, lugar: 'A03', zona: 'Parqueo Principal' },
  ]);
  expect(statements[2]).toContain('t.fecha_entrada < CURDATE()');
  expect(statements[2]).toContain('t.fecha_salida IS NULL');
  expect(statements[2]).toContain('GROUP BY l.id_lugar');
});

test('registra el vehículo visitante antes del ticket en la misma transacción', async () => {
  const result = await registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1');
  const vehicleIndex = statements.findIndex(sql => sql.includes('INSERT INTO Vehiculos'));
  const ticketIndex = statements.findIndex(sql => sql.includes('INSERT INTO Tickets ('));
  expect(vehicleIndex).toBeGreaterThan(-1);
  expect(vehicleIndex).toBeLessThan(ticketIndex);
  expect(result.es_externo).toBe(true);
  expect(parametrosVehiculo).toEqual(['P123ABC', 2]);
  expect(committed).toBe(true);
  expect(released).toBe(true);
});

test('asigna un espacio al azar cuando el guardia no elige ubicación', async () => {
  await registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1');
  const consultaLugar = statements.find(sql => sql.includes('FROM Lugares')) ?? '';
  expect(consultaLugar).toContain('ORDER BY RAND()');
  expect(consultaLugar).not.toContain('l.id_lugar = ?');
  expect(parametrosLugar).toEqual([2]);
});

test('asigna al azar dentro del parqueo seleccionado', async () => {
  lugarDisponible = { id_lugar: 55, codigo: 'B05', id_zona: 2, zona_nombre: 'Parqueo del Domo' };
  const result = await registrarEntrada({ placa: 'P123ABC', zona_id: 2 }, 1, '127.0.0.1');
  const consultaLugar = statements.find(sql => sql.includes('FROM Lugares')) ?? '';
  expect(consultaLugar).toContain('l.id_zona = ?');
  expect(consultaLugar).toContain('ORDER BY RAND()');
  expect(parametrosLugar).toEqual([2, 2]);
  expect(result.lugar).toEqual({ id: 55, numero: 'B05', zona: 'Parqueo del Domo' });
});

test('respeta el espacio específico seleccionado por el guardia', async () => {
  lugarDisponible = { id_lugar: 55, codigo: 'B05', id_zona: 2, zona_nombre: 'Parqueo del Domo' };
  const result = await registrarEntrada({ placa: 'P123ABC', zona_id: 2, lugar_id: 55 }, 1, '127.0.0.1');
  const consultaLugar = statements.find(sql => sql.includes('FROM Lugares')) ?? '';
  expect(consultaLugar).toContain('l.id_lugar = ?');
  expect(consultaLugar).toContain('l.id_zona = ?');
  expect(consultaLugar).not.toContain('ORDER BY RAND()');
  expect(parametrosLugar).toEqual([2, 55, 2]);
  expect(result.lugar).toEqual({ id: 55, numero: 'B05', zona: 'Parqueo del Domo' });
});

test('rechaza un espacio específico que ya no está disponible', async () => {
  lugarDisponible = undefined;
  await expect(
    registrarEntrada({ placa: 'P123ABC', zona_id: 2, lugar_id: 55 }, 1, '127.0.0.1'),
  ).rejects.toMatchObject({ codigo: 'LUGAR_NO_DISPONIBLE' });
  expect(rolledBack).toBe(true);
  expect(statements.some(sql => sql.includes('INSERT INTO Tickets ('))).toBe(false);
});

test('un visitante que regresa sigue siendo externo y no se inserta otra vez', async () => {
  vehicle = { placa: 'P123ABC', id_usuario: null, id_tipo: 2, tipo_nombre: 'carro', activo: 1 };
  const result = await registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1');
  expect(result.es_externo).toBe(true);
  expect(statements.some(sql => sql.includes('INSERT INTO Vehiculos'))).toBe(false);
});

test('rechaza vehículos desactivados antes de crear un ticket', async () => {
  vehicle = { placa: 'P123ABC', id_usuario: 2, id_tipo: 2, tipo_nombre: 'carro', activo: 0 };
  await expect(registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1')).rejects.toMatchObject({ codigo: 'VEHICULO_INACTIVO' });
  expect(statements.some(sql => sql.includes('INSERT INTO Tickets ('))).toBe(false);
  expect(rolledBack).toBe(true);
});

test('rechaza un tipo registrado que no coincide con el prefijo de la placa', async () => {
  vehicle = { placa: 'P123ABC', id_usuario: 2, id_tipo: 1, tipo_nombre: 'moto', activo: 1 };
  await expect(registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1')).rejects.toMatchObject({ codigo: 'TIPO_VEHICULO_DISTINTO' });
  expect(statements.some(sql => sql.includes('FROM Lugares'))).toBe(false);
  expect(rolledBack).toBe(true);
});

test('acepta una camioneta registrada con placa de prefijo P', async () => {
  vehicle = { placa: 'P123ABC', id_usuario: 2, id_tipo: 3, tipo_nombre: 'camioneta', activo: 1 };
  const result = await registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1');
  expect(result.tipo_vehiculo).toBe('camioneta');
  expect(parametrosLugar).toEqual([3]);
});

test('revierte la transacción si falla la creación del ticket', async () => {
  failTicket = true;
  await expect(registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1')).rejects.toThrow('ticket failure');
  expect(committed).toBe(false);
  expect(rolledBack).toBe(true);
  expect(released).toBe(true);
});

test('conserva el propietario de un vehículo registrado', async () => {
  vehicle = { placa: 'P123ABC', id_usuario: 2, id_tipo: 2, tipo_nombre: 'carro', activo: 1 };
  const result = await registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1');
  expect(result.es_externo).toBe(false);
  expect(statements.some(sql => sql.includes('INSERT INTO Vehiculos'))).toBe(false);
});

test('rechaza una entrada duplicada sin crear otro ticket', async () => {
  entradaDuplicada = true;
  vehicle = { placa: 'P123ABC', id_usuario: null, id_tipo: 2, tipo_nombre: 'carro', activo: 1 };
  await expect(registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1')).rejects.toMatchObject({ codigo: 'PLACA_ACTIVA' });
  expect(statements.some(sql => sql.includes('INSERT INTO Tickets ('))).toBe(false);
  expect(rolledBack).toBe(true);
});

const ticketSinPagar = { id_ticket: 7, numero_ticket: 'TK-ABC-1', placa: 'P123ABC', codigo_lugar: 'A1', zona_nombre: 'Zona A', tipo_nombre: 'carro', pago_id: null, pago_estado: null, pago_completado: 0 };

test('el QR del ticket encuentra un ticket SIN pago y lo reporta como no pagado', async () => {
  ticketBusqueda = ticketSinPagar;
  const r = await buscar({ qr: 'BELEN-TKT|v1|tk-abc-1|p123abc' });
  expect(consultaBusqueda?.sql).toContain('t.numero_ticket = ? AND UPPER(t.placa) = ?');
  expect(consultaBusqueda?.sql).not.toContain('codigo_validacion');
  expect(consultaBusqueda?.params).toEqual([hoy, hoy, 'TK-ABC-1', 'P123ABC']);
  expect(r).toMatchObject({ numero_ticket: 'TK-ABC-1', pago_completado: 0, pago_estado: null, lugar: 'A1', zona: 'Zona A' });
});

test('el QR del ticket refleja el pago cuando ya está completado', async () => {
  ticketBusqueda = { ...ticketSinPagar, pago_id: 3, pago_estado: 'completado', pago_completado: 1 };
  expect(await buscar({ qr: 'BELEN-TKT|v1|TK-ABC-1|P123ABC' })).toMatchObject({ pago_completado: 1, pago_estado: 'completado' });
});

test('un QR de ticket que no existe o ya salió responde 404', async () => {
  await expect(buscar({ qr: 'BELEN-TKT|v1|TK-NOEXISTE|P123ABC' })).rejects.toMatchObject({ status: 404 });
});

test('un QR de ticket mal formado se rechaza antes de consultar la BD', async () => {
  await expect(buscar({ qr: 'BELEN-TKT|v1|TK-ABC-1|XYZ' })).rejects.toMatchObject({ status: 400 });
  expect(consultaBusqueda).toBeUndefined();
});

test('el QR de pago BELEN-PAGO sigue funcionando por referencia', async () => {
  ticketBusqueda = { ...ticketSinPagar, pago_id: 3, pago_estado: 'completado', pago_completado: 1 };
  await buscar({ qr: 'BELEN-PAGO|v1|E-abc123|p123abc' });
  expect(consultaBusqueda?.sql).toContain('pr.codigo_validacion = ?');
  expect(consultaBusqueda?.params).toEqual([hoy, hoy, 'P123ABC', 'E-abc123']);
});

test('un QR desconocido indica los formatos aceptados', async () => {
  await expect(buscar({ qr: 'hola' })).rejects.toThrow('BELEN-TKT|v1|ticket|placa');
});

test('la búsqueda considera pagado al ticket cubierto por el pago del día de su placa', async () => {
  ticketBusqueda = ticketSinPagar;
  await buscar({ placa: 'P123ABC' });
  expect(consultaBusqueda?.sql).toContain('pago_completo.placa = t.placa AND pago_completo.fecha_vigencia = ?');
  expect(consultaBusqueda?.sql).toContain('p.placa = t.placa AND p.fecha_vigencia = ?');
});

test('la entrada sin pago crea el ticket incluso si la configuración antigua exigía pagar primero', async () => {
  process.env.EXIGIR_PAGO_EN_ENTRADA = 'true';
  permisoDia = undefined;
  const result = await registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1');
  expect(result).toMatchObject({ pago_vigente: false, pago: null });
  expect(statements.some(sql => sql.includes('INSERT INTO Tickets ('))).toBe(true);
  expect(committed).toBe(true);
});

test('con EXIGIR_PAGO_EN_ENTRADA=false permite entrar sin pago y reporta que no hay pago vigente', async () => {
  process.env.EXIGIR_PAGO_EN_ENTRADA = 'false';
  permisoDia = undefined;
  const result = await registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1');
  expect(result).toMatchObject({ pago_vigente: false, pago: null });
  expect(enlacePago).toBeUndefined();
});

test('la entrada con pago del día enlaza ese pago al nuevo ticket', async () => {
  const result = await registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1');
  expect(result).toMatchObject({ pago_vigente: true, pago: { metodo: 'linea', referencia: 'P-abc' } });
  expect(enlacePago).toEqual([10, 40]);
  expect(committed).toBe(true);
});

test('un reingreso el mismo día reutiliza el pago ya enlazado sin volver a enlazarlo', async () => {
  permisoDia = { ...permisoPagado, id_ticket: 7 };
  const result = await registrarEntrada({ placa: 'P123ABC' }, 1, '127.0.0.1');
  expect(result.pago_vigente).toBe(true);
  expect(enlacePago).toBeUndefined();
});

test('la salida acepta el pago del día de la placa y sigue bloqueada sin pago', async () => {
  ticketBusqueda = ticketSinPagar;
  pagoSalida = { id_pago: 40, estado_pago: 'completado', monto: '20.00' };
  const salida = await registrarSalida({ placa: 'P123ABC' }, 1, '127.0.0.1');
  expect(salida.monto_pagado).toBe('20.00');
  expect(consultaSalida?.sql).toContain('placa = ? AND fecha_vigencia = ?');
  expect(consultaSalida?.params).toEqual([7, 'P123ABC', hoy]);

  pagoSalida = undefined;
  await expect(registrarSalida({ placa: 'P123ABC' }, 1, '127.0.0.1')).rejects.toMatchObject({ codigo: 'PAGO_NO_COMPLETADO' });
});

test('rechaza indicadores inválidos antes de consultar la BD', async () => {
  for (const tipo of ['otro', '__proto__', 'entradas OR 1=1']) await expect(detalleIndicador(tipo)).rejects.toMatchObject({ status: 400 });
  expect(statements).toEqual([]);
});

test('detalle de espacios filtra habilitados y disponibles y devuelve el total del listado', async () => {
  queryResponses = [[{ id: 1, lugar: 'A01', zona: 'A' }]];
  const detalle = await detalleIndicador('espacios');
  expect(detalle.total).toBe(detalle.filas.length);
  expect(detalle.total).toBe(1);
  expect(statements[0]).toContain("l.activo = 1 AND el.nombre = 'disponible'");
});

test('detalle de pagos pendientes elige el pago pendiente de cada ticket activo', async () => {
  await detalleIndicador('pendientes');
  expect(statements[0]).toContain("t.activo = 1 AND EXISTS (SELECT 1 FROM Pagos pendiente");
  expect(statements[0]).toContain("AND ultimo.estado_pago = 'pendiente'");
  expect(statements[0]).toContain('pg.id_pago = (');
});

test('sin pago excluye cualquier pago, entradas y salidas usan la fecha de la BD', async () => {
  await detalleIndicador('sin_pago');
  expect(statements[0]).toContain('t.activo = 1 AND NOT EXISTS (SELECT 1 FROM Pagos ninguno WHERE ninguno.id_ticket = t.id_ticket)');
  await detalleIndicador('entradas');
  expect(statements[1]).toContain('WHERE DATE(t.fecha_entrada) = CURDATE()');
  await detalleIndicador('salidas');
  expect(statements[2]).toContain('WHERE DATE(t.fecha_salida) = CURDATE()');
  await detalleIndicador('vehiculos');
  expect(statements[3]).toContain('WHERE t.activo = 1');
  expect(statements[3]).not.toContain('CURDATE()');
});
