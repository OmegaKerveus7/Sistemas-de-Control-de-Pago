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

export async function validarParqueoPorPlaca(placa: string) {
  const resultado = await parqueoRepo.validarParqueoPorPlaca(placa);
  const data = (resultado.data ?? {}) as { estado?: string; placa?: string };
  if (data.estado === 'sin_parqueo') {
    const existe = await parqueoRepo.placaExiste(placa);
    if (!existe) {
      return {
        ...resultado,
        mensaje: `La placa ${placa.trim().toUpperCase()} no está registrada en el sistema`,
        data: { ...data, estado: 'no_registrada' },
      };
    }
  }
  return resultado;
}
