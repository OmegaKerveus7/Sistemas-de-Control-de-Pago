import type { ReporteDetallado } from '../../services/reportes.service';

// MySQL DECIMAL can arrive as a string. Sum integer cents to avoid float drift.
export function centavos(monto: number | string): number {
  const valor = Number(monto);
  if (!Number.isFinite(valor)) throw new Error('Monto de pago inválido');
  return Math.round((valor + Number.EPSILON) * 100);
}

export function totalPagos(pagos: ReporteDetallado[], estado?: string): number {
  return pagos.reduce((total, pago) => total + (!estado || pago.estado === estado ? centavos(pago.monto) : 0), 0) / 100;
}
