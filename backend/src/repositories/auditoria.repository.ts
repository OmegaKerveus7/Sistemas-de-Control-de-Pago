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
  await pool.execute(
    `INSERT INTO Usuarios_Detalle (id_usuario, id_proceso, ip_dispositivo, procedimiento, operacion, descripcion)
     VALUES (?, ?, ?, NOW(), ?, ?)`,
    [data.id_usuario, idProceso, data.ip ?? '', JSON.stringify({ accion: data.accion }), data.detalle ?? ''],
  );
}

const CONSULTA_UNIFICADA = `
  SELECT ud.procedimiento AS fecha, 'usuario' AS entidad, ud.id_historial_usuario AS entidad_id,
         COALESCE(p.nom_proceso, 'desconocido') AS accion,
         ud.id_usuario AS id_usuario_accion, u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
         ud.descripcion AS descripcion, ud.ip_dispositivo AS ip
  FROM Usuarios_Detalle ud
  LEFT JOIN Procesos p ON p.id_proceso = ud.id_proceso
  LEFT JOIN Usuarios u ON u.id_usuarios = ud.id_usuario

  UNION ALL

  SELECT vd.fecha_hora AS fecha, 'vehiculo' AS entidad, vd.id_vehiculo_detalle AS entidad_id,
         COALESCE(p.nom_proceso, 'desconocido') AS accion,
         vd.id_usuario AS id_usuario_accion, u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
         NULL AS descripcion, NULL AS ip
  FROM Vehiculos_Detalle vd
  LEFT JOIN Procesos p ON p.id_proceso = vd.id_proceso
  LEFT JOIN Usuarios u ON u.id_usuarios = vd.id_usuario

  UNION ALL

  SELECT td.fecha_hora AS fecha, 'ticket' AS entidad, td.id_ticket AS entidad_id,
         COALESCE(m.tipo_movimiento, 'desconocido') AS accion,
         td.id_usuario AS id_usuario_accion, u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
         NULL AS descripcion, td.ip_dispositivo AS ip
  FROM Tickets_Detalle td
  LEFT JOIN Movimientos m ON m.id_movimiento = td.id_movimiento
  LEFT JOIN Usuarios u ON u.id_usuarios = td.id_usuario

  UNION ALL

  SELECT pd.fecha_cambio AS fecha, 'parqueo' AS entidad, pd.id_lugar AS entidad_id,
         CONCAT(pd.estado_anterior, ' -> ', pd.estado_nuevo) AS accion,
         pd.id_usuario_accion AS id_usuario_accion, u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
         pd.motivo AS descripcion, pd.ip_dispositivo AS ip
  FROM Parqueos_Detalle pd
  LEFT JOIN Usuarios u ON u.id_usuarios = pd.id_usuario_accion

  UNION ALL

  SELECT pgd.fecha_hora AS fecha, 'pago' AS entidad, pgd.id_pago AS entidad_id,
         pgd.accion AS accion,
         pgd.id_usuario_accion AS id_usuario_accion, u.nombres AS actor_nombres, u.apellidos AS actor_apellidos,
         pgd.observaciones AS descripcion, pgd.ip_dispositivo AS ip
  FROM Pagos_Detalle pgd
  LEFT JOIN Usuarios u ON u.id_usuarios = pgd.id_usuario_accion
`;

export async function listar(limite = 300): Promise<EventoAuditoria[]> {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM (${CONSULTA_UNIFICADA}) AS eventos ORDER BY fecha DESC LIMIT ?`,
    [limite],
  );
  return rows as EventoAuditoria[];
}
