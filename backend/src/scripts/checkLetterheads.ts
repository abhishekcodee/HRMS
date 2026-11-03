import { pool } from '../database/index.js';

async function main() {
  const [lh]: any = await pool.query('SELECT id, company_id, file_name, file_path, is_active FROM company_letterheads');
  console.log('COMPANY LETTERHEADS:', lh);

  const [companies]: any = await pool.query('SELECT id, name, code, logo_url, favicon_url, brand_color FROM companies');
  console.log('COMPANIES IN DB:', companies);

  await pool.end();
}
main();
