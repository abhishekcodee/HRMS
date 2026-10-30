import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// MySQL Connection Pool configuration (XAMPP / AWS RDS / TiDB Cloud compatible)
const poolOptions: mysql.PoolOptions = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USERNAME || env.DB_USER || 'root',
  password: env.DB_PASSWORD || '',
  database: env.DB_DATABASE || env.DB_NAME || 'hrms_db',
  waitForConnections: true,
  connectionLimit: env.DB_MAX_CONNECTIONS || 20,
  queueLimit: 0,
  ...(env.DB_SSL ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false } } : {}),
};

if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && process.env.DATABASE_URL.startsWith('mysql')) {
  poolOptions.uri = process.env.DATABASE_URL;
}

export const pool = mysql.createPool(poolOptions);

// Drizzle ORM Instance for MySQL
export const db = drizzle(pool);

export let lastDbError: string | null = null;

/**
 * Health check function for MySQL database connection.
 */
export async function checkDatabaseHealth(): Promise<'CONNECTED' | 'DISCONNECTED'> {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('SELECT 1');
      lastDbError = null;
      return 'CONNECTED';
    } finally {
      connection.release();
    }
  } catch (error: any) {
    lastDbError = error?.message || String(error);
    logger.warn('MySQL Database health check failed:', { error: lastDbError });
    return 'DISCONNECTED';
  }
}
