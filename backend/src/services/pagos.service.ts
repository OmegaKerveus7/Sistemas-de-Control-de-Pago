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

interface PagoSP {
  id_pago: number;
  codigo_validacion: string;
  monto: number | string;
  metodo_pago: PagoHistorial['metodo_pago'];
  estado_pago: PagoHistorial['estado_pago'];
  fecha_pago: string;
  fecha_confirmacion: string | null;
  fecha_autorizacion_salida?: string | null;
  transaction_id?: string | null;
  vehiculo?: { placa: string; tipo: string; marca: string | null; color: string | null };
  ticket?: { id_ticket: number; numero_ticket: string; fecha_entrada: string; fecha_salida: string | null };
  parqueo?: { id_lugar: number; codigo: string; zona: string };
  tiempo_estacionado_minutos?: number;
  tiempo_estacionado_texto?: string;
}

function adaptarPagoSP(pago: PagoSP): PagoHistorial {
  return {
    id: pago.id_pago,
    codigo_validacion: pago.codigo_validacion,
    monto: Number(pago.monto),
    metodo_pago: pago.metodo_pago,
    estado_pago: pago.estado_pago,
    fecha_pago: pago.fecha_pago,
    fecha_confirmacion: pago.fecha_confirmacion,
    placa: pago.vehiculo?.placa ?? '',
    numero_ticket: pago.ticket?.numero_ticket ?? '',
    fecha_entrada: pago.ticket?.fecha_entrada ?? pago.fecha_pago,
    fecha_salida: pago.ticket?.fecha_salida ?? null,
    lugar: pago.parqueo?.codigo ?? null,
    zona: pago.parqueo?.zona ?? null,
    tiempo_estacionado_minutos: pago.tiempo_estacionado_minutos,
    tiempo_estacionado_texto: pago.tiempo_estacionado_texto,
    fecha_autorizacion_salida: pago.fecha_autorizacion_salida ?? null,
    transaction_id: pago.transaction_id ?? null,
    vehiculo: pago.vehiculo,
    ticket_detalle: pago.ticket,
    parqueo_detalle: pago.parqueo,
  };
}

export async function historialUsuario(
  idUsuario: number,
  fechaInicio?: string | null,
  fechaFin?: string | null,
) {
  const resultado = await pagosRepo.historialUsuario(idUsuario, fechaInicio, fechaFin);
  return {
    codigo: resultado.codigo,
    mensaje: resultado.mensaje,
    data: (resultado.data as unknown as PagoSP[]).map(adaptarPagoSP),
  };
}

export async function crearEfectivo(datos: pagosRepo.DatosPagoEfectivo): Promise<pagosRepo.ResultadoPagoEfectivo> {
  return pagosRepo.crearEfectivo(datos);
}
