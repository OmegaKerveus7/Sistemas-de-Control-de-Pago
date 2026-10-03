export type EntidadAuditoria = 'usuario' | 'vehiculo' | 'ticket' | 'parqueo' | 'pago';

export interface EventoAuditoria {
  fecha: string;
  entidad: EntidadAuditoria;
  entidad_id: number;
  accion: string;
  id_usuario_accion: number | null;
  actor_nombres: string | null;
  actor_apellidos: string | null;
  descripcion: string | null;
  ip: string | null;
}
