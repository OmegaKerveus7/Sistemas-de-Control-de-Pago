export interface CriterioGuardian {
  placa?: string;
  ticket?: string;
  referencia?: string;
  qr?: string;
}

export type TipoVehiculoGuardian = 'moto' | 'carro';

export interface RegistroEntradaGuardian {
  /** El tipo de vehículo se deriva de la placa: inicia con P (carro) o M (moto). */
  placa: string;
  /** Si se omite, el lugar se elige entre todas las zonas disponibles. */
  zona_id?: number;
  /** Si se omite, se elige un lugar compatible al azar. */
  lugar_id?: number;
}

export class GuardianError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly codigo: string,
  ) {
    super(message);
    this.name = 'GuardianError';
  }
}
