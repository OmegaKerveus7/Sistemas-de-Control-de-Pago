export interface Credenciales {
  identificador: string;
  password: string;
}

export interface ResultadoAutenticacion {
  exitoso: boolean;
  usuario?: {
    nombres: string;
    apellidos: string;
    rol: string;
  };
  mensaje?: string;
}
