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

export const parqueoService = {
  listar: () => api.get<Parqueo[]>('/parqueo'),
  obtenerPorId: (id: number) => api.get<Parqueo>(`/parqueo/${id}`),
  obtenerActivoPorPlaca: (placa: string) => api.get<Parqueo>(`/parqueo/placa/${placa}`),
  historialPorPlaca: (placa: string, fechaInicio: string, fechaFin: string) =>
    api.get<Parqueo[]>(`/parqueo/historial/${placa}`, {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
    }),
};
