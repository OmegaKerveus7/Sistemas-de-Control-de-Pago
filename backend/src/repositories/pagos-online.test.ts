import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import type { PagoOnline } from './pagos-online.repository';
let pago: PagoOnline | undefined;
let calls: string[] = [];
let committed = false;
let rolledBack = false;
let created = 0;
let tarifa = 27;
async function query(sql: string, args: unknown[] = []): Promise<unknown[]> {
  calls.push(sql);
  if (sql.includes('FROM Tickets t')) return [[{ id_ticket: 5, placa: 'P123ABC', id_tipo: 2, precio_linea: tarifa }]];
  if (sql.includes('FROM Pagos WHERE id_ticket')) return [pago ? [{ ...pago }] : []];
  if (sql.includes('FROM Pagos WHERE codigo_validacion')) return [pago && pago.codigo_validacion === args[0] && (args.length === 1 || pago.id_usuario === args[1]) ? [{ ...pago }] : []];
  if (sql.includes('INSERT INTO Pagos')) {
    pago = { id_pago: 1, id_ticket: args[0], id_usuario: args[1], placa: args[2], monto: args[4], codigo_validacion: args[5], estado_pago: 'pendiente', transaction_id: null, gateway_response: JSON.parse(String(args[6])) } as PagoOnline;
    return [{ insertId: 1 }];
  }
  if (sql.includes('SET transaction_id')) {
    if (pago && (!pago.transaction_id || pago.transaction_id === args[3])) { pago.transaction_id = String(args[0]); pago.gateway_response = JSON.parse(String(args[1])); }
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('SET estado_pago')) {
    expect(sql).toContain("estado_pago IN ('pendiente', 'fallido')");
    if (pago && ['pendiente', 'fallido'].includes(pago.estado_pago)) pago.estado_pago = String(args[0]);
    return [{ affectedRows: 1 }];
  }
  throw new Error(`SQL no simulado: ${sql}`);
}
const conn = { query, beginTransaction: async () => {}, commit: async () => { committed = true; }, rollback: async () => { rolledBack = true; }, release: () => {} };
mock.module('../config/database', () => ({ getPool: () => ({ query, getConnection: async () => conn }) }));
const service = await import('../services/pagos-online.service');
const { reservar } = await import('./pagos-online.repository');
const originalFetch = globalThis.fetch;
const env = { ...process.env };
beforeEach(() => { pago = undefined; calls = []; committed = rolledBack = false; created = 0; tarifa = 27; process.env.NODE_ENV = 'test'; process.env.PAYMENT_PROVIDER = 'mock'; });
afterEach(() => { process.env = { ...env }; globalThis.fetch = originalFetch; });
function sandbox(status = 'unpaid', override: Record<string, unknown> = {}) {
  process.env.PAYMENT_PROVIDER = 'recurrente'; process.env.PAYMENT_MODE = 'sandbox'; process.env.RECURRENTE_SECRET_KEY = 'sk_test_fixture';
  globalThis.fetch = (async (_url: unknown, options?: RequestInit) => {
    if (options?.method === 'POST') { created++; expect(committed).toBe(true); }
    return Response.json({ id: 'ch_test', status, checkout_url: 'https://app.recurrente.com/checkout-session/ch_test', total_in_cents: 2700, currency: 'GTQ', live_mode: false, metadata: { referencia: pago?.codigo_validacion }, ...override });
  }) as typeof fetch;
}
function evento(tipo = 'intent.succeeded') {
  const body = Buffer.from(JSON.stringify({ event_type: tipo, checkout: { id: 'ch_test' } }));
  const timestamp = String(Math.floor(Date.now() / 1000));
  process.env.RECURRENTE_WEBHOOK_SECRET = 'whsec_' + Buffer.from('secret').toString('base64');
  const signature = createHmac('sha256', Buffer.from('secret')).update(`msg_1.${timestamp}.`).update(body).digest('base64');
  return { body, headers: { id: 'msg_1', timestamp, signature: `v1,${signature}` } };
}
test('usa tarifa de BD y bloquea cambios de monto antes del insert', async () => {
  await expect(service.crear(3, 7, 5)).rejects.toThrow('tarifa cambió');
  expect(pago).toBeUndefined(); expect(rolledBack).toBe(true);
  expect(calls.some(sql => sql.includes('FROM Tickets t') && sql.includes('FOR UPDATE'))).toBe(true);
});
test('reutiliza el checkout y restringe el pago al usuario que lo inició', async () => {
  sandbox();
  const first = await service.crear(3, 7, 27);
  expect(await service.crear(3, 7, 27)).toEqual(first);
  expect(created).toBe(1);
  await expect(service.crear(3, 8, 27)).rejects.toThrow('otro usuario');
  await expect(service.confirmar(first.referencia, 8)).rejects.toThrow('no encontrado');
});
test('simulador: pendiente, rechazo, reintento, aprobado y confirmación repetida', async () => {
  const first = await service.crear(3, 7, 27);
  expect((await service.confirmar(first.referencia, 7)).aprobado).toBe(false);
  expect((await service.simular(first.referencia, 7, 'fallido')).estado).toBe('fallido');
  expect((await service.simular(first.referencia, 7, 'completado')).aprobado).toBe(true);
  expect((await service.simular(first.referencia, 7, 'fallido')).aprobado).toBe(true);
  expect((await service.confirmar(first.referencia, 7)).aprobado).toBe(true);
  await expect(service.crear(3, 7, 27)).rejects.toThrow('ya está pagado');
});
test('sandbox no permite aprobar usando el endpoint del simulador', async () => {
  sandbox(); const first = await service.crear(3, 7, 27);
  await expect(service.simular(first.referencia, 7, 'completado')).rejects.toThrow('no disponible');
  expect(pago?.estado_pago).toBe('pendiente');
});
test('un retorno al frontend no equivale a un pago aprobado', async () => {
  sandbox(); const first = await service.crear(3, 7, 27);
  expect((await service.confirmar(first.referencia, 7)).aprobado).toBe(false);
  sandbox('paid'); expect((await service.confirmar(first.referencia, 7)).aprobado).toBe(true);
});
test('rechaza confirmaciones de importe diferente y ambientes mezclados', async () => {
  sandbox(); const first = await service.crear(3, 7, 27);
  sandbox('paid', { total_in_cents: 5 });
  await expect(service.confirmar(first.referencia, 7)).rejects.toThrow('no coincide');
  process.env.PAYMENT_PROVIDER = 'mock';
  await expect(service.confirmar(first.referencia, 7)).rejects.toThrow('otro ambiente');
  expect(pago?.estado_pago).toBe('pendiente');
});
test('persiste reserva antes de llamar la API; respuesta perdida no crea otro checkout', async () => {
  sandbox();
  globalThis.fetch = (async () => { created++; expect(committed).toBe(true); throw new Error('timeout'); }) as unknown as typeof fetch;
  await expect(service.crear(3, 7, 27)).rejects.toThrow('No se pudo preparar');
  await expect(service.crear(3, 7, 27)).rejects.toThrow('no se generará otro cobro'.replace('no', 'No'));
  expect(created).toBe(1); expect(pago?.estado_pago).toBe('pendiente');
});
test('webhook recupera respuesta perdida y es idempotente ante entregas repetidas', async () => {
  sandbox(); await reservar(3, 7, 'sandbox', 27);
  sandbox('paid'); const { body, headers } = evento();
  await service.webhook(body, headers); await service.webhook(body, headers);
  expect(pago?.estado_pago).toBe('completado'); expect(pago?.transaction_id).toBe('ch_test');
  sandbox(); const failed = evento('intent.failed'); await service.webhook(failed.body, failed.headers);
  expect(pago?.estado_pago).toBe('completado');
});
test('firma inválida no consulta la API ni modifica la BD', async () => {
  sandbox(); await service.crear(3, 7, 27);
  globalThis.fetch = (() => { throw new Error('No debe consultar'); }) as unknown as typeof fetch;
  await expect(service.webhook(Buffer.from('{}'), {})).rejects.toThrow('Firma');
  expect(pago?.estado_pago).toBe('pendiente');
});

test('rutas HTTP exigen sesión y permiten el flujo completo del simulador', async () => {
  const { default: express } = await import('express');
  const { default: jwt } = await import('jsonwebtoken');
  const { pagosRouter } = await import('../routes/pagos.routes');
  const app = express(); app.use(express.json()); app.use('/api/pagos', pagosRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/api/pagos`;
  const token = jwt.sign({ id: 7, rol: 'usuario' }, process.env.JWT_SECRET || 'parqueo-zona19-secret-key-2026');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    expect((await originalFetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status).toBe(401);
    expect((await originalFetch(base, { method: 'POST', headers, body: JSON.stringify({ parqueo_id: -1, monto_esperado: 27 }) })).status).toBe(400);
    const createdResponse = await originalFetch(base, { method: 'POST', headers, body: JSON.stringify({ parqueo_id: 3, monto_esperado: 27 }) });
    expect(createdResponse.status).toBe(201);
    const createdPayment = await createdResponse.json() as { referencia: string };
    const before = await originalFetch(`${base}/confirmar/${createdPayment.referencia}`, { headers });
    expect(before.status).toBe(200); expect((await before.json() as { aprobado: boolean }).aprobado).toBe(false);
    const approved = await originalFetch(`${base}/simular/${createdPayment.referencia}`, { method: 'POST', headers, body: JSON.stringify({ estado: 'completado' }) });
    expect(approved.status).toBe(200); expect((await approved.json() as { aprobado: boolean }).aprobado).toBe(true);
    const again = await originalFetch(base, { method: 'POST', headers, body: JSON.stringify({ parqueo_id: 3, monto_esperado: 27 }) });
    expect(again.status).toBe(409);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
