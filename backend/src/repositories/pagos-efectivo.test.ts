import { afterEach, expect, mock, test } from 'bun:test';
let ticket: Record<string, unknown> | null = { id_ticket: 1, id_usuario: null, id_tipo: 2, precio_efectivo: '20.00', numero_ticket: 'TK-001', lugar: 'A1', zona: 'Zona A' };
let pagos: Record<string, unknown>[] = [];
let insertArgs: unknown[] | undefined;
let committed = false;
let rolledBack = false;
let failInsert = false;
const conn = {
  beginTransaction: async () => {}, commit: async () => { committed = true; },
  rollback: async () => { rolledBack = true; }, release: () => {},
  query: async (sql: string, args: unknown[]) => {
    if (sql.includes('FROM Tickets')) { expect(sql).toContain('FOR UPDATE'); return [ticket ? [ticket] : []]; }
    if (sql.includes('FROM Pagos')) { expect(sql).toContain('FOR UPDATE'); return [pagos]; }
    if (sql.includes('INSERT INTO Pagos')) { if (failInsert) throw new Error('fallo de escritura'); insertArgs = args; return [{ insertId: 3 }]; }
    if (sql.includes('FROM Usuarios')) { return [[]]; }
    throw new Error('Consulta inesperada');
  },
};
mock.module('../config/database', () => ({ getPool: () => ({ getConnection: async () => conn }) }));
const { crearEfectivo } = await import('./pagos.repository');
const datos = { placa: 'p123abc', id_tipo_vehiculo: 2, id_guardia: 7 };
afterEach(() => {
  ticket = { id_ticket: 1, id_usuario: null, id_tipo: 2, precio_efectivo: '20.00', numero_ticket: 'TK-001', lugar: 'A1', zona: 'Zona A' };
  pagos = []; insertArgs = undefined; committed = rolledBack = failInsert = false;
});
test('cobra la tarifa del ticket y admite visitantes', async () => {
  expect(await crearEfectivo(datos)).toEqual({ id: 3, monto: 20, dueno_email: null, dueno_nombre: null, placa: 'P123ABC', ticket: 'TK-001', lugar: 'A1', zona: 'Zona A', codigo_validacion: expect.stringMatching(/^E-/) });
  expect(insertArgs?.slice(0, 5)).toEqual([1, 7, 'P123ABC', 2, 20]);
  expect(committed).toBe(true);
});
test('bloquea otro cobro si el ticket ya está pagado', async () => {
  pagos = [{ id_pago: 2, estado_pago: 'completado' }];
  await expect(crearEfectivo(datos)).rejects.toThrow('ya está pagado');
  expect(insertArgs).toBeUndefined(); expect(rolledBack).toBe(true);
});
test('bloquea efectivo si existe un checkout pendiente', async () => {
  pagos = [{ id_pago: 2, estado_pago: 'pendiente' }];
  await expect(crearEfectivo(datos)).rejects.toThrow('ya tiene un pago');
  expect(insertArgs).toBeUndefined();
});
test('rechaza un tipo manipulado sin cobrar', async () => {
  await expect(crearEfectivo({ ...datos, id_tipo_vehiculo: 1 })).rejects.toThrow('no coincide');
  expect(insertArgs).toBeUndefined();
});
test('exige un ticket activo', async () => {
  ticket = null;
  await expect(crearEfectivo(datos)).rejects.toThrow('No hay un ticket activo');
});
test('revierte ante un fallo de escritura', async () => {
  failInsert = true;
  await expect(crearEfectivo(datos)).rejects.toThrow('fallo de escritura');
  expect(rolledBack).toBe(true); expect(committed).toBe(false);
});
