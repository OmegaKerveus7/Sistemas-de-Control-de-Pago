import { api } from './api';

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Pago {
  id: number;
  parqueo_id: number;
  monto: number;
  metodo: MetodoPago;
  estado: 'pendiente' | 'completado' | 'reembolsado';
  referencia?: string;
  procesado_por?: number;
}

export const pagosService = {
  listar: () => api.get<Pago[]>('/pagos'),
  obtenerPorId: (id: number) => api.get<Pago>(`/pagos/${id}`),
  obtenerPorParqueo: (parqueoId: number) => api.get<Pago>(`/pagos/parqueo/${parqueoId}`),
  crear: (data: { parqueo_id: number; monto: number; metodo: MetodoPago }) =>
    api.post<{ id: number }>('/pagos', data),
};
