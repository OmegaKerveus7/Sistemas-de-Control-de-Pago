import type { Tarifa } from '../models';
import * as tarifasRepo from '../repositories/tarifas.repository';

export async function listar(): Promise<Tarifa[]> {
  return tarifasRepo.listar();
}

export async function obtenerPorId(id: number): Promise<Tarifa | null> {
  return tarifasRepo.obtenerPorId(id);
}

export async function crear(datos: tarifasRepo.DatosTarifa): Promise<number> {
  return tarifasRepo.crear(datos);
}

export async function actualizar(
  id: number,
  datos: Partial<tarifasRepo.DatosTarifa>,
): Promise<boolean> {
  return tarifasRepo.actualizar(id, datos);
}
