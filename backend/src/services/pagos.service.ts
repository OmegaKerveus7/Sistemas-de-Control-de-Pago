import type { Pago, PagoLegacy, FilaReporteMensual } from '../models';
import * as pagosRepo from '../repositories/pagos.repository';

export async function listar(): Promise<Pago[]> {
  return pagosRepo.listar();
}

export async function obtenerPorId(id: number): Promise<Pago | null> {
  return pagosRepo.obtenerPorId(id);
}

export async function obtenerPorTicket(idTicket: number): Promise<Pago | null> {
  return pagosRepo.obtenerPorTicket(idTicket);
}

export async function reporteMensual(): Promise<FilaReporteMensual[]> {
  return pagosRepo.reporteMensual();
}

export async function crearEfectivo(datos: pagosRepo.DatosPagoEfectivo): Promise<{ id: number; monto: number }> {
  return pagosRepo.crearEfectivo(datos);
}

// Legacy: ver nota en pagos.repository.ts
export async function obtenerPorReferencia(referencia: string): Promise<PagoLegacy | null> {
  return pagosRepo.obtenerPorReferencia(referencia);
}

export async function crear(data: PagoLegacy): Promise<number> {
  return pagosRepo.crearLegacy(data);
}

export async function confirmar(id: number, referencia: string, ipPago: string): Promise<boolean> {
  return pagosRepo.confirmarLegacy(id, referencia, ipPago);
}
