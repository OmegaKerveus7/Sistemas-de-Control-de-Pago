export interface Credenciales {
  identificador: string;
  password: string;
}

export interface Usuario {
  id: number;
  dpi: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono?: string;
  rol: 'admin' | 'cajero' | 'supervisor';
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface ResultadoAutenticacion {
  exitoso: boolean;
  usuario?: {
    id: number;
    nombres: string;
    apellidos: string;
    rol: string;
    correo?: string;
    dpi?: string;
  };
  mensaje?: string;
  token?: string;
}
