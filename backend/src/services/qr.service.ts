import QRCode from 'qrcode';
import { generarQrTicket } from '../utils/qr-ticket';

/** PNG del QR del ticket (formato BELEN-TKT), listo para adjuntar a un correo. */
export function pngQrTicket(numeroTicket: string, placa: string): Promise<Buffer> {
  return QRCode.toBuffer(generarQrTicket(numeroTicket, placa), {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 260,
  });
}
