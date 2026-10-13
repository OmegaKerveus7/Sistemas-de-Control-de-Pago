import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { hoyGuatemala } from '../utils/fecha';

type Fila = Record<string, unknown>;
let vehiculo: Fila | null;
let pagos: Fila[];
let dentro: boolean;
let insertsPago: unknown[][];
let insertsVehiculo: unknown[][];
let committed = false;
let rolledBack = false;
const tipoCarro = { id_tipo: 2, nombre: 'carro', precio_efectivo: '20.00', precio_linea: '27.00' };

async function query(sql: string, args: unknown[] = []): Promise<unknown[]> {
  if (sql.includes('FROM Vehiculos v JOIN Tipo_vehiculo')) return [vehiculo ? [vehiculo] : []];
  if (sql.includes('FROM Tipo_vehiculo WHERE nombre')) return [args[0] === 'carro' ? [tipoCarro] : []];
  if (sql.includes('INSERT INTO Vehiculos')) { insertsVehiculo.push(args); return [{ insertId: 0 }]; }
  if (sql.includes('FROM Tickets WHERE placa')) return [dentro ? [{ 1: 1 }] : []];
  if (sql.includes('SELECT pg.estado_pago, pg.metodo_pago')) return [pagos.slice(0, 1)];
  if (sql.startsWith('SELECT pg.* ')) { expect(sql).toContain('FOR UPDATE'); return [[...pagos]]; }
  if (sql.includes('INSERT INTO Pagos')) {
    insertsPago.push([sql, ...args]);
    pagos.unshift({ id_pago: 1, id_ticket: null, id_usuario: null, placa: args[0], monto: args[2], codigo_validacion: args[3], estado_pago: 'pendiente',
      metodo_pago: 'linea', transaction_id: null, gateway_response: JSON.parse(String(args[4])), fecha_vigencia: args[6], nit: args[7], nombre_facturacion: args[8] });
    return [{ insertId: 1 }];
  }
  if (sql.includes('FROM Pagos WHERE codigo_validacion')) return [pagos.filter(p => p.codigo_validacion === args[0])];
  if (sql.includes('SET transaction_id')) { Object.assign(pagos[0]!, { transaction_id: String(args[0]), gateway_response: JSON.parse(String(args[1])) }); return [{ affectedRows: 1 }]; }
  if (sql.includes('SET estado_pago')) { if (['pendiente', 'fallido'].includes(String(pagos[0]?.estado_pago))) pagos[0]!.estado_pago = String(args[0]); return [{ affectedRows: 1 }]; }
  throw new Error(`SQL no simulado: ${sql}`);
}
const conn = { query, beginTransaction: async () => {}, commit: async () => { committed = true; }, rollback: async () => { rolledBack = true; }, release: () => {} };
mock.module('../config/database', () => ({ getPool: () => ({ query, getConnection: async () => conn }) }));
const service = await import('../services/pagos-publico.service');
const { limitarPeticiones } = await import('../middleware/rate-limit.middleware');
const env = { ...process.env };
const hoy = hoyGuatemala();

beforeEach(() => {
  vehiculo = null; pagos = []; dentro = false; insertsPago = []; insertsVehiculo = []; committed = rolledBack = false;
  process.env.NODE_ENV = 'test'; process.env.PAYMENT_PROVIDER = 'mock';
});
afterEach(() => { process.env = { ...env }; });

test('consulta pública de una placa nueva: tarifa por prefijo, sin pago y sin exponer la referencia', async () => {
  const r = await service.consultar(' p123abc ');
  expect(r).toMatchObject({ placa: 'P123ABC', registrada: false, id_tipo: 2, tipo: 'carro', tarifa_online: 27, tarifa_efectivo: 20, pagado_hoy: false, pago: null, fecha_vigencia: hoy });
});

test('la consulta pública nunca devuelve referencia ni datos de facturación; la del personal sí', async () => {
  pagos = [{ estado_pago: 'completado', metodo_pago: 'linea', monto: '27.00', codigo_validacion: 'P-secreta', fecha_confirmacion: '2026-10-12 08:00:00', nit: '12345678', nombre_facturacion: 'Ana' }];
  const publico = await service.consultar('P123ABC');
  expect(publico.pagado_hoy).toBe(true);
  expect(JSON.stringify(publico)).not.toContain('P-secreta');
  expect(JSON.stringify(publico)).not.toContain('12345678');
  expect((await service.consultarDetalle('P123ABC')).pago).toMatchObject({ referencia: 'P-secreta', nit: '12345678', nombre: 'Ana' });
});

test('rechaza placas con formato inválido', async () => {
  await expect(service.consultar('XYZ')).rejects.toThrow('La placa debe iniciar con P');
});

test('paga sin sesión: reserva sin usuario ni ticket, registra al visitante y guarda NIT y nombre', async () => {
  const r = await service.crear('p123abc', '1234567-8', '  Ana   Pérez ', 27);
  expect(r.referencia).toMatch(/^P-[a-f0-9]{18}$/);
  expect(r.url_pago).toContain('simulador?referencia=');
  expect(committed).toBe(true);
  expect(insertsVehiculo).toEqual([['P123ABC', 2]]);
  const [sql, placa, tipo, monto, , , , vigencia, nit, nombre] = insertsPago[0]!;
  expect(sql).toContain('VALUES (NULL, NULL');
  expect([placa, tipo, monto, vigencia, nit, nombre]).toEqual(['P123ABC', 2, 27, hoy, '12345678', 'Ana Pérez']);
});

test('CF sin nombre queda como Consumidor Final', async () => {
  await service.crear('P123ABC', 'cf', '', 27);
  expect(insertsPago[0]!.slice(8)).toEqual(['CF', 'Consumidor Final']);
});

test('un segundo intento reutiliza el mismo pago sin crear otro cobro ni sobrescribir la facturación', async () => {
  const primero = await service.crear('P123ABC', '12345678', 'Ana', 27);
  const segundo = await service.crear('P123ABC', 'CF', '', 27);
  expect(segundo).toEqual(primero);
  expect(insertsPago).toHaveLength(1);
  expect(pagos[0]).toMatchObject({ nit: '12345678', nombre_facturacion: 'Ana' });
});

test('no cobra otra vez a una placa que ya pagó hoy', async () => {
  pagos = [{ id_pago: 5, estado_pago: 'completado', gateway_response: { modo: 'mock' }, monto: '27.00' }];
  await expect(service.crear('P123ABC', 'CF', '', 27)).rejects.toThrow('ya pagó hoy');
  expect(insertsPago).toHaveLength(0); expect(rolledBack).toBe(true);
});

test('el servidor manda la tarifa: un monto manipulado o una placa desactivada no generan cobro', async () => {
  await expect(service.crear('P123ABC', 'CF', '', 10)).rejects.toThrow('tarifa cambió');
  vehiculo = { activo: 0, id_tipo: 2, nombre: 'carro', precio_efectivo: '20.00', precio_linea: '27.00' };
  await expect(service.crear('P123ABC', 'CF', '', 27)).rejects.toThrow('desactivado');
  expect(insertsPago).toHaveLength(0);
});

test('un vehículo registrado paga su tarifa y no se vuelve a insertar', async () => {
  vehiculo = { activo: 1, id_tipo: 3, nombre: 'camioneta', precio_efectivo: '25.00', precio_linea: '30.00' };
  await service.crear('P123ABC', 'CF', '', 30);
  expect(insertsVehiculo).toHaveLength(0);
  expect(insertsPago[0]![3]).toBe(30);
});

test('rechaza un tipo registrado que no coincide con el prefijo de la placa', async () => {
  vehiculo = { activo: 1, id_tipo: 1, nombre: 'moto', precio_efectivo: '10.00', precio_linea: '15.00' };
  await expect(service.crear('P123ABC', 'CF', '', 15)).rejects.toThrow('no coincide');
});

test('valida el NIT y el nombre antes de tocar la BD', async () => {
  await expect(service.crear('P123ABC', 'abc', 'Ana', 27)).rejects.toThrow('NIT');
  await expect(service.crear('P123ABC', '', 'Ana', 27)).rejects.toThrow('NIT');
  await expect(service.crear('P123ABC', '12345678', '', 27)).rejects.toThrow('nombre');
  expect(insertsPago).toHaveLength(0); expect(committed).toBe(false);
});

test('simulador público: pendiente no entrega recibo; aprobado sí, con NIT y vigencia', async () => {
  const { referencia } = await service.crear('P123ABC', '12345678', 'Ana Pérez', 27);
  const antes = await service.confirmar(referencia);
  expect(antes.aprobado).toBe(false);
  expect('recibo' in antes).toBe(false);
  expect((await service.simular(referencia, 'completado')).aprobado).toBe(true);
  const despues = await service.confirmar(referencia);
  expect(despues).toMatchObject({ aprobado: true, recibo: { referencia, placa: 'P123ABC', monto: 27, nit: '12345678', nombre: 'Ana Pérez', fecha_vigencia: hoy } });
});

test('el simulador no existe fuera del modo mock', async () => {
  const { referencia } = await service.crear('P123ABC', 'CF', '', 27);
  process.env.PAYMENT_PROVIDER = 'recurrente'; process.env.PAYMENT_MODE = 'sandbox'; process.env.RECURRENTE_SECRET_KEY = 'sk_test_fixture';
  await expect(service.simular(referencia, 'completado')).rejects.toThrow('no disponible');
});

test('el límite de peticiones responde 429 con Retry-After al excederse y es por IP', async () => {
  const limite = limitarPeticiones('prueba', 2, 60_000);
  const llamar = (ip: string) => {
    let estado = 200; let reintento: string | undefined; let paso = false;
    const res = { setHeader: (_: string, v: string) => { reintento = v; }, status: (c: number) => { estado = c; return { json: () => {} }; } };
    limite({ headers: {}, socket: { remoteAddress: ip } } as never, res as never, () => { paso = true; });
    return { estado, reintento, paso };
  };
  expect(llamar('1.1.1.1').paso).toBe(true);
  expect(llamar('1.1.1.1').paso).toBe(true);
  const bloqueada = llamar('1.1.1.1');
  expect(bloqueada).toMatchObject({ estado: 429, paso: false });
  expect(Number(bloqueada.reintento)).toBeGreaterThan(0);
  expect(llamar('2.2.2.2').paso).toBe(true);
});

test('rutas HTTP públicas: sin sesión se consulta, se paga y se confirma; el personal sí necesita token', async () => {
  const { default: express } = await import('express');
  const { publicoRouter } = await import('../routes/publico.routes');
  const { pagosRouter } = await import('../routes/pagos.routes');
  const app = express(); app.use(express.json()); app.use('/api/publico', publicoRouter); app.use('/api/pagos', pagosRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const json = { 'Content-Type': 'application/json' };
  try {
    const consulta = await fetch(`${base}/publico/pago/placa/P123ABC`);
    expect(consulta.status).toBe(200);
    expect(await consulta.json()).toMatchObject({ placa: 'P123ABC', tarifa_online: 27, pagado_hoy: false });
    expect((await fetch(`${base}/publico/pago/placa/ZZZ`)).status).toBe(400);
    expect((await fetch(`${base}/publico/pago`, { method: 'POST', headers: json, body: JSON.stringify({ placa: 'P123ABC', nit: 'CF', monto_esperado: 'x' }) })).status).toBe(400);
    expect((await fetch(`${base}/publico/pago`, { method: 'POST', headers: json, body: JSON.stringify({ placa: 'P123ABC', nit: 'CF', monto_esperado: 27 }) })).status).toBe(201);
    expect((await fetch(`${base}/publico/pago/no-es-referencia`)).status).toBe(400);
    expect((await fetch(`${base}/pagos/permiso/P123ABC`)).status).toBe(401);
    expect((await fetch(`${base}/pagos/estado-hoy`)).status).toBe(401);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
