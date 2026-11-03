import { pool } from '../database/index.js';

async function run() {
  try {
    const [cols]: any = await pool.query(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME IN ('company_id', 'tenant_id')
    `);
    const tablesWithCompanyId = cols.map((c: any) => c.TABLE_NAME);
    console.log('--- TABLES WITH company_id ---');
    console.log(tablesWithCompanyId);

    const [allTables]: any = await pool.query('SHOW TABLES');
    const tableKey = Object.keys(allTables[0])[0];
    const allTableNames = allTables.map((t: any) => t[tableKey]);
    const withCompanySet = new Set(tablesWithCompanyId);
    const withoutCompany = allTableNames.filter((t: string) => !withCompanySet.has(t));

    console.log('\n--- TABLES WITHOUT company_id ---');
    console.log(withoutCompany);

    // Also check companies currently registered in the database
    const [companies]: any = await pool.query('SELECT id, code, name, status FROM companies');
    console.log('\n--- REGISTERED COMPANIES ---');
    console.log(companies);

    process.exit(0);
  } catch (err) {
    console.error('Error running check:', err);
    process.exit(1);
  }
}

run();
