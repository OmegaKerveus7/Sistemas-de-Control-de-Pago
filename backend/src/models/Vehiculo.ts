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
