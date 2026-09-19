import 'dotenv/config';
import { getPool, closePool } from '../src/config/database';
import type { RowDataPacket } from 'mysql2/promise';
try {
  const required: Record<string, string[]> = {
    Pagos: ['id_pago', 'id_ticket', 'id_usuario', 'placa', 'id_tipo', 'metodo_pago', 'monto', 'codigo_validacion', 'estado_pago', 'transaction_id', 'gateway_response', 'observacion', 'fecha_confirmacion'],
    Tickets: ['id_ticket', 'placa', 'id_tipo', 'activo', 'fecha_salida'],
    Parqueos: ['id_parqueo', 'id_ticket', 'fecha_liberacion'],
    Tipo_vehiculo: ['id_tipo', 'precio_efectivo', 'precio_linea'],
  };
  const [columns] = await getPool().query<RowDataPacket[]>(`SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`);
  const missing = Object.entries(required).flatMap(([table, fields]) => fields.filter(field => !columns.some(c => c.TABLE_NAME === table && c.COLUMN_NAME === field)).map(field => `${table}.${field}`));
  if (missing.length) throw new Error(`Faltan columnas: ${missing.join(', ')}`);
  for (const table of ['Pagos', 'Tickets']) {
    const col = columns.find(c => c.TABLE_NAME === table && c.COLUMN_NAME === 'placa');
    if (Number(col?.CHARACTER_MAXIMUM_LENGTH) < 7) throw new Error(`${table}.placa requiere al menos 7 caracteres; aplica la migración de placas`);
  }
  console.log('Esquema compatible con pagos Recurrente; no se modificaron datos.');
} finally { await closePool(); }
