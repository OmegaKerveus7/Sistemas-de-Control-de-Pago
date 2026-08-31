import { getPool } from '../config/database';
import type { RegistrarAuditoria } from '../types';

export async function registrar(data: RegistrarAuditoria): Promise<void> {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO auditoria (id_usuario, accion, entidad, detalle, ip)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.id_usuario ?? null,
      data.accion,
      data.entidad ?? null,
      data.detalle ?? null,
      data.ip ?? null,
    ],
  );
}
