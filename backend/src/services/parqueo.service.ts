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
