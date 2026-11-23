import { logger } from '../utils/logger.js';

type Conn = { query: (sql: string, params?: any[]) => Promise<any> };

export const DEFAULT_COMPANY_ID = 'c1000000-0000-0000-0000-000000000001';

/**
 * Fresh-install schema repair.
 *
 * The application code is multi-tenant (`company_id` everywhere, a `companies` table), but the
 * base table definitions in seed.ts pre-date that. On an existing production database the
 * columns were added by hand / by scripts; on a brand-new database login and most screens failed
 * with "Unknown column 'company_id'". Everything here is idempotent and only ADDS missing pieces.
 */
export async function repairTenantSchema(conn: Conn): Promise<void> {
  const [existing]: any = await conn.query(
    "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies'"
  );
  if (Number(existing[0].n) > 0) {
    // Established (multi-tenant) database: never restructure it automatically.
    return;
  }
  logger.info('Schema repair: fresh database detected, adding multi-tenant columns...');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id VARCHAR(36) PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      tagline VARCHAR(255),
      legal_suffix VARCHAR(50),
      registered_address TEXT,
      works_address TEXT,
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      country VARCHAR(100) DEFAULT 'India',
      zip_code VARCHAR(20),
      tax_id VARCHAR(100),
      cin VARCHAR(50),
      gstin VARCHAR(50),
      pan VARCHAR(20),
      phone VARCHAR(50),
      email VARCHAR(255),
      website VARCHAR(255),
      logo_url LONGTEXT,
      logo_path TEXT,
      favicon_url LONGTEXT,
      signature_path TEXT,
      brand_color VARCHAR(20),
      secondary_brand_color VARCHAR(20),
      custom_domain VARCHAR(255),
      subscription_plan_id VARCHAR(36),
      plan VARCHAR(50),
      max_employees INT DEFAULT 100,
      letterhead_top_margin_mm INT DEFAULT 20,
      letterhead_bottom_margin_mm INT DEFAULT 20,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(
    "INSERT IGNORE INTO companies (id, code, name, status) VALUES (?, 'MAIN', 'My Company', 'active')",
    [DEFAULT_COMPANY_ID]
  );

  // Add a nullable company_id to every base table that lacks it, then backfill the default tenant.
  const [tables]: any = await conn.query(
    `SELECT t.TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES t
     WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE'
       AND t.TABLE_NAME NOT IN ('companies', 'system_settings')
       AND NOT EXISTS (
         SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c
         WHERE c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME AND c.COLUMN_NAME = 'company_id'
       )`
  );
  for (const t of tables) {
    const name = String(t.name || t.TABLE_NAME);
    if (!/^[A-Za-z0-9_]+$/.test(name)) continue;
    try {
      await conn.query(`ALTER TABLE \`${name}\` ADD COLUMN company_id VARCHAR(36) NULL`);
      await conn.query(`UPDATE \`${name}\` SET company_id = ? WHERE company_id IS NULL`, [DEFAULT_COMPANY_ID]);
      logger.info(`Schema repair: added company_id to ${name}`);
    } catch (err: any) {
      if (err?.errno !== 1060) logger.warn(`Schema repair: could not add company_id to ${name}: ${err?.message}`);
    }
  }

  // Users created before multi-tenancy belong to the default company (super admin stays global).
  try {
    await conn.query(
      "UPDATE users SET company_id = ? WHERE company_id IS NULL AND role <> 'super_admin'",
      [DEFAULT_COMPANY_ID]
    );
  } catch (_) { /* users table missing */ }
}
