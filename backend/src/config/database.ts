import mysql from 'mysql2/promise';

const dbConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'parqueo',
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