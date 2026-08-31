import type { Pago, FilaReporteMensual } from '../models';
import * as pagosRepo from '../repositories/pagos.repository';

export async function listar(): Promise<Pago[]> {
  return pagosRepo.listar();
}

export async function obtenerPorId(id: number): Promise<Pago | null> {
  return pagosRepo.obtenerPorId(id);
}

export async function obtenerPorParqueo(parqueoId: number): Promise<Pago | null> {
  return pagosRepo.obtenerPorParqueo(parqueoId);
}

export async function obtenerPorReferencia(referencia: string): Promise<Pago | null> {
  return pagosRepo.obtenerPorReferencia(referencia);
}

export async function crear(data: Pago): Promise<number> {
  return pagosRepo.crear(data);
}

export async function confirmar(id: number, referencia: string, ipPago: string): Promise<boolean> {
  return pagosRepo.confirmar(id, referencia, ipPago);
}

export async function reporteMensual(): Promise<FilaReporteMensual[]> {
  return pagosRepo.reporteMensual();
}
