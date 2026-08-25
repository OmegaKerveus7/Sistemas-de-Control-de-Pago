import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'famkongt24@gmail.com',
    pass: 'nsvd ulwz gtbb iccp',
  },
});

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

  await transporter.sendMail({
    from: '"Parqueo Zona 19" <famkongt24@gmail.com>',
    to: correoDestino,
    subject: 'Código de verificación - Restablecer contraseña',
    html,
  });

  return true;
}
