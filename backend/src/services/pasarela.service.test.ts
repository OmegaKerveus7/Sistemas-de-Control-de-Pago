import { afterEach, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { crearCheckout, generarReferencia, modoPago, validarCheckout, validarConfiguracionPago, verificarFirma } from './pasarela.service';
const env = { ...process.env };
const originalFetch = globalThis.fetch;
afterEach(() => { process.env = { ...env }; globalThis.fetch = originalFetch; });
function sandbox() { process.env.NODE_ENV = 'test'; process.env.PAYMENT_PROVIDER = 'recurrente'; process.env.PAYMENT_MODE = 'sandbox'; process.env.RECURRENTE_SECRET_KEY = 'sk_test_fixture'; }

test('producción bloquea el simulador y llaves de prueba', () => {
  process.env.NODE_ENV = 'production'; process.env.PAYMENT_PROVIDER = 'mock';
  expect(() => modoPago()).toThrow('Producción requiere');
  sandbox(); process.env.PAYMENT_MODE = 'live';
  expect(() => validarConfiguracionPago()).toThrow('sk_live_');
});
test('no cae silenciosamente al simulador con una configuración inválida', () => {
  process.env.PAYMENT_PROVIDER = 'paybi'; expect(() => modoPago()).toThrow('PAYMENT_PROVIDER');
  sandbox(); process.env.PAYMENT_MODE = 'produccion'; expect(() => modoPago()).toThrow('PAYMENT_MODE');
});
test('referencia cabe en el VARCHAR(20) de la BD', () => {
  expect(generarReferencia()).toMatch(/^P-[a-f0-9]{18}$/);
  expect(generarReferencia()).not.toBe(generarReferencia());
});
test('el mock no contacta Recurrente ni aprueba automáticamente', async () => {
  process.env.NODE_ENV = 'test'; process.env.PAYMENT_PROVIDER = 'mock';
  globalThis.fetch = (() => { throw new Error('No debe llamar la red'); }) as unknown as typeof fetch;
  const result = await crearCheckout({ referencia: 'P-123', monto: 27, placa: 'P123ABC' });
  expect(result.id).toBe('mock_P-123');
  expect(result.url_pago).toContain('/simulador?referencia=P-123');
});
test('crea checkout en GTQ con centavos y referencia del servidor', async () => {
  sandbox();
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    expect(url).toBe('https://app.recurrente.com/api/checkouts');
    expect((options?.headers as Record<string, string>)['X-SECRET-KEY']).toBe('sk_test_fixture');
    const body = JSON.parse(String(options?.body));
    expect(body.items[0]).toEqual({ name: 'Parqueo P123ABC', amount_in_cents: 2750, currency: 'GTQ', quantity: 1,
      charge_type: 'one_time', payment_method_types: ['card'], available_installments: [] });
    expect(body.metadata.referencia).toBe('P-123');
    expect(body.cancel_url).toContain('estado=cancelado');
    return Response.json({ id: 'ch_test', live_mode: false, checkout_url: 'https://app.recurrente.com/checkout-session/ch_test' });
  }) as typeof fetch;
  expect((await crearCheckout({ referencia: 'P-123', monto: 27.5, placa: 'P123ABC' })).id).toBe('ch_test');
});
test('solo confirma paid con ID, referencia, monto, moneda y ambiente coincidentes', () => {
  const pago = { transaction_id: 'ch_test', codigo_validacion: 'P-123', monto: '27.50' };
  const checkout = { id: 'ch_test', status: 'paid', total_in_cents: 2750, currency: 'GTQ', live_mode: false, metadata: { referencia: 'P-123' } };
  expect(validarCheckout(checkout, pago, 'sandbox')).toBe(true);
  expect(validarCheckout({ ...checkout, status: 'unpaid' }, pago, 'sandbox')).toBe(false);
  for (const changes of [{ id: 'ch_other' }, { live_mode: true }, { total_in_cents: 1 }, { currency: 'USD' }, { metadata: { referencia: 'otra' } }]) {
    expect(() => validarCheckout({ ...checkout, ...changes }, pago, 'sandbox')).toThrow('no coincide');
  }
});
test('verifica cuerpo original, firmas múltiples y rechaza cambios y replay antiguo', () => {
  const body = Buffer.from('{"event_type":"intent.succeeded"}');
  const secret = 'whsec_' + Buffer.from('test-webhook-secret').toString('base64');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', Buffer.from('test-webhook-secret')).update(`msg_1.${timestamp}.`).update(body).digest('base64');
  const headers = { id: 'msg_1', timestamp, signature: `v1,bad v1,${signature}` };
  expect(() => verificarFirma(body, headers, secret)).not.toThrow();
  expect(() => verificarFirma(Buffer.from('{}'), headers, secret)).toThrow('Firma');
  expect(() => verificarFirma(body, { ...headers, timestamp: '1' }, secret)).toThrow('Firma');
  expect(() => verificarFirma(body, { ...headers, signature: 'v2,' + signature }, secret)).toThrow('Firma');
});
test('rechaza respuestas HTTP de error sin filtrar su contenido', async () => {
  sandbox(); globalThis.fetch = (async () => new Response('secret-details', { status: 401 })) as unknown as typeof fetch;
  await expect(crearCheckout({ referencia: 'P-123', monto: 27, placa: 'P123ABC' })).rejects.toThrow('HTTP 401');
});
