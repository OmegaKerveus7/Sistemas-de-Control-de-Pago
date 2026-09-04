export interface CriterioGuardian {
  placa?: string;
  ticket?: string;
  referencia?: string;
  qr?: string;
}

export type TipoVehiculoGuardian = 'moto' | 'carro';

export interface RegistroEntradaGuardian {
  placa: string;
  /** Solo se requiere cuando se registra un visitante que no posee vehículo previamente asociado. */
  tipo?: TipoVehiculoGuardian;
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
