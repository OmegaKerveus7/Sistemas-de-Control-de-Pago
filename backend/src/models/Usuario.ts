export interface Usuario {
  id_usuarios?: number;
  dpi: string;
  nombres: string;
  apellidos: string;
  email: string;
  password_hash: string;
  id_rol: number;
  activo: boolean;
  fecha_creacion?: Date;
}
