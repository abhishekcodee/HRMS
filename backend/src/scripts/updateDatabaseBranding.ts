import { pool } from '../database/index.js';

async function updateDatabaseBranding() {
  try {
    console.log('--- UPDATING DATABASE WITH OFFICIAL WOKHMAN LOGO AND BRANDING ---');

    // 1. Update company c1000000-0000-0000-0000-000000000001 (Main Wokhman company)
    const [res1]: any = await pool.query(
      `UPDATE companies SET
         name = 'Wokhman',
         code = 'WOKHMAN',
         logo_url = '/logo.png',
         favicon_url = '/favicon.png',
         brand_color = '#6366f1',
         secondary_brand_color = '#4f46e5'
       WHERE id = 'c1000000-0000-0000-0000-000000000001'`
    );
    console.log('[UPDATED] Main company c1000000-0000-0000-0000-000000000001:', res1.affectedRows);

    // 2. Update Demo Corp c2000000-0000-0000-0000-000000000001
    const [res2]: any = await pool.query(
      `UPDATE companies SET
         name = 'Wokhman Demo Corp',
         code = 'DEMO_CORP',
         logo_url = '/logo.png',
         favicon_url = '/favicon.png',
         brand_color = '#6366f1',
         secondary_brand_color = '#4f46e5'
       WHERE id = 'c2000000-0000-0000-0000-000000000001'`
    );
    console.log('[UPDATED] Demo Corp c2000000-0000-0000-0000-000000000001:', res2.affectedRows);

    // 3. For any company that has null or empty logo_url, set default to /logo.png
    const [res3]: any = await pool.query(
      `UPDATE companies SET
         logo_url = '/logo.png',
         favicon_url = '/favicon.png'
       WHERE logo_url IS NULL OR logo_url = ''`
    );
    console.log('[UPDATED] Empty/null company logos set to /logo.png:', res3.affectedRows);

    // 4. Update letterhead settings if any exists
    const [letterheadRows]: any = await pool.query('SELECT * FROM company_letterhead_settings LIMIT 5');
    console.log('Current letterhead settings in DB:', letterheadRows);

    if (letterheadRows.length > 0) {
      await pool.query(
        `UPDATE company_letterhead_settings SET
           company_name = 'Wokhman',
           logo_url = '/logo.png',
           primary_color = '#6366f1'`
      );
      console.log('[UPDATED] Letterhead settings logo updated.');
    }

    // 5. Verify companies after update
    const [updatedCompanies]: any = await pool.query('SELECT id, name, code, logo_url, favicon_url, brand_color FROM companies');
    console.log('\nUPDATED COMPANIES IN DATABASE:\n', JSON.stringify(updatedCompanies, null, 2));

  } catch (err) {
    console.error('Update Error:', err);
  } finally {
    await pool.end();
  }
}

updateDatabaseBranding();
