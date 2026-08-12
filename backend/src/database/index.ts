import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// MySQL Connection Pool configuration (XAMPP / AWS RDS compatible)
export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USERNAME || env.DB_USER || 'root',
  password: env.DB_PASSWORD || '',
  database: env.DB_DATABASE || env.DB_NAME || 'hrms_db',
  waitForConnections: true,
  connectionLimit: env.DB_MAX_CONNECTIONS || 20,
  queueLimit: 0,
});

// Drizzle ORM Instance for MySQL
export const db = drizzle(pool);

/**
 * Health check function for MySQL database connection.
 */
export async function checkDatabaseHealth(): Promise<'CONNECTED' | 'DISCONNECTED'> {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('SELECT 1');
      return 'CONNECTED';
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.warn('MySQL Database health check failed:', { error: (error as Error).message });
    return 'DISCONNECTED';
  }
}
