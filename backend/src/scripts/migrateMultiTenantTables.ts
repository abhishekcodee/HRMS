import { pool } from '../database/index.js';

export async function migrateMultiTenantDatabase() {
  console.log('--- Starting Multi-Tenant SaaS Database Migration ---');

  const connection = await pool.getConnection();
  try {
    // 1. Helper to check if column exists
    const checkColumnExists = async (tableName: string, columnName: string): Promise<boolean> => {
      const [rows]: any = await connection.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ? 
          AND COLUMN_NAME = ?
      `, [tableName, columnName]);
      return rows[0].count > 0;
    };

    // Helper to check if table exists
    const checkTableExists = async (tableName: string): Promise<boolean> => {
      const [rows]: any = await connection.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ?
      `, [tableName]);
      return rows[0].count > 0;
    };

    // 2. Ensure default company exists
    const defaultCompanyId = 'c1000000-0000-0000-0000-000000000001';
    const [compRows]: any = await connection.query('SELECT id FROM companies WHERE id = ?', [defaultCompanyId]);
    if (compRows.length === 0) {
      console.log('Creating default company...');
      await connection.query(`
        INSERT INTO companies (id, code, name, status, plan, created_at)
        VALUES (?, 'WOKHMAN', 'Wokhman Corporation', 'ACTIVE', 'ENTERPRISE', NOW())
      `, [defaultCompanyId]);
    }

    // 3. Tables that need company_id column added if missing
    const tablesToAddCompanyId = [
      'company_events',
      'in_app_notifications',
      'chat_conversations',
      'master_teams',
      'statutory_settings',
      'leave_policies',
      'leave_entitlements',
      'leave_transactions',
      'employee_tax_declarations',
      'salary_slip_email_logs',
      'payroll_records',
      'biometric_punch_logs',
      'email_notifications',
      'employee_documents',
      'clauses',
      'template_clauses',
    ];

    for (const table of tablesToAddCompanyId) {
      const exists = await checkTableExists(table);
      if (exists) {
        const hasCol = await checkColumnExists(table, 'company_id');
        if (!hasCol) {
          console.log(`Adding company_id to ${table}...`);
          await connection.query(`
            ALTER TABLE \`${table}\` 
            ADD COLUMN \`company_id\` VARCHAR(36) NULL AFTER \`id\`
          `);
          // Backfill with default company ID
          await connection.query(`
            UPDATE \`${table}\` 
            SET \`company_id\` = ? 
            WHERE \`company_id\` IS NULL
          `, [defaultCompanyId]);
          // Add index for fast tenant query performance
          try {
            await connection.query(`
              CREATE INDEX \`idx_${table}_company_id\` ON \`${table}\` (\`company_id\`)
            `);
          } catch (e: any) {
            // Index might already exist
          }
        }
      }
    }

    // 4. Ensure foreign key / indices exist on critical tables for tenant isolation
    const criticalIndexedTables = [
      'users',
      'employee_profiles',
      'attendance',
      'leave_requests',
      'payroll_runs',
      'payroll_items',
      'payslips',
      'master_departments',
      'master_designations',
      'documents',
      'company_events',
    ];

    for (const table of criticalIndexedTables) {
      const exists = await checkTableExists(table);
      if (exists) {
        const hasCol = await checkColumnExists(table, 'company_id');
        if (hasCol) {
          // Backfill any nulls
          await connection.query(`
            UPDATE \`${table}\` 
            SET \`company_id\` = ? 
            WHERE \`company_id\` IS NULL
          `, [defaultCompanyId]);

          try {
            await connection.query(`
              CREATE INDEX \`idx_${table}_company_id\` ON \`${table}\` (\`company_id\`)
            `);
          } catch (e: any) {
            // Index exists
          }
        }
      }
    }

    // 5. Ensure SaaS subscription plans table has default plans
    const saasPlansExists = await checkTableExists('saas_subscription_plans');
    if (saasPlansExists) {
      const [plans]: any = await connection.query('SELECT COUNT(*) as count FROM saas_subscription_plans');
      if (plans[0].count === 0) {
        console.log('Seeding SaaS subscription plans...');
        await connection.query(`
          INSERT INTO saas_subscription_plans (id, name, code, max_employees, price_per_month, features_json, is_active)
          VALUES 
            (UUID(), 'Starter', 'STARTER', 50, 49.00, '{"attendance":true,"leave":true,"documents":false,"payroll":false,"chat":true}', 1),
            (UUID(), 'Professional', 'PROFESSIONAL', 250, 149.00, '{"attendance":true,"leave":true,"documents":true,"payroll":true,"chat":true}', 1),
            (UUID(), 'Enterprise SaaS', 'ENTERPRISE', 5000, 499.00, '{"attendance":true,"leave":true,"documents":true,"payroll":true,"chat":true,"biometrics":true,"custom_branding":true}', 1)
        `);
      }
    }

    console.log('--- Multi-Tenant SaaS Database Migration Complete Successfully! ---');
  } catch (error) {
    console.error('Migration Error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Execute if run directly
migrateMultiTenantDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
