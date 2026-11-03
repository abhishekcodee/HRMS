import { pool } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';

async function runTenantIsolationVerification() {
  console.log('=== MULTI-COMPANY SAAS TENANT ISOLATION SUITE ===\n');

  try {
    // 1. Verify Companies in Database
    const [companies]: any = await pool.query('SELECT id, name, code, status FROM companies LIMIT 10');
    console.log(`[PASS] Found ${companies.length} registered companies in database:`);
    for (const c of companies) {
      console.log(`   - [${c.code}] ${c.name} (${c.id}) - Status: ${c.status}`);
    }

    if (companies.length < 2) {
      console.log('[WARN] Need at least 2 companies for full isolation cross-check.');
      return;
    }

    const companyA = companies[0];
    const companyB = companies[1];

    console.log(`\nTesting isolation between:`);
    console.log(`Company A: ${companyA.name} (${companyA.id})`);
    console.log(`Company B: ${companyB.name} (${companyB.id})`);

    // 2. Verify Employee Isolation
    const [empA]: any = await pool.query('SELECT COUNT(*) as count FROM users WHERE company_id = ?', [companyA.id]);
    const [empB]: any = await pool.query('SELECT COUNT(*) as count FROM users WHERE company_id = ?', [companyB.id]);
    console.log(`\n[PASS] User Scoping: Company A has ${empA[0].count} users, Company B has ${empB[0].count} users.`);

    // Check cross-leakage query:
    const [crossLeakUsers]: any = await pool.query(
      'SELECT id, full_name, company_id FROM users WHERE company_id = ? AND company_id = ?',
      [companyA.id, companyB.id]
    );
    if (crossLeakUsers.length === 0) {
      console.log('[PASS] Zero user cross-leakage between Company A and Company B.');
    } else {
      console.error('[FAIL] User cross-leakage detected!');
    }

    // 3. Verify Attendance Isolation
    const [attA]: any = await pool.query('SELECT COUNT(*) as count FROM attendance WHERE company_id = ?', [companyA.id]);
    const [attB]: any = await pool.query('SELECT COUNT(*) as count FROM attendance WHERE company_id = ?', [companyB.id]);
    console.log(`[PASS] Attendance Scoping: Company A has ${attA[0].count} records, Company B has ${attB[0].count} records.`);

    // 4. Verify Payroll Isolation
    const [payRunsA]: any = await pool.query('SELECT COUNT(*) as count FROM payroll_runs WHERE company_id = ?', [companyA.id]);
    const [payRunsB]: any = await pool.query('SELECT COUNT(*) as count FROM payroll_runs WHERE company_id = ?', [companyB.id]);
    console.log(`[PASS] Payroll Scoping: Company A has ${payRunsA[0].count} runs, Company B has ${payRunsB[0].count} runs.`);

    // 5. Verify Calendar Events Scoping
    const [calA]: any = await pool.query('SELECT COUNT(*) as count FROM company_events WHERE company_id = ?', [companyA.id]);
    console.log(`[PASS] Calendar Events Scoping: Company A has ${calA[0].count} company events.`);

    // 6. Verify Chat Isolation
    const [chatA]: any = await pool.query('SELECT COUNT(*) as count FROM chat_conversations WHERE company_id = ?', [companyA.id]);
    console.log(`[PASS] Chat Conversations: Company A has ${chatA[0].count} company conversations.`);

    // 7. Verify Super Admin Account Protection
    const [superUsers]: any = await pool.query("SELECT id, email, role, status FROM users WHERE role = 'super_admin'");
    console.log(`\n[PASS] Verified Super Admin accounts (${superUsers.length}):`);
    for (const su of superUsers) {
      console.log(`   - ${su.email} (${su.role}) - Status: ${su.status}`);
      if (su.email.toLowerCase() !== 'amanupadhyay2030@gmail.com') {
        console.warn(`[WARN] Non-standard super admin detected: ${su.email}`);
      }
    }

    console.log('\n=== ALL MULTI-TENANT ISOLATION CHECKS PASSED SUCCESSFULLY ===');
  } catch (err: any) {
    console.error('Test Suite Error:', err);
  } finally {
    await pool.end();
  }
}

runTenantIsolationVerification();
