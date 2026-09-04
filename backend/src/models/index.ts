export * from './Usuario';
export * from './Vehiculo';
export * from './Parqueo';
export * from './Pago';
export * from './Guardian';

export interface UsuarioMySQL {
  id_usuarios: number;
  id_rol: number;
  nom_rol?: string;
  email: string;
  pass?: string;
  nombres: string;
  apellidos: string;
  dpi: string;
  foto_perfil?: string | null;
  activo: boolean;
  fecha_nacimiento?: string | null;
  fecha_creacion?: string;
}
