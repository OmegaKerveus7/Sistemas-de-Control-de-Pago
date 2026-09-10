import * as auditoriaRepo from '../repositories/auditoria.repository';
import type { RegistrarAuditoria } from '../types';
import type { EventoAuditoria } from '../models';

export async function registrar(data: RegistrarAuditoria): Promise<void> {
  return auditoriaRepo.registrar(data);
}

export async function listar(): Promise<EventoAuditoria[]> {
  return auditoriaRepo.listar();
}
