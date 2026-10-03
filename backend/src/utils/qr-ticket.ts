import { GuardianError } from '../models';

export interface DatosQrTicket {
  ticket: string;
  placa: string;
}

const REGEX_TICKET = /^[A-Z0-9-]{3,20}$/;
const REGEX_PLACA = /^[PM]\d{3}[A-Z]{3}$/;

/**
 * Contenido del QR del ticket: `BELEN-TKT|v1|NUMERO_TICKET|PLACA`
 * (por ejemplo `BELEN-TKT|v1|TK-MU8YVEKG-4WB0|P123ABC`).
 * Existe desde que se crea el ticket, así que el guardia puede consultar si está pagado o no.
 */
export function generarQrTicket(numeroTicket: string, placa: string): string {
  return `BELEN-TKT|v1|${numeroTicket.trim().toUpperCase()}|${placa.trim().toUpperCase()}`;
}

export function esQrTicket(valor: string): boolean {
  return valor.trim().startsWith('BELEN-TKT|');
}

/** Valida únicamente el formato; si el ticket está pagado o no se resuelve siempre contra la BD. */
export function parsearQrTicket(valor: string): DatosQrTicket {
  const partes = valor.trim().split('|');
  const [sistema, version, ticket, placa] = partes;
  if (partes.length !== 4 || sistema !== 'BELEN-TKT' || version !== 'v1') {
    throw new GuardianError(400, 'QR de ticket inválido. Se espera el formato BELEN-TKT|v1|ticket|placa', 'QR_TICKET_INVALIDO');
  }

  const ticketLimpio = ticket?.trim().toUpperCase();
  const placaLimpia = placa?.trim().toUpperCase();
  if (!ticketLimpio || !REGEX_TICKET.test(ticketLimpio) || !placaLimpia || !REGEX_PLACA.test(placaLimpia)) {
    throw new GuardianError(400, 'El QR no contiene un ticket o una placa válidos', 'QR_TICKET_INVALIDO');
  }
  return { ticket: ticketLimpio, placa: placaLimpia };
}
