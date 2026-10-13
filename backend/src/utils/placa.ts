import type { TipoVehiculoGuardian } from '../models';

export const REGEX_PLACA = /^([PM])[0-9]{3}[A-Z]{3}$/;

export function normalizarPlaca(placa: string): string {
  return placa.trim().toUpperCase();
}

/** Tipo de vehículo que implica el prefijo de la placa: P = carro, M = moto. */
export function tipoPorPlaca(placa: string): TipoVehiculoGuardian | null {
  const coincidencia = REGEX_PLACA.exec(normalizarPlaca(placa));
  if (!coincidencia) return null;
  return coincidencia[1] === 'P' ? 'carro' : 'moto';
}

export function tipoCoincideConPlaca(nombreTipo: string, tipoDetectado: TipoVehiculoGuardian): boolean {
  const normalizado = nombreTipo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const alias = tipoDetectado === 'moto'
    ? ['moto', 'motocicl']
    : ['auto', 'carro', 'camioneta', 'camin', 'pickup', 'suv'];
  return alias.some((valor) => normalizado.includes(valor));
}
