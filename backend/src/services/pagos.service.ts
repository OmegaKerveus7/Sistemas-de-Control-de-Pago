import type { Pago, FilaReporteMensual, PagoHistorial } from '../models';
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

export async function listarPorUsuario(idUsuario: number): Promise<PagoHistorial[]> {
  return pagosRepo.listarPorUsuario(idUsuario);
}

export async function crearEfectivo(datos: pagosRepo.DatosPagoEfectivo): Promise<{ id: number; monto: number }> {
  return pagosRepo.crearEfectivo(datos);
}
