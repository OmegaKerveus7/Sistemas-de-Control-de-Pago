import type { Vehiculo, VehiculoConDueno } from '../models';
import * as vehiculosRepo from '../repositories/vehiculos.repository';

export async function listar(): Promise<VehiculoConDueno[]> {
  return vehiculosRepo.listar();
}

export async function obtenerPorPlaca(placa: string): Promise<VehiculoConDueno | null> {
  return vehiculosRepo.obtenerPorPlaca(placa);
}

export async function buscar(filtro: string): Promise<VehiculoConDueno[]> {
  return vehiculosRepo.buscar(filtro);
}

export async function crear(data: Vehiculo): Promise<string> {
  return vehiculosRepo.crear(data);
}

export async function actualizar(placa: string, data: Partial<Vehiculo>): Promise<boolean> {
  return vehiculosRepo.actualizar(placa, data);
}

export async function eliminar(placa: string): Promise<boolean> {
  return vehiculosRepo.eliminar(placa);
}

export async function vehiculosPorUsuario(idUsuario: number): Promise<Vehiculo[]> {
  return vehiculosRepo.vehiculosPorUsuario(idUsuario);
}
