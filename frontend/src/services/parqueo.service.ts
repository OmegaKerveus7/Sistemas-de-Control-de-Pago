import { api } from './api';

export type EstadoParqueo = 'activo' | 'completado';

export interface Parqueo {
  id: number;
  id_lugar: number;
  lugar: string;
  zona: string;
  id_ticket: number | null;
  ticket: string | null;
  placa: string | null;
  fecha_entrada: string | null;
  fecha_salida: string | null;
  fecha_ocupacion: string;
  fecha_liberacion: string | null;
  estado: EstadoParqueo;
  estado_lugar: string;
  costo: number | null;
  estado_pago: string | null;
}

export interface ValidarParqueoRespuesta {
  placa: string;
  estado: 'con_parqueo' | 'sin_pago' | 'sin_parqueo' | 'no_registrada';
  tiene_pago: boolean;
  puede_salir: boolean;
  id_ticket?: number;
  id_lugar?: number;
  codigo_validacion?: string | null;
  es_externo?: number;
  mensaje?: string;
  vehiculo?: { placa: string; tipo: string | null; marca: string | null; color: string | null };
  parqueo?: { id_lugar: number; codigo: string; zona: string };
  pago?: { monto: number | string; metodo_pago: string; fecha_pago: string };
  usuario?: { id_usuario: number; nombres: string; apellidos: string };
}

export interface ResultadoValidarParqueo {
  codigo: number;
  mensaje: string;
  data: ValidarParqueoRespuesta;
}

export const parqueoService = {
  listar: () => api.get<Parqueo[]>('/parqueo'),
  obtenerPorId: (id: number) => api.get<Parqueo>(`/parqueo/${id}`),
  obtenerActivoPorPlaca: (placa: string) => api.get<Parqueo>(`/parqueo/placa/${placa}`),
  validarPorPlaca: (placa: string) => api.get<ResultadoValidarParqueo>(`/parqueo/validar/${placa}`),
  historialPorPlaca: (placa: string, fechaInicio: string, fechaFin: string) =>
    api.get<Parqueo[]>(`/parqueo/historial/${placa}`, {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
    }),
};
