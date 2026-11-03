import { pool } from '../database/index.js';

async function main() {
  try {
    const [tables]: any = await pool.query('SHOW TABLES');
    console.log('TABLES:', tables.map((t: any) => Object.values(t)[0]));

    const [companies]: any = await pool.query('SELECT id, name, code, logo_url, favicon_url, brand_color FROM companies');
    console.log('COMPANIES IN DB:\n', JSON.stringify(companies, null, 2));

    // Also check company_branding table if it exists
    const brandingTableExists = tables.some((t: any) => Object.values(t)[0] === 'company_branding');
    if (brandingTableExists) {
      const [branding]: any = await pool.query('SELECT * FROM company_branding');
      console.log('COMPANY BRANDING IN DB:\n', JSON.stringify(branding, null, 2));
    }
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await pool.end();
  }
}

main();
