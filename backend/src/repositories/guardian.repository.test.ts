import { afterEach, expect, mock, test } from 'bun:test';

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
const connection = {
  beginTransaction: async () => {},
  commit: async () => { committed = true; },
  rollback: async () => { rolledBack = true; },
  release: () => { released = true; },
  execute: async (sql: string, params: unknown[] = []) => {
    statements.push(sql);
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
const { registrarEntrada, resumen } = await import('./guardian.repository');

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
