import { expect, mock, test } from 'bun:test';

let consulta = '';
let parametros: unknown[] = [];

mock.module('../config/database', () => ({
  getPool: () => ({
    query: async (sql: string, params: unknown[] = []) => {
      consulta = sql;
      parametros = params;
      return [[{ placa: 'P123ABC', tipo: 'carro', activo: 1 }]];
    },
  }),
}));

const { buscar } = await import('./vehiculos.repository');

test('la búsqueda de vehículos consulta únicamente por placa exacta', async () => {
  const resultado = await buscar('p123abc');

  expect(resultado[0]?.placa).toBe('P123ABC');
  expect(consulta).toContain('WHERE v.placa = ?');
  expect(consulta).not.toContain('LOCATE');
  expect(parametros).toEqual(['P123ABC']);
});
