import { afterEach, expect, mock, test } from 'bun:test';

const pendiente = (id: number) => ({
  id_ticket: id, ticket: `TK-${id}`, placa: 'P123ABC', tipo_vehiculo: 'carro', precio_efectivo: 20, precio_linea: 27,
  minutos_estacionado: 95, lugar: 'A1', zona: 'Zona A', nombres: 'Ana', apellidos: 'Pérez', email: `ana${id}@correo.test`,
});
let pendientes = [pendiente(1)];
let consultado: number | undefined;
let enviados: Array<Record<string, unknown>> = [];
let fallar = false;

mock.module('../repositories/recordatorios.repository', () => ({
  listarPendientesDePago: async (idTicket?: number) => { consultado = idTicket; return pendientes; },
}));
const { enviarRecordatorios: enviarReal } = await import('./recordatorios.service');
const envioFalso = async (datos: Record<string, unknown>) => {
  if (fallar) throw new Error('SMTP caído');
  enviados.push(datos);
  return true;
};
// Se inyecta el envío: los mocks de módulo son globales en Bun y contaminarían a otros archivos de prueba.
const enviarRecordatorios = (idTicket?: number) => enviarReal(idTicket, envioFalso as never);

afterEach(() => { pendientes = [pendiente(1)]; consultado = undefined; enviados = []; fallar = false; });

test('envía el recordatorio con los datos del ticket y del dueño', async () => {
  pendientes = [pendiente(10)];
  const r = await enviarRecordatorios();
  expect(r).toEqual({ total: 1, enviados: 1, omitidos: 0, errores: 0, detalle: [{ ticket: 'TK-10', placa: 'P123ABC', resultado: 'enviado' }] });
  expect(enviados[0]).toEqual({
    correoDestino: 'ana10@correo.test', nombreUsuario: 'Ana Pérez', placa: 'P123ABC', ticket: 'TK-10', tipoVehiculo: 'carro',
    lugar: 'A1', zona: 'Zona A', minutosEstacionado: 95, precioLinea: 27, precioEfectivo: 20,
  });
});

test('no repite el recordatorio de un ticket dentro del intervalo', async () => {
  pendientes = [pendiente(20)];
  await enviarRecordatorios();
  const segundo = await enviarRecordatorios();
  expect(segundo).toMatchObject({ total: 1, enviados: 0, omitidos: 1 });
  expect(enviados).toHaveLength(1);
});

test('un fallo de correo no detiene a los demás y no cuenta como enviado', async () => {
  pendientes = [pendiente(30), pendiente(31)];
  fallar = true;
  const r = await enviarRecordatorios();
  expect(r).toMatchObject({ total: 2, enviados: 0, errores: 2 });
  fallar = false;
  // al no haberse enviado, el siguiente intento no queda bloqueado por el intervalo
  expect(await enviarRecordatorios()).toMatchObject({ enviados: 2, omitidos: 0 });
});

test('con id_ticket solo consulta ese ticket', async () => {
  pendientes = [pendiente(40)];
  await enviarRecordatorios(40);
  expect(consultado).toBe(40);
});

test('sin pendientes devuelve un resumen vacío', async () => {
  pendientes = [];
  expect(await enviarRecordatorios()).toEqual({ total: 0, enviados: 0, omitidos: 0, errores: 0, detalle: [] });
});

test('dos peticiones simultáneas por el mismo ticket envían un solo correo', async () => {
  pendientes = [pendiente(50)];
  const lento = async (datos: Record<string, unknown>) => { await new Promise((r) => setTimeout(r, 25)); enviados.push(datos); return true; };
  const [a, b] = await Promise.all([enviarReal(undefined, lento as never), enviarReal(undefined, lento as never)]);
  expect(enviados).toHaveLength(1);
  expect(a.enviados + b.enviados).toBe(1);
  expect(a.omitidos + b.omitidos).toBe(1);
});

test('el intervalo vence: pasado el tiempo se puede volver a enviar', async () => {
  pendientes = [pendiente(60)];
  process.env.RECORDATORIO_INTERVALO_MIN = '0.0001'; // ~6 ms
  try {
    await enviarRecordatorios();
    await new Promise((r) => setTimeout(r, 30));
    expect(await enviarRecordatorios()).toMatchObject({ enviados: 1, omitidos: 0 });
    expect(enviados).toHaveLength(2);
  } finally { delete process.env.RECORDATORIO_INTERVALO_MIN; }
});
