export type TipoVehiculo = 'moto' | 'carro' | 'camioneta';

export interface Vehiculo {
  placa: string;
  id_usuario: number;
  id_tipo: number;
  id_marca?: number | null;
  color?: string | null;
  activo?: boolean;
  fecha_registro?: Date;
}

export interface VehiculoConDueno {
  placa: string;
  id_tipo: number;
  tipo: string | null;
  marca: string | null;
  color: string | null;
  activo: boolean;
  id_dueno: number | null;
  dueno_nombres: string | null;
  dueno_apellidos: string | null;
  dueno_dpi: string | null;
  dueno_email: string | null;
}
