import nodemailer from 'nodemailer';
import { generarQrTicket, parsearQrTicket } from '../utils/qr-ticket';
import { pngQrTicket } from './qr.service';

// Se crea en el primer envío (no al importar el módulo): así las pruebas pueden sustituir nodemailer sin mandar correos reales.
let transporterGeneral: nodemailer.Transporter | null = null;
function obtenerTransporter(): nodemailer.Transporter {
  transporterGeneral ??= nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'famkongt24@gmail.com',
      pass: 'nsvd ulwz gtbb iccp',
    },
  });
  return transporterGeneral;
}

const CID_QR_TICKET = 'qr-ticket';

/**
 * QR del ticket como imagen adjunta (Gmail no muestra imágenes incrustadas como texto, solo adjuntas por CID).
 * Si no se puede generar, el correo se envía igual sin QR.
 */
async function bloqueQrTicket(ticket: string, placa: string, texto: string) {
  try {
    parsearQrTicket(generarQrTicket(ticket, placa)); // que el guardia pueda leerlo: si no, mejor no enviarlo
    const png = await pngQrTicket(ticket, placa);
    return {
      html: `
          <div style="text-align:center;margin:20px 0;">
            <img src="cid:${CID_QR_TICKET}" width="180" height="180" alt="Código QR del ticket" style="display:block;margin:0 auto 8px;">
            <p style="color:#475569;font-size:0.8rem;margin:0;">${texto}</p>
          </div>`,
      attachments: [{ filename: 'qr-ticket.png', content: png, cid: CID_QR_TICKET, contentType: 'image/png' }],
    };
  } catch (err) {
    console.error('[QR ticket]', err instanceof Error ? err.message : err);
    return { html: '', attachments: [] };
  }
}

export async function enviarCodigoVerificacion(
  correoDestino: string,
  codigo: string,
  nombreUsuario: string,
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1A237E, #283593); padding: 30px; text-align: center; }
        .header h1 { color: #F9A825; margin: 0; font-size: 1.5rem; }
        .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 0.9rem; }
        .body { padding: 30px; text-align: center; }
        .codigo { font-size: 2.5rem; font-weight: 800; color: #1A237E; background: #F9A825; padding: 15px 30px; border-radius: 10px; display: inline-block; margin: 20px 0; letter-spacing: 8px; }
        .mensaje { color: #475569; font-size: 0.95rem; line-height: 1.6; }
        .footer { padding: 20px 30px; background: #f9f9f9; text-align: center; border-top: 1px solid #eee; }
        .footer p { color: #94A3B8; font-size: 0.8rem; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Colegio Mixto Belén</h1>
          <p>Sistema de Parqueo - Zona 19</p>
        </div>
        <div class="body">
          <p class="mensaje">Hola <strong>${nombreUsuario}</strong>,</p>
          <p class="mensaje">Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código de verificación:</p>
          <div class="codigo">${codigo}</div>
          <p class="mensaje">Este código expira en <strong>15 minutos</strong>.</p>
          <p class="mensaje">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
        </div>
        <div class="footer">
          <p>Este es un correo automático, no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await obtenerTransporter().sendMail({
    from: '"Parqueo Zona 19" <famkongt24@gmail.com>',
    to: correoDestino,
    subject: 'Código de verificación - Restablecer contraseña',
    html,
  });

  return true;
}

export interface DatosComprobante {
  correoDestino: string;
  nombreUsuario: string;
  placa: string;
  ticket: string;
  monto: number;
  fechaPago: string;
  lugar: string;
  zona: string;
  codigoValidacion: string;
}

export async function enviarComprobantePago(datos: DatosComprobante): Promise<boolean> {
  const qr = await bloqueQrTicket(datos.ticket, datos.placa, 'Muestra este QR al guardia: al escanearlo verá que tu ticket está pagado.');
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1A237E, #283593); padding: 28px; text-align: center; }
        .header h1 { color: #F9A825; margin: 0; font-size: 1.4rem; }
        .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 0.85rem; }
        .body { padding: 28px; }
        .titulo { text-align: center; color: #166534; font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; }
        .detalle { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .detalle td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
        .detalle td:first-child { color: #475569; font-weight: 600; width: 40%; }
        .detalle td:last-child { color: #1A237E; font-weight: 500; }
        .monto-box { text-align: center; background: #f0fdf4; border-radius: 10px; padding: 16px; margin: 20px 0; }
        .monto-box .monto { font-size: 1.8rem; font-weight: 800; color: #166534; }
        .monto-box .label { font-size: 0.75rem; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
        .codigo-box { text-align: center; background: #fff8e6; border-radius: 10px; padding: 14px; margin: 16px 0; }
        .codigo-box .codigo { font-size: 1.2rem; font-weight: 800; color: #854d0e; letter-spacing: 0.08em; }
        .footer { padding: 18px 28px; background: #f9f9f9; text-align: center; border-top: 1px solid #eee; }
        .footer p { color: #94A3B8; font-size: 0.78rem; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Colegio Mixto Belén</h1>
          <p>Sistema de Parqueo - Zona 19</p>
        </div>
        <div class="body">
          <p class="titulo">Comprobante de Pago</p>
          <p>Hola <strong>${datos.nombreUsuario}</strong>,</p>
          <p style="color:#475569;font-size:0.9rem;">Se confirmó el pago de tu parqueo. Aquí están los detalles:</p>
          <table class="detalle">
            <tr><td>Placa</td><td>${datos.placa}</td></tr>
            <tr><td>Ticket</td><td>${datos.ticket}</td></tr>
            <tr><td>Lugar</td><td>${datos.lugar} · ${datos.zona}</td></tr>
            <tr><td>Fecha de pago</td><td>${datos.fechaPago}</td></tr>
            <tr><td>Método</td><td>Efectivo</td></tr>
          </table>
          <div class="monto-box">
            <div class="label">Monto pagado</div>
            <div class="monto">Q${datos.monto.toFixed(2)}</div>
          </div>
          <div class="codigo-box">
            <div class="label" style="font-size:0.7rem;color:#475569;margin-bottom:4px;">Código de validación</div>
            <div class="codigo">${datos.codigoValidacion}</div>
          </div>
          ${qr.html}
          <p style="color:#475569;font-size:0.82rem;text-align:center;margin-top:16px;">Presenta este comprobante al salir del estacionamiento.</p>
        </div>
        <div class="footer">
          <p>Este es un correo automático, no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await obtenerTransporter().sendMail({
    from: '"Parqueo Zona 19" <famkongt24@gmail.com>',
    to: datos.correoDestino,
    subject: `Comprobante de pago - Ticket ${datos.ticket}`,
    html,
    attachments: qr.attachments,
  });

  return true;
}

// --- Recordatorios de pago: cuenta propia, configurada por variables de entorno (.env.local) ---

let transporterRecordatorios: nodemailer.Transporter | null = null;

export function correoRecordatoriosConfigurado(): boolean {
  return Boolean(process.env.CORREO_RECORDATORIOS_USER?.trim() && process.env.CORREO_RECORDATORIOS_PASS?.trim());
}

function obtenerTransporterRecordatorios(): { transporter: nodemailer.Transporter; remitente: string } {
  const remitente = process.env.CORREO_RECORDATORIOS_USER?.trim();
  const pass = process.env.CORREO_RECORDATORIOS_PASS?.trim();
  if (!remitente || !pass) throw new Error('Configura CORREO_RECORDATORIOS_USER y CORREO_RECORDATORIOS_PASS');
  transporterRecordatorios ??= nodemailer.createTransport({ service: 'gmail', auth: { user: remitente, pass } });
  return { transporter: transporterRecordatorios, remitente };
}

function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function textoTiempo(minutos: number): string {
  const total = Math.max(0, Math.floor(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

export interface DatosRecordatorioPago {
  correoDestino: string;
  nombreUsuario: string;
  placa: string;
  ticket: string;
  tipoVehiculo: string;
  lugar: string;
  zona: string;
  minutosEstacionado: number;
  precioLinea: number;
  precioEfectivo: number;
}

export async function enviarRecordatorioPago(datos: DatosRecordatorioPago): Promise<boolean> {
  const { transporter: mailer, remitente } = obtenerTransporterRecordatorios();
  const base = (process.env.FRONTEND_BASE_URL || 'http://localhost:5173/Sistemas-de-Control-de-Pago').replace(/\/$/, '');
  const enlacePago = `${base}/#/pagar-parqueo`;
  const qr = await bloqueQrTicket(datos.ticket, datos.placa, 'Este es el QR de tu ticket: el guardia lo escanea y ve si ya está pagado.');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1A237E, #283593); padding: 28px; text-align: center; }
        .header h1 { color: #F9A825; margin: 0; font-size: 1.4rem; }
        .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 0.85rem; }
        .body { padding: 28px; }
        .titulo { text-align: center; color: #854d0e; font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; }
        .detalle { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .detalle td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
        .detalle td:first-child { color: #475569; font-weight: 600; width: 40%; }
        .detalle td:last-child { color: #1A237E; font-weight: 500; }
        .monto-box { text-align: center; background: #fff8e6; border-radius: 10px; padding: 16px; margin: 20px 0; }
        .monto-box .monto { font-size: 1.8rem; font-weight: 800; color: #854d0e; }
        .monto-box .label { font-size: 0.75rem; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
        .boton { display: inline-block; background: #1A237E; color: #ffffff !important; text-decoration: none; font-weight: 700; padding: 12px 28px; border-radius: 8px; }
        .footer { padding: 18px 28px; background: #f9f9f9; text-align: center; border-top: 1px solid #eee; }
        .footer p { color: #94A3B8; font-size: 0.78rem; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Colegio Mixto Belén</h1>
          <p>Sistema de Parqueo - Zona 19</p>
        </div>
        <div class="body">
          <p class="titulo">Recordatorio de pago</p>
          <p>Hola <strong>${escaparHtml(datos.nombreUsuario)}</strong>,</p>
          <p style="color:#475569;font-size:0.9rem;">Tu vehículo sigue en el parqueo y todavía no tiene un pago registrado. Recuerda pagar antes de salir:</p>
          <table class="detalle">
            <tr><td>Placa</td><td>${escaparHtml(datos.placa)}</td></tr>
            <tr><td>Vehículo</td><td>${escaparHtml(datos.tipoVehiculo)}</td></tr>
            <tr><td>Ticket</td><td>${escaparHtml(datos.ticket)}</td></tr>
            <tr><td>Lugar</td><td>${escaparHtml(datos.lugar)} · ${escaparHtml(datos.zona)}</td></tr>
            <tr><td>Tiempo estacionado</td><td>${textoTiempo(datos.minutosEstacionado)}</td></tr>
          </table>
          <div class="monto-box">
            <div class="label">Pago en línea</div>
            <div class="monto">Q${datos.precioLinea.toFixed(2)}</div>
            <div class="label" style="margin-top:8px;">En efectivo con el guardia: Q${datos.precioEfectivo.toFixed(2)}</div>
          </div>
          ${qr.html}
          <p style="text-align:center;margin:24px 0 8px;"><a class="boton" href="${escaparHtml(enlacePago)}">Pagar ahora</a></p>
          <p style="color:#475569;font-size:0.8rem;text-align:center;">Si ya pagaste, puedes ignorar este mensaje.</p>
        </div>
        <div class="footer">
          <p>Este es un correo automático, no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await mailer.sendMail({
    from: `"Parqueo Zona 19" <${remitente}>`,
    to: datos.correoDestino,
    subject: `Recordatorio de pago - Parqueo ${datos.placa}`,
    html,
    attachments: qr.attachments,
  });

  return true;
}
