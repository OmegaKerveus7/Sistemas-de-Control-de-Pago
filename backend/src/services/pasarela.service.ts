import type { Pago } from '../models';

export interface CheckoutResultado {
  url_pago: string;
}

export interface VerificacionResultado {
  aprobado: boolean;
  referencia: string;
  mensaje?: string;
}

const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const BACKEND_BASE = process.env.BACKEND_BASE_URL || 'http://localhost:4000';
const PAYBI_API_URL = process.env.PAYBI_API_URL || 'https://admlink.ebi.com.gt/api';

export function esModoPrueba(): boolean {
  return process.env.PAYMENT_PROVIDER?.toLowerCase() !== 'paybi';
}

export function generarReferencia(): string {
  return `P-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export function urlRetorno(referencia: string): string {
  return `${FRONTEND_BASE}/#/pagar-parqueo/resultado?referencia=${encodeURIComponent(referencia)}`;
}

async function crearCheckoutMock(pago: Pago): Promise<CheckoutResultado> {
  return {
    url_pago: `${BACKEND_BASE}/api/pagos/mock-checkout?referencia=${encodeURIComponent(pago.referencia ?? '')}`,
  };
}

async function verificarMock(referencia: string): Promise<VerificacionResultado> {
  return { aprobado: true, referencia };
}

async function loginPayBi(): Promise<string> {
  const respuesta = await fetch(`${PAYBI_API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      llave: process.env.PAYBI_KEY,
      usuario: process.env.PAYBI_USER,
      clave: process.env.PAYBI_PASS,
    }),
  });
  const data = (await respuesta.json()) as { token?: string };
  if (!data.token) throw new Error('No se pudo autenticar con Pay Bi');
  return data.token;
}

async function crearCheckoutPayBi(pago: Pago): Promise<CheckoutResultado> {
  const token = await loginPayBi();

  const redesRespuesta = await fetch(`${PAYBI_API_URL}/network/all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ llave: process.env.PAYBI_KEY, token }),
  });
  const redesData = (await redesRespuesta.json()) as { data?: Array<{ codigo?: string; id?: string; nombre?: string }> };
  const redes = redesData.data ?? [];
  const red = redes.find((r) => r.nombre?.toLowerCase().includes('botón')) ?? redes[0];

  const linkRespuesta = await fetch(`${PAYBI_API_URL}/link/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      llave: process.env.PAYBI_KEY,
      token,
      codigo_interno: pago.referencia,
      titulo: 'Pago de parqueo',
      nombre_interno: `Parqueo ${pago.parqueo_id}`,
      monto: pago.monto,
      redes_sociales: red?.codigo ?? red?.id,
      url_exito: urlRetorno(pago.referencia ?? ''),
      url_rechazo: urlRetorno(pago.referencia ?? ''),
    }),
  });
  const linkData = (await linkRespuesta.json()) as { data?: Array<{ URL?: string; url?: string }> };
  const link = linkData.data?.[0];
  const urlPago = link?.URL ?? link?.url;
  if (!urlPago) throw new Error('Pay Bi no devolvió un link de pago');
  return { url_pago: urlPago };
}

async function verificarPayBi(referencia: string): Promise<VerificacionResultado> {
  const token = await loginPayBi();
  const respuesta = await fetch(`${PAYBI_API_URL}/link/single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ llave: process.env.PAYBI_KEY, token, codigo_interno: referencia }),
  });
  const data = (await respuesta.json()) as { data?: { ventas?: number | string; estado?: string }; message?: string };
  const ventas = Number(data.data?.ventas ?? 0);
  return {
    aprobado: ventas > 0,
    referencia,
    mensaje: data.message,
  };
}

export async function crearCheckout(pago: Pago): Promise<CheckoutResultado> {
  return esModoPrueba() ? crearCheckoutMock(pago) : crearCheckoutPayBi(pago);
}

export async function verificarPago(referencia: string): Promise<VerificacionResultado> {
  return esModoPrueba() ? verificarMock(referencia) : verificarPayBi(referencia);
}