import { afterEach, expect, mock, test } from 'bun:test';

let vehicle: Record<string, unknown> | undefined;
let failTicket = false;
let entradaDuplicada = false;
let parametrosVehiculo: unknown[] = [];
let statements: string[] = [];
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
    if (sql.includes('FROM Lugares')) return [[{ id_lugar: 1, codigo: 'C01', zona_nombre: 'A' }]];
    if (sql.includes('FROM Movimientos')) return [[{ id_movimiento: 1 }]];
    if (sql.includes('INSERT INTO Tickets (') && failTicket) throw new Error('ticket failure');
    return [{ insertId: 10 }];
  },
};

mock.module('../config/database', () => ({ getPool: () => ({ getConnection: async () => connection }) }));
const { registrarEntrada } = await import('./guardian.repository');

afterEach(() => {
  vehicle = undefined;
  failTicket = false;
  entradaDuplicada = false;
  parametrosVehiculo = [];
  statements = [];
  committed = rolledBack = released = false;
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
