import { GuardianError } from '../models';

export interface DatosQrVehiculo {
  placa: string;
}

const REGEX_PLACA = /^([PM])\d{3}[A-Z]{3}$/;

/**
 * Valida únicamente el formato del QR de identificación de vehículo.
 * Formato esperado: `BELEN-VEH|v1|PLACA` (por ejemplo `BELEN-VEH|v1|P123ABC`).
 */
export function parsearQrVehiculo(valor: string): DatosQrVehiculo {
  const partes = valor.trim().split('|');
  const [sistema, version, placa] = partes;
  if (partes.length !== 3 || sistema !== 'BELEN-VEH' || version !== 'v1') {
    throw new GuardianError(400, 'QR de vehículo inválido. Se espera el formato BELEN-VEH|v1|PLACA', 'QR_VEHICULO_INVALIDO');
  }

  const placaLimpia = placa?.trim().toUpperCase();
  if (!placaLimpia || !REGEX_PLACA.test(placaLimpia)) {
    throw new GuardianError(400, 'El QR no contiene una placa válida', 'QR_VEHICULO_INVALIDO');
  }
  return { placa: placaLimpia };
}

/** Genera el contenido del QR que se muestra al usuario en Mis Vehículos. */
export function generarQrVehiculo(placa: string): string {
  return `BELEN-VEH|v1|${placa.toUpperCase()}`;
}
