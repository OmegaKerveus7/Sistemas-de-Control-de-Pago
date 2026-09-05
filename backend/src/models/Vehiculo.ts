export type TipoVehiculo = 'automovil' | 'motocicleta' | 'camioneta' | 'otro';

export interface Vehiculo {
  id?: number;
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  tipo: TipoVehiculo;
  foto?: string;
  creado_en?: Date;
}

export interface UsuarioVehiculo {
  id?: number;
  id_usuario: number;
  id_vehiculo: number;
  creado_en?: Date;
}

export interface VehiculoConDueno {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  color: string | null;
  año: number | null;
  tipo: string;
  activo: boolean;
  id_dueno: number;
  dueno_nombres: string;
  dueno_apellidos: string;
  dueno_dpi: string;
  dueno_email: string;
}
