import mysql from 'mysql2/promise';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`La variable de entorno ${name} es requerida`);
  return value;
}

const dbConfig: mysql.PoolOptions = {
  host: requiredEnv('DB_HOST'),
  port: Number(requiredEnv('DB_PORT')),
  user: requiredEnv('DB_USER'),
  password: requiredEnv('DB_PASSWORD'),
  database: requiredEnv('DB_NAME'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) pool = mysql.createPool(dbConfig);
  return pool;
}

export async function testConnection(): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export const sql = {
  Int: 'int',
  BigInt: 'bigint',
  VarChar: 'varchar',
  NVarChar: 'varchar',
  NText: 'text',
  Text: 'text',
  Float: 'double',
  Decimal: () => 'decimal',
  Bit: 'bit',
  DateTime: 'datetime',
};
