import { expect, test } from 'bun:test';
import { esQrTicket, generarQrTicket, parsearQrTicket } from './qr-ticket';

test('genera el contrato BELEN-TKT v1 en mayúsculas', () => {
  expect(generarQrTicket(' tk-mu8yvekg-4wb0 ', 'p123abc')).toBe('BELEN-TKT|v1|TK-MU8YVEKG-4WB0|P123ABC');
});

test('lo generado se puede leer de vuelta', () => {
  const contenido = generarQrTicket('TK-MU8YVEKG-4WB0', 'M271BTH');
  expect(esQrTicket(contenido)).toBe(true);
  expect(parsearQrTicket(contenido)).toEqual({ ticket: 'TK-MU8YVEKG-4WB0', placa: 'M271BTH' });
});

test('esQrTicket distingue los otros QR del sistema', () => {
  expect(esQrTicket('BELEN-PAGO|v1|REF-1|P123ABC')).toBe(false);
  expect(esQrTicket('BELEN-VEH|v1|P123ABC')).toBe(false);
  expect(esQrTicket('cualquier cosa')).toBe(false);
});

test.each([
  ['formato distinto', 'BELEN-PAGO|v1|TK-1|P123ABC', 'QR de ticket inválido'],
  ['versión distinta', 'BELEN-TKT|v2|TK-ABC|P123ABC', 'QR de ticket inválido'],
  ['faltan campos', 'BELEN-TKT|v1|TK-ABC', 'QR de ticket inválido'],
  ['campos de más', 'BELEN-TKT|v1|TK-ABC|P123ABC|x', 'QR de ticket inválido'],
  ['ticket vacío', 'BELEN-TKT|v1||P123ABC', 'ticket o una placa válidos'],
  ['ticket con caracteres raros', "BELEN-TKT|v1|TK-A'; DROP|P123ABC", 'ticket o una placa válidos'],
  ['ticket demasiado largo', `BELEN-TKT|v1|TK-${'A'.repeat(30)}|P123ABC`, 'ticket o una placa válidos'],
  ['placa inválida', 'BELEN-TKT|v1|TK-ABC|XYZ', 'ticket o una placa válidos'],
])('rechaza: %s', (_caso, valor, mensaje) => {
  expect(() => parsearQrTicket(valor)).toThrow(mensaje);
});
