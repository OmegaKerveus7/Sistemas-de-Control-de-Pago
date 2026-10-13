import { afterEach, expect, mock, test } from 'bun:test';
let ticket: Record<string, unknown> | null = { id_ticket: 1, id_usuario: null, id_tipo: 2, precio_efectivo: '20.00', numero_ticket: 'TK-001', lugar: 'A1', zona: 'Zona A' };
let pagos: Record<string, unknown>[] = [];
let insertArgs: unknown[] | undefined;
let committed = false;
let rolledBack = false;
let failInsert = false;
let dueno: Record<string, unknown> | null = null;
let vehiculo: Record<string, unknown> | null = null;
let tipoCatalogo: Record<string, unknown> | null = { id_tipo: 2, nombre: 'carro', precio_efectivo: '20.00' };
let sqls: string[] = [];
let visitanteInsertado: unknown[] | undefined;
const conn = {
  beginTransaction: async () => {}, commit: async () => { committed = true; },
  rollback: async () => { rolledBack = true; }, release: () => {},
  query: async (sql: string, args: unknown[]) => {
    sqls.push(sql);
    if (sql.includes('FROM Vehiculos')) return [vehiculo ? [vehiculo] : []];
    if (sql.includes('FROM Tipo_vehiculo')) return [tipoCatalogo ? [tipoCatalogo] : []];
    if (sql.includes('INSERT INTO Vehiculos')) { visitanteInsertado = args; return [{ insertId: 0 }]; }
    if (sql.includes('FROM Tickets')) { expect(sql).toContain('FOR UPDATE'); return [ticket ? [ticket] : []]; }
    if (sql.includes('FROM Pagos')) { expect(sql).toContain('FOR UPDATE'); return [pagos]; }
    if (sql.includes('INSERT INTO Pagos')) { if (failInsert) throw new Error('fallo de escritura'); insertArgs = args; return [{ insertId: 3 }]; }
    if (sql.includes('FROM Usuarios')) {
      // La columna real se llama "email"; consultar "correo" rompe el cobro en la BD.
      expect(sql).toContain('email');
      expect(sql).not.toContain('correo');
      return [dueno ? [dueno] : []];
    }
    throw new Error('Consulta inesperada');
  },
};
mock.module('../config/database', () => ({ getPool: () => ({ getConnection: async () => conn }) }));
const { crearEfectivo } = await import('./pagos.repository');
const datos = { placa: 'p123abc', id_tipo_vehiculo: 2, id_guardia: 7 };
afterEach(() => {
  ticket = { id_ticket: 1, id_usuario: null, id_tipo: 2, precio_efectivo: '20.00', numero_ticket: 'TK-001', lugar: 'A1', zona: 'Zona A' };
  pagos = []; insertArgs = undefined; committed = rolledBack = failInsert = false; dueno = null;
  vehiculo = null; tipoCatalogo = { id_tipo: 2, nombre: 'carro', precio_efectivo: '20.00' }; sqls = []; visitanteInsertado = undefined;
});
test('devuelve el correo y nombre del dueño del ticket para enviar el comprobante', async () => {
  ticket = { ...ticket!, id_usuario: 5 };
  dueno = { email: 'ana@correo.test', nombres: 'Ana', apellidos: 'Pérez' };
  expect(await crearEfectivo(datos)).toMatchObject({ dueno_email: 'ana@correo.test', dueno_nombre: 'Ana Pérez' });
  expect(committed).toBe(true);
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
test('sin ticket activo registra el pago del día por placa y registra al visitante', async () => {
  ticket = null;
  const r = await crearEfectivo(datos);
  expect(r).toMatchObject({ id: 3, monto: 20, placa: 'P123ABC', ticket: '', lugar: 'N/A', zona: 'N/A' });
  expect(insertArgs?.slice(0, 5)).toEqual([null, 7, 'P123ABC', 2, 20]);
  expect(insertArgs?.slice(7)).toEqual([expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 'CF', 'Consumidor Final']);
  expect(visitanteInsertado).toEqual(['P123ABC', 2]);
  expect(sqls.find(sql => sql.includes('FROM Pagos'))).not.toContain('id_ticket');
  expect(committed).toBe(true);
});
test('sin ticket cobra a un vehículo registrado con su tarifa y avisa al dueño', async () => {
  ticket = null;
  vehiculo = { id_usuario: 5, activo: 1, id_tipo: 2, nombre: 'carro', precio_efectivo: '25.00' };
  dueno = { email: 'ana@correo.test', nombres: 'Ana', apellidos: 'Pérez' };
  expect(await crearEfectivo(datos)).toMatchObject({ monto: 25, dueno_email: 'ana@correo.test' });
  expect(insertArgs?.slice(0, 2)).toEqual([null, 5]);
  expect(visitanteInsertado).toBeUndefined();
});
test('sin ticket rechaza un vehículo desactivado, un tipo manipulado y una placa que ya pagó hoy', async () => {
  ticket = null;
  vehiculo = { id_usuario: 5, activo: 0, id_tipo: 2, nombre: 'carro', precio_efectivo: '25.00' };
  await expect(crearEfectivo(datos)).rejects.toThrow('desactivado');
  vehiculo = { id_usuario: 5, activo: 1, id_tipo: 2, nombre: 'carro', precio_efectivo: '25.00' };
  await expect(crearEfectivo({ ...datos, id_tipo_vehiculo: 1 })).rejects.toThrow('no coincide');
  vehiculo = null; tipoCatalogo = { id_tipo: 1, nombre: 'moto', precio_efectivo: '10.00' };
  await expect(crearEfectivo({ ...datos, id_tipo_vehiculo: 1 })).rejects.toThrow('prefijo');
  pagos = [{ id_pago: 9, estado_pago: 'completado' }];
  await expect(crearEfectivo(datos)).rejects.toThrow('ya pagó hoy');
  expect(insertArgs).toBeUndefined();
});
test('guarda NIT y nombre del recibo y rechaza un NIT inválido antes de abrir la transacción', async () => {
  await crearEfectivo({ ...datos, nit: '1234567-8', nombre: 'Ana Pérez' });
  expect(insertArgs?.slice(8)).toEqual(['12345678', 'Ana Pérez']);
  await expect(crearEfectivo({ ...datos, nit: 'abc', nombre: 'Ana' })).rejects.toThrow('NIT');
});
test('el cobro con ticket también declara la vigencia del día', async () => {
  await crearEfectivo(datos);
  expect(insertArgs?.[7]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
test('revierte ante un fallo de escritura', async () => {
  failInsert = true;
  await expect(crearEfectivo(datos)).rejects.toThrow('fallo de escritura');
  expect(rolledBack).toBe(true); expect(committed).toBe(false);
});
