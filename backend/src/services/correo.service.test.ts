import { afterEach, beforeEach, expect, mock, test } from 'bun:test';

let enviados: Array<Record<string, any>> = [];
mock.module('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: async (opciones: Record<string, any>) => { enviados.push(opciones); } }) },
}));

const { enviarRecordatorioPago, enviarComprobantePago, correoRecordatoriosConfigurado } = await import('./correo.service');

const datos = {
  correoDestino: 'ana@correo.test', nombreUsuario: 'Ana Pérez', placa: 'P123ABC', ticket: 'TK-ABC-1', tipoVehiculo: 'carro',
  lugar: 'B09', zona: 'Parqueo del Domo', minutosEstacionado: 95, precioLinea: 27, precioEfectivo: 20,
};

beforeEach(() => {
  process.env.CORREO_RECORDATORIOS_USER = 'remitente@correo.test';
  process.env.CORREO_RECORDATORIOS_PASS = 'clave-de-prueba';
  process.env.FRONTEND_BASE_URL = 'https://sitio.test/Sistemas-de-Control-de-Pago';
  enviados = [];
});
afterEach(() => {
  delete process.env.CORREO_RECORDATORIOS_USER;
  delete process.env.CORREO_RECORDATORIOS_PASS;
  delete process.env.FRONTEND_BASE_URL;
});

test('envía desde la cuenta configurada, al destinatario y con asunto que identifica la placa', async () => {
  expect(await enviarRecordatorioPago(datos)).toBe(true);
  expect(enviados).toHaveLength(1);
  expect(enviados[0]!.from).toBe('"Parqueo Zona 19" <remitente@correo.test>');
  expect(enviados[0]!.to).toBe('ana@correo.test');
  expect(enviados[0]!.subject).toBe('Recordatorio de pago - Parqueo P123ABC');
});

test('el cuerpo trae placa, ticket, lugar, tiempo, ambas tarifas y el enlace de pago', async () => {
  await enviarRecordatorioPago(datos);
  const html: string = enviados[0]!.html;
  for (const texto of ['Ana Pérez', 'P123ABC', 'TK-ABC-1', 'carro', 'B09 · Parqueo del Domo', '1 h 35 min', 'Q27.00', 'Q20.00', 'Recordatorio de pago']) {
    expect(html).toContain(texto);
  }
  expect(html).toContain('href="https://sitio.test/Sistemas-de-Control-de-Pago/#/pagar-parqueo"');
});

test('el enlace no duplica la barra final de FRONTEND_BASE_URL', async () => {
  process.env.FRONTEND_BASE_URL = 'https://sitio.test/app/';
  await enviarRecordatorioPago(datos);
  expect(enviados[0]!.html).toContain('href="https://sitio.test/app/#/pagar-parqueo"');
});

test('escapa HTML de los datos del usuario (no inyecta etiquetas en el correo)', async () => {
  await enviarRecordatorioPago({ ...datos, nombreUsuario: 'Ana <script>alert(1)</script> & "Co"', zona: '<img src=x>' });
  const html: string = enviados[0]!.html;
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<img src=x>');
  expect(html).toContain('Ana &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Co&quot;');
});

test.each([
  [0, '0 min'], [45, '45 min'], [60, '1 h'], [95, '1 h 35 min'], [120, '2 h'], [-5, '0 min'],
])('tiempo estacionado %d min se muestra como "%s"', async (minutos, esperado) => {
  await enviarRecordatorioPago({ ...datos, minutosEstacionado: minutos });
  expect(enviados[0]!.html).toContain(`<td>${esperado}</td>`);
});

test('sin credenciales configuradas no envía y avisa qué falta', async () => {
  delete process.env.CORREO_RECORDATORIOS_PASS;
  expect(correoRecordatoriosConfigurado()).toBe(false);
  await expect(enviarRecordatorioPago(datos)).rejects.toThrow('CORREO_RECORDATORIOS_USER');
  expect(enviados).toHaveLength(0);
});

test('correoRecordatoriosConfigurado exige usuario y contraseña no vacíos', () => {
  expect(correoRecordatoriosConfigurado()).toBe(true);
  process.env.CORREO_RECORDATORIOS_USER = '   ';
  expect(correoRecordatoriosConfigurado()).toBe(false);
});

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47];
const comprobante = {
  correoDestino: 'ana@correo.test', nombreUsuario: 'Ana Pérez', placa: 'P123ABC', ticket: 'TK-ABC-1', monto: 20,
  fechaPago: '25/9/2026, 10:00:00', lugar: 'B09', zona: 'Parqueo del Domo', codigoValidacion: 'E-abc123',
};

test('el recordatorio adjunta el QR del ticket como imagen PNG referenciada por CID', async () => {
  await enviarRecordatorioPago(datos);
  const { html, attachments } = enviados[0]!;
  expect(html).toContain('src="cid:qr-ticket"');
  expect(attachments).toHaveLength(1);
  expect(attachments[0]).toMatchObject({ filename: 'qr-ticket.png', cid: 'qr-ticket', contentType: 'image/png' });
  expect([...attachments[0].content.subarray(0, 4)]).toEqual(FIRMA_PNG);
});

test('el comprobante de pago también lleva el QR del ticket', async () => {
  await enviarComprobantePago(comprobante);
  const { html, attachments, subject, to } = enviados[0]!;
  expect(to).toBe('ana@correo.test');
  expect(subject).toBe('Comprobante de pago - Ticket TK-ABC-1');
  expect(html).toContain('src="cid:qr-ticket"');
  expect(html).toContain('E-abc123');
  expect(attachments).toHaveLength(1);
  expect([...attachments[0].content.subarray(0, 4)]).toEqual(FIRMA_PNG);
});

test('el QR es distinto para cada ticket', async () => {
  await enviarRecordatorioPago(datos);
  await enviarRecordatorioPago({ ...datos, ticket: 'TK-OTRO-2' });
  expect(enviados[0]!.attachments[0].content.equals(enviados[1]!.attachments[0].content)).toBe(false);
});

test('si el ticket o la placa no permiten un QR legible, el correo se envía igual sin QR', async () => {
  await enviarRecordatorioPago({ ...datos, placa: 'SIN-FORMATO' });
  expect(enviados).toHaveLength(1);
  expect(enviados[0]!.html).not.toContain('cid:qr-ticket');
  expect(enviados[0]!.attachments).toEqual([]);
  await enviarComprobantePago({ ...comprobante, ticket: "TK-<raro>'" });
  expect(enviados).toHaveLength(2);
  expect(enviados[1]!.attachments).toEqual([]);
});
