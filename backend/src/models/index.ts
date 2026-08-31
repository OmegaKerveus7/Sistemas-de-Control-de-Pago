export * from './Usuario';
export * from './Vehiculo';
export * from './Parqueo';
export * from './Pago';

export interface UsuarioMySQL {
  id_usuario: number;
  rol: number;
  nombre_rol?: string;
  correo: string;
  contraseña?: string;
  nombres: string;
  apellidos: string;
  dpi: string;
  foto_perfil?: string | null;
  vehiculo?: string | null;
  activo: boolean;
  dispositivo?: string | null;
}
