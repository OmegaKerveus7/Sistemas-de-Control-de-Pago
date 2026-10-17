import { afterEach, expect, mock, test } from 'bun:test';
let entradaActiva = false;
let procedimientoLlamado = false;
const conn = {
  query: async (sql: string, args: unknown[] = []) => {
    if (sql.startsWith('SELECT t.id_ticket FROM Tickets t')) {
      expect(sql).toContain('p.fecha_liberacion IS NULL');
      expect(sql).toContain('t.activo = 1 AND t.fecha_salida IS NULL');
      expect(args).toEqual(['P123ABC']);
      return [entradaActiva ? [{ id_ticket: 5 }] : []];
    }
    if (sql.includes('CALL sp_validar_parqueo')) { procedimientoLlamado = true; return [[]]; }
    if (sql.includes('SELECT @pcodigo_s')) return [[{ pcodigo_s: 200, pmensaje: 'ok', pdata: JSON.stringify({ estado: 'con_parqueo', placa: 'P123ABC' }) }]];
    throw new Error('Consulta inesperada');
  },
  release: () => {},
};
mock.module('../config/database', () => ({ getPool: () => ({ getConnection: async () => conn }) }));
const { validarParqueoPorPlaca } = await import('./parqueo.repository');
afterEach(() => { entradaActiva = false; procedimientoLlamado = false; });
test('sin entrada activa no muestra un pago como autorización de parqueo', async () => {
  const resultado = await validarParqueoPorPlaca('p123abc');
  expect(resultado).toMatchObject({ codigo: 404, data: null });
  expect(resultado.mensaje).toContain('registre tu ingreso');
  expect(procedimientoLlamado).toBe(false);
});
test('con entrada activa permite consultar el estado del parqueo', async () => {
  entradaActiva = true;
  expect(await validarParqueoPorPlaca('P123ABC')).toMatchObject({ codigo: 200, data: { estado: 'con_parqueo' } });
  expect(procedimientoLlamado).toBe(true);
});
