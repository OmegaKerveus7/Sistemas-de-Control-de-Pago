export interface Usuario {
  id_usuario?: number;
  dpi: string;
  nombres: string;
  apellidos: string;
  email: string;
  pass?: string;
  telefono?: string | null;
  id_rol: number;
  activo: boolean;
  fecha_creacion?: Date;
}
