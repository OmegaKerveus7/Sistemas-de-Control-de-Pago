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

/** Si el usuario eligió "Otros" y escribió una marca, resuelve o crea el id_marca correspondiente. */
async function resolverMarcaPersonalizada(idTipo: number | undefined, idMarca: number | undefined | null, marcaPersonalizada: string | undefined): Promise<number | undefined> {
  if (idMarca) return idMarca;
  if (marcaPersonalizada && marcaPersonalizada.trim() && idTipo) {
    return vehiculosRepo.obtenerOCrearMarca(idTipo, marcaPersonalizada);
  }
  return idMarca ?? undefined;
}

export async function crear(
  data: Vehiculo & { marca_personalizada?: string },
  idUsuarioAccion: number,
  ip: string,
) {
  const { marca_personalizada, ...resto } = data;
  const id_marca = await resolverMarcaPersonalizada(resto.id_tipo, resto.id_marca, marca_personalizada);
  return vehiculosRepo.crear({ ...resto, id_marca }, idUsuarioAccion, ip);
}

export async function actualizar(
  placa: string,
  data: Partial<Vehiculo> & { marca_personalizada?: string },
  idUsuarioAccion: number,
  ip: string,
) {
  const { marca_personalizada, ...resto } = data;
  const id_marca = await resolverMarcaPersonalizada(resto.id_tipo, resto.id_marca, marca_personalizada);
  return vehiculosRepo.actualizar(placa, { ...resto, id_marca }, idUsuarioAccion, ip);
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
