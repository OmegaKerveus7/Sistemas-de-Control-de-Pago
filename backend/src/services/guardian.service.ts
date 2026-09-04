import type { CriterioGuardian, RegistroEntradaGuardian } from '../models';
import * as guardianRepo from '../repositories/guardian.repository';

export const resumen = guardianRepo.resumen;
export const lugares = guardianRepo.lugares;
export const buscar = (criterio: CriterioGuardian) => guardianRepo.buscar(criterio);
export const registrarEntrada = (registro: RegistroEntradaGuardian, idGuardia: number, ip: string) => guardianRepo.registrarEntrada(registro, idGuardia, ip);
export const estadisticas = guardianRepo.estadisticas;
export const validarPago = (criterio: CriterioGuardian, idGuardia: number, ip: string) => guardianRepo.validarPago(criterio, idGuardia, ip);
export const registrarSalida = (criterio: CriterioGuardian, idGuardia: number, ip: string) => guardianRepo.registrarSalida(criterio, idGuardia, ip);
