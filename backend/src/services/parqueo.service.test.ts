import { afterEach, expect, mock, test } from 'bun:test';

let resultadoSP: { codigo: number; mensaje: string; data: Record<string, unknown> } = { codigo: 200, mensaje: 'ok', data: {} };
let numeroTicket: string | null = 'TK-ABC-1';
let consultadaPlaca: string | undefined;
mock.module('../repositories/parqueo.repository', () => ({
  validarParqueoPorPlaca: async () => resultadoSP,
  placaExiste: async () => true,
  numeroTicketActivoPorPlaca: async (placa: string) => { consultadaPlaca = placa; return numeroTicket; },
}));
const { validarParqueoPorPlaca } = await import('./parqueo.service');

afterEach(() => { numeroTicket = 'TK-ABC-1'; consultadaPlaca = undefined; });

test('un ticket pagado incluye el número de ticket para armar el QR', async () => {
  resultadoSP = { codigo: 200, mensaje: 'ok', data: { estado: 'con_parqueo', placa: 'P123ABC', id_ticket: 7 } };
  const r = await validarParqueoPorPlaca('p123abc');
  expect((r.data as Record<string, unknown>).numero_ticket).toBe('TK-ABC-1');
  expect((r.data as Record<string, unknown>).id_ticket).toBe(7);
  expect(consultadaPlaca).toBe('p123abc');
});

test('un ticket SIN pagar también incluye el número de ticket', async () => {
  resultadoSP = { codigo: 402, mensaje: 'pago pendiente', data: { estado: 'sin_pago', placa: 'P123ABC' } };
  const r = await validarParqueoPorPlaca('P123ABC');
  expect(r.codigo).toBe(402);
  expect((r.data as Record<string, unknown>).numero_ticket).toBe('TK-ABC-1');
});

test('sin ticket activo no se inventa el número', async () => {
  numeroTicket = null;
  resultadoSP = { codigo: 200, mensaje: 'ok', data: { estado: 'con_parqueo', placa: 'P123ABC' } };
  const r = await validarParqueoPorPlaca('P123ABC');
  expect(r.data).toEqual({ estado: 'con_parqueo', placa: 'P123ABC' });
});

test('sin parqueo activo no consulta el ticket', async () => {
  resultadoSP = { codigo: 200, mensaje: 'ok', data: { estado: 'sin_parqueo', placa: 'P123ABC' } };
  const r = await validarParqueoPorPlaca('P123ABC');
  expect(consultadaPlaca).toBeUndefined();
  expect((r.data as Record<string, unknown>).numero_ticket).toBeUndefined();
});
