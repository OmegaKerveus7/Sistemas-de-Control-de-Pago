import * as auditoriaRepo from '../repositories/auditoria.repository';
import type { RegistrarAuditoria } from '../types';

export async function registrar(data: RegistrarAuditoria): Promise<void> {
  return auditoriaRepo.registrar(data);
}
