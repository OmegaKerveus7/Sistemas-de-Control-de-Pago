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

export async function numParqueoOcupado(numParqueo: string): Promise<boolean> {
  return parqueoRepo.numParqueoOcupado(numParqueo);
}

export async function registrarEntrada(placa: string, numParqueo: string): Promise<number> {
  return parqueoRepo.registrarEntrada(placa, numParqueo);
}

export async function registrarSalida(id: number, costo: number): Promise<boolean> {
  return parqueoRepo.registrarSalida(id, costo);
}

export async function cancelar(id: number): Promise<boolean> {
  return parqueoRepo.cancelar(id);
}

export async function historialPorPlaca(
  placa: string,
  fechaInicio: string,
  fechaFin: string,
): Promise<unknown[]> {
  return parqueoRepo.historialPorPlaca(placa, fechaInicio, fechaFin);
}
