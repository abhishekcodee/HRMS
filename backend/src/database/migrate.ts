import path from 'node:path';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db, checkDatabaseHealth, pool } from './index.js';
import { logger } from '../utils/logger.js';

/**
 * Migration runner entrypoint executing Drizzle MySQL migrations reproducibly.
 */
export async function runMigrations() {
  logger.info('Starting HRMS database migration process...');
  const health = await checkDatabaseHealth();
  if (health === 'DISCONNECTED') {
    logger.error('Cannot run migrations: MySQL database is not reachable.');
    process.exit(1);
  }

  const migrationsFolder = path.resolve(__dirname, './migrations');
  logger.info(`Running Drizzle MySQL database migrations from: ${migrationsFolder}`);
  
  await migrate(db as any, { migrationsFolder });
  logger.info('✅ HRMS database migrations applied successfully.');
}

if (process.argv[1]?.includes('migrate.ts')) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Migration failed:', err);
      await pool.end();
      process.exit(1);
    });
}
