export type TipoVehiculo = 'moto' | 'carro' | 'camioneta';

export interface Vehiculo {
  placa: string;
  id_usuario: number;
  id_tipo: number;
  id_marca?: number;
  color?: string;
  activo?: boolean;
}

export interface VehiculoConDueno {
  placa: string;
  id_tipo: number;
  tipo: string;
  marca: string;
  color: string | null;
  activo: boolean;
  id_dueno: number;
  dueno_nombres: string;
  dueno_apellidos: string;
  dueno_dpi: string;
  dueno_email: string;
}
