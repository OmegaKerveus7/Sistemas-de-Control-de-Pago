import type { Vehiculo } from '../models';
import * as vehiculosRepo from '../repositories/vehiculos.repository';

export async function listar(): Promise<Vehiculo[]> {
  return vehiculosRepo.listar();
}

export async function obtenerPorId(id: number): Promise<Vehiculo | null> {
  return vehiculosRepo.obtenerPorId(id);
}

export async function obtenerPorPlaca(placa: string): Promise<Vehiculo | null> {
  return vehiculosRepo.obtenerPorPlaca(placa);
}

export async function buscar(filtro: string): Promise<Vehiculo[]> {
  return vehiculosRepo.buscar(filtro);
}

export async function crear(data: Vehiculo): Promise<number> {
  return vehiculosRepo.crear(data);
}

export async function actualizar(id: number, data: Partial<Vehiculo>): Promise<boolean> {
  return vehiculosRepo.actualizar(id, data);
}

export async function eliminar(id: number): Promise<boolean> {
  return vehiculosRepo.eliminar(id);
}

// ==================== USUARIO_VEHICULOS ====================

export async function vehiculosPorUsuario(idUsuario: number): Promise<Vehiculo[]> {
  return vehiculosRepo.vehiculosPorUsuario(idUsuario);
}

export async function asignarVehiculoAUsuario(idUsuario: number, idVehiculo: number): Promise<number> {
  return vehiculosRepo.asignarVehiculoAUsuario(idUsuario, idVehiculo);
}

export async function removerVehiculoDeUsuario(idUsuario: number, idVehiculo: number): Promise<boolean> {
  return vehiculosRepo.removerVehiculoDeUsuario(idUsuario, idVehiculo);
}

export async function usuarioTieneVehiculo(idUsuario: number, idVehiculo: number): Promise<boolean> {
  return vehiculosRepo.usuarioTieneVehiculo(idUsuario, idVehiculo);
}
