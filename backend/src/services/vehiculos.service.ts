import type { Vehiculo, VehiculoConDueno } from '../models';
import * as vehiculosRepo from '../repositories/vehiculos.repository';

export type { ResultadoSP, Marca, TipoVehiculoCatalogo } from '../repositories/vehiculos.repository';

export async function listar(): Promise<VehiculoConDueno[]> {
  return vehiculosRepo.listar();
}

export async function obtenerPorPlaca(placa: string): Promise<VehiculoConDueno | null> {
  return vehiculosRepo.obtenerPorPlaca(placa);
}

export async function buscar(filtro: string): Promise<VehiculoConDueno[]> {
  return vehiculosRepo.buscar(filtro);
}

export async function crear(
  data: Vehiculo,
  idUsuarioAccion: number,
  ip: string,
) {
  return vehiculosRepo.crear(data, idUsuarioAccion, ip);
}

export async function actualizar(
  placa: string,
  data: Partial<Vehiculo>,
  idUsuarioAccion: number,
  ip: string,
) {
  return vehiculosRepo.actualizar(placa, data, idUsuarioAccion, ip);
}

export async function eliminar(placa: string, idUsuarioAccion: number, ip: string) {
  return vehiculosRepo.eliminar(placa, idUsuarioAccion, ip);
}

export async function vehiculosPorUsuario(idUsuario: number): Promise<Vehiculo[]> {
  return vehiculosRepo.vehiculosPorUsuario(idUsuario);
}

export async function listarTiposVehiculo() {
  return vehiculosRepo.listarTiposVehiculo();
}

export async function marcasPorTipo() {
  return vehiculosRepo.marcasPorTipo();
}
