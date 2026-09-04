import { GuardianError } from '../models';

export interface DatosQrGuardian {
  referencia: string;
  placa: string;
}

/** Valida únicamente el formato; la autorización se resuelve siempre contra la BD. */
export function parsearQrGuardian(valor: string): DatosQrGuardian {
  const partes = valor.trim().split('|');
  const [sistema, version, referencia, placa] = partes;
  if (partes.length !== 4 || sistema !== 'BELEN-PAGO' || version !== 'v1') {
    throw new GuardianError(400, 'QR inválido. Se espera el formato BELEN-PAGO|v1|referencia_pago|placa', 'QR_INVALIDO');
  }

  const referenciaLimpia = referencia?.trim();
  const placaLimpia = placa?.trim().toUpperCase();
  if (!referenciaLimpia || !placaLimpia || !/^[A-Z0-9-]{3,20}$/.test(placaLimpia)) {
    throw new GuardianError(400, 'El QR no contiene una referencia o placa válida', 'QR_INVALIDO');
  }
  return { referencia: referenciaLimpia, placa: placaLimpia };
}
