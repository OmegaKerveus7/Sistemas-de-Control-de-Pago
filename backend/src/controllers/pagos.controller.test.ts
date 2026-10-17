import { expect, mock, test } from 'bun:test';

let recibido: Record<string, unknown> | undefined;
mock.module('../services/pagos.service', () => ({
  crearEfectivo: async (datos: Record<string, unknown>) => {
    recibido = datos;
    return { id: 1, monto: 20, dueno_email: null, dueno_nombre: null, placa: 'P123ABC', ticket: '', lugar: 'N/A', zona: 'N/A', codigo_validacion: 'E-1' };
  },
}));
const { registrarEfectivo } = await import('./pagos.controller');

function ejecutar(body: Record<string, unknown>) {
  let estado = 0;
  const res = { status: (c: number) => { estado = c; return { json: () => {} }; } };
  return registrarEfectivo({ body, usuario: { id: 7, rol: 'guardia' } } as never, res as never).then(() => estado);
}

test('el cobro en efectivo pasa el NIT y el nombre del recibo al servicio', async () => {
  expect(await ejecutar({ placa: 'P123ABC', id_tipo_vehiculo: 2, nit: '1234567-8', nombre: 'Ana Pérez' })).toBe(201);
  expect(recibido).toMatchObject({ placa: 'P123ABC', id_tipo_vehiculo: 2, id_guardia: 7, nit: '1234567-8', nombre: 'Ana Pérez' });
});

test('sin NIT ni nombre los deja sin definir para que el recibo sea de Consumidor Final', async () => {
  await ejecutar({ placa: 'P123ABC', id_tipo_vehiculo: 2 });
  expect(recibido?.nit).toBeUndefined();
  expect(recibido?.nombre).toBeUndefined();
});
