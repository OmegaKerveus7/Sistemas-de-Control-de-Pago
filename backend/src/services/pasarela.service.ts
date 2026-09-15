import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type ModoPago = 'mock' | 'sandbox' | 'live';
export class PagoError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function modoPago(): ModoPago {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';
  const mode = process.env.PAYMENT_MODE || 'sandbox';
  if (provider !== 'mock' && provider !== 'recurrente') throw new PagoError(503, 'PAYMENT_PROVIDER debe ser mock o recurrente');
  const result = provider === 'mock' ? 'mock' : mode === 'test' ? 'sandbox' : mode;
  if (!['mock', 'sandbox', 'live'].includes(result)) throw new PagoError(503, 'PAYMENT_MODE debe ser sandbox o live');
  if (provider === 'recurrente' && result === 'mock') throw new PagoError(503, 'Modo Recurrente inválido');
  if (process.env.NODE_ENV === 'production' && result !== 'live') throw new PagoError(503, 'Producción requiere Recurrente en modo live');
  return result as ModoPago;
}

export function validarConfiguracionPago() {
  const mode = modoPago();
  if (mode !== 'mock') {
    const prefix = mode === 'live' ? 'sk_live_' : 'sk_test_';
    if (!process.env.RECURRENTE_SECRET_KEY?.startsWith(prefix)) throw new PagoError(503, `Configura una llave Recurrente ${prefix} para el modo ${mode}`);
  }
  if (mode === 'live') {
    if ((process.env.JWT_SECRET?.length || 0) < 32) throw new PagoError(503, 'Configura JWT_SECRET con al menos 32 caracteres antes de habilitar cobros reales');
    for (const name of ['FRONTEND_BASE_URL', 'BACKEND_BASE_URL']) {
      if (!process.env[name]?.startsWith('https://')) throw new PagoError(503, `${name} debe usar HTTPS en modo live`);
    }
    if (!process.env.RECURRENTE_WEBHOOK_SECRET?.startsWith('whsec_')) throw new PagoError(503, 'Configura RECURRENTE_WEBHOOK_SECRET para producción');
  }
  return mode;
}

export function generarReferencia() { return `P-${randomBytes(9).toString('hex')}`; }
export function urlRetorno(referencia: string, cancelado = false) {
  const base = (process.env.FRONTEND_BASE_URL || 'http://localhost:5173/Sistemas-de-Control-de-Pago').replace(/\/$/, '');
  return `${base}/#/pagar-parqueo/resultado?referencia=${encodeURIComponent(referencia)}${cancelado ? '&estado=cancelado' : ''}`;
}
export function urlSimulador(referencia: string) {
  const base = (process.env.FRONTEND_BASE_URL || 'http://localhost:5173/Sistemas-de-Control-de-Pago').replace(/\/$/, '');
  return `${base}/#/pagar-parqueo/simulador?referencia=${encodeURIComponent(referencia)}`;
}

export interface Checkout {
  id: string;
  status: string;
  checkout_url?: string;
  total_in_cents?: number;
  currency?: string;
  live_mode?: boolean;
  metadata?: { referencia?: string };
}

async function recurrente(path: string, body?: unknown): Promise<Checkout> {
  validarConfiguracionPago();
  const response = await fetch(`https://app.recurrente.com/api${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'X-SECRET-KEY': process.env.RECURRENTE_SECRET_KEY!, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new PagoError(502, `Recurrente no pudo procesar la solicitud (HTTP ${response.status}). Consulta la referencia antes de reintentar.`);
  return await response.json() as Checkout;
}

export async function crearCheckout(pago: { referencia: string; monto: number; placa: string }) {
  const mode = validarConfiguracionPago();
  if (mode === 'mock') return { id: `mock_${pago.referencia}`, url_pago: urlSimulador(pago.referencia) };
  const amount = Math.round(pago.monto * 100);
  if (!Number.isSafeInteger(amount) || amount < 500) throw new PagoError(400, 'El monto mínimo de Recurrente es Q5.00');
  const data = await recurrente('/checkouts', {
    items: [{ name: `Parqueo ${pago.placa}`, amount_in_cents: amount, currency: 'GTQ', quantity: 1,
      charge_type: 'one_time', payment_method_types: ['card'], available_installments: [] }],
    metadata: { referencia: pago.referencia },
    success_url: urlRetorno(pago.referencia), cancel_url: urlRetorno(pago.referencia, true),
  });
  if (!/^ch_[\w-]+$/.test(data.id) || !data.checkout_url || new URL(data.checkout_url).origin !== 'https://app.recurrente.com') {
    throw new PagoError(502, 'Recurrente devolvió un checkout inválido');
  }
  if (data.live_mode !== undefined && data.live_mode !== (mode === 'live')) throw new PagoError(502, 'El checkout pertenece a otro ambiente');
  return { id: data.id, url_pago: data.checkout_url };
}

export async function obtenerCheckout(id: string) {
  if (!/^ch_[\w-]+$/.test(id)) throw new PagoError(400, 'Checkout inválido');
  return recurrente(`/checkouts/${encodeURIComponent(id)}`);
}

export function validarCheckout(data: Checkout, pago: { transaction_id: string | null; monto: number | string; codigo_validacion: string }, mode: ModoPago) {
  if (data.id !== pago.transaction_id || data.live_mode !== (mode === 'live') || data.currency !== 'GTQ' ||
      data.total_in_cents !== Math.round(Number(pago.monto) * 100) || data.metadata?.referencia !== pago.codigo_validacion) {
    throw new PagoError(409, 'El ambiente, referencia o monto de Recurrente no coincide con el pago');
  }
  return data.status === 'paid';
}

export function verificarFirma(body: Buffer, headers: { id?: string; timestamp?: string; signature?: string }, secret = process.env.RECURRENTE_WEBHOOK_SECRET || '') {
  const { id, timestamp, signature } = headers;
  if (!secret.startsWith('whsec_') || !id || !timestamp || !signature || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw new PagoError(401, 'Firma de webhook inválida');
  }
  const expected = createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(`${id}.${timestamp}.`).update(body).digest();
  const valid = signature.split(' ').some(entry => {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || !value) return false;
    const actual = Buffer.from(value, 'base64');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
  if (!valid) throw new PagoError(401, 'Firma de webhook inválida');
}
