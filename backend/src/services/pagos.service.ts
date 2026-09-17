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

export async function reporteDetallado(anio: number, mes: number): Promise<pagosRepo.FilaReporteDetallado[]> {
  return pagosRepo.reporteDetallado(anio, mes);
}

export async function listarPorUsuario(idUsuario: number): Promise<PagoHistorial[]> {
  return pagosRepo.listarPorUsuario(idUsuario);
}

export async function crearEfectivo(datos: pagosRepo.DatosPagoEfectivo): Promise<pagosRepo.ResultadoPagoEfectivo> {
  return pagosRepo.crearEfectivo(datos);
}
