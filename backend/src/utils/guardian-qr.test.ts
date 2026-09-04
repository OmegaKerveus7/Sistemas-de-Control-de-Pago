import { expect, test } from 'bun:test';
import { parsearQrGuardian } from './guardian-qr';

test('acepta el contrato QR BELEN-PAGO v1', () => {
  expect(parsearQrGuardian('BELEN-PAGO|v1|REF-123|p123abc')).toEqual({
    referencia: 'REF-123',
    placa: 'P123ABC',
  });
});

test('rechaza un QR que no sigue el contrato', () => {
  expect(() => parsearQrGuardian('REF-123|P123ABC')).toThrow('QR inválido');
});
