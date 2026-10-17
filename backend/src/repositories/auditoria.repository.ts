import { getPool } from '../config/database';
import type { RegistrarAuditoria } from '../types';
import type { EventoAuditoria } from '../models';

const ID_PROCESO_POR_ACCION: Record<string, number> = {
  CREAR_USUARIO: 1,
  ACTUALIZAR_USUARIO: 2,
  ELIMINAR_USUARIO: 3,
};

export async function registrar(data: RegistrarAuditoria): Promise<void> {
  const idProceso = ID_PROCESO_POR_ACCION[data.accion];
  if (!idProceso || !data.id_usuario) return;

  const pool = getPool();
  await pool.query('CALL sp_auditoria_registrar(?, ?, ?, ?, ?)', [
    data.id_usuario,
    idProceso,
    data.ip ?? '',
    JSON.stringify({ accion: data.accion }),
    data.detalle ?? '',
  ]);
}

export async function listar(limite = 300): Promise<EventoAuditoria[]> {
  const pool = getPool();
  const [results] = await pool.query('CALL sp_auditoria_listar(?)', [limite]);
  return (results as unknown as [EventoAuditoria[]])[0];
}
