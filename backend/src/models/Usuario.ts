export interface Usuario {
  id?: number;
  dpi: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono?: string;
  password_hash: string;
  rol: 'admin' | 'cajero' | 'supervisor';
  activo: boolean;
  creado_en?: Date;
  actualizado_en?: Date;
}
