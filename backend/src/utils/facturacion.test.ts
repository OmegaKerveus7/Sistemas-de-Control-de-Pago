import { expect, test } from 'bun:test';
import { validarFacturacion } from './facturacion';
import { hoyGuatemala } from './fecha';
import { tipoPorPlaca } from './placa';

test('normaliza el NIT (guiones, espacios, minúsculas) y acepta CF y la K final', () => {
  expect(validarFacturacion('1234567-8', 'Ana Pérez')).toEqual({ nit: '12345678', nombre: 'Ana Pérez' });
  expect(validarFacturacion(' 123 456-7k ', 'Ana')).toEqual({ nit: '1234567K', nombre: 'Ana' });
  expect(validarFacturacion('cf', undefined)).toEqual({ nit: 'CF', nombre: 'Consumidor Final' });
  expect(validarFacturacion('CF', 'Juan  Pérez')).toEqual({ nit: 'CF', nombre: 'Juan Pérez' });
});

test('rechaza NIT vacío o malformado y exige nombre cuando no es CF', () => {
  for (const nit of [undefined, '', 'abc', '12', '123456789012345', '1234-X']) expect(() => validarFacturacion(nit, 'Ana')).toThrow('NIT');
  expect(() => validarFacturacion('12345678', '')).toThrow('nombre');
  expect(() => validarFacturacion('CF', 'x'.repeat(121))).toThrow('120');
});

test('la fecha de vigencia usa la hora de Guatemala (UTC-6), no la del servidor', () => {
  expect(hoyGuatemala(new Date('2026-10-12T05:59:00Z'))).toBe('2026-10-11');
  expect(hoyGuatemala(new Date('2026-10-12T06:00:00Z'))).toBe('2026-10-12');
  expect(hoyGuatemala(new Date('2026-10-13T03:00:00Z'))).toBe('2026-10-12');
});

test('el tipo se deduce del prefijo de la placa', () => {
  expect(tipoPorPlaca('p123abc')).toBe('carro');
  expect(tipoPorPlaca('M123ABC')).toBe('moto');
  expect(tipoPorPlaca('X123ABC')).toBeNull();
});
