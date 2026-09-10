import type { Parqueo } from '../models';
import * as parqueoRepo from '../repositories/parqueo.repository';

export async function listar(): Promise<Parqueo[]> {
  return parqueoRepo.listar();
}

export async function obtenerPorId(id: number): Promise<Parqueo | null> {
  return parqueoRepo.obtenerPorId(id);
}

export async function obtenerActivoPorPlaca(placa: string): Promise<Parqueo | null> {
  return parqueoRepo.obtenerActivoPorPlaca(placa);
}

export async function historialPorPlaca(placa: string, fechaInicio: string, fechaFin: string): Promise<Parqueo[]> {
  return parqueoRepo.historialPorPlaca(placa, fechaInicio, fechaFin);
}

// TODO(pagos): ver nota en parqueo.repository.ts — pendiente de arreglar junto con Pagos.
export async function registrarSalida(id: number, costo: number): Promise<boolean> {
  return parqueoRepo.registrarSalida(id, costo);
}
