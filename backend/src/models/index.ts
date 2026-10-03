export * from './Usuario';
export * from './Vehiculo';
export * from './Parqueo';
export * from './Pago';
export * from './Guardian';
export * from './Auditoria';
export * from './Tarifa';

export interface UsuarioMySQL {
  id_usuario: number;
  id_rol: number;
  nom_rol?: string;
  email: string;
  pass?: string;
  nombres: string;
  apellidos: string;
  dpi: string;
  telefono?: string | null;
  activo: boolean;
  fecha_creacion?: string;
}
