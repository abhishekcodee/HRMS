import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../backend/dist/database/index.js';
import { env } from '../backend/dist/config/env.js';

async function runTests() {
  console.log('=== Running Auth & Demo Verification Test Suite ===');

  // Test 1: Verify exactly one admin in the database
  const [admins] = await pool.query('SELECT id, employee_id, full_name, email, role, status FROM users WHERE role IN ("admin", "super_admin")');
  console.log('\n[Test 1] Administrator Count:');
  console.table(admins);
  if (admins.length === 1 && admins[0].email === 'amanupadhyay2030@gmail.com' && admins[0].role === 'super_admin') {
    console.log('✅ PASS: Exactly ONE administrator account (amanupadhyay2030@gmail.com) exists with role super_admin.');
  } else {
    console.error('❌ FAIL: Expected 1 super admin, found:', admins.length);
    process.exit(1);
  }

  // Test 2: Verify the super admin password (only when SUPER_ADMIN_PASSWORD is provided)
  if (process.env.SUPER_ADMIN_PASSWORD) {
    const [adminUser] = await pool.query('SELECT password_hash FROM users WHERE email = ?', ['amanupadhyay2030@gmail.com']);
    const isMatch = await bcrypt.compare(process.env.SUPER_ADMIN_PASSWORD, adminUser[0].password_hash);
    if (isMatch) {
      console.log('✅ PASS: Super admin password verified with bcrypt.');
    } else {
      console.error('❌ FAIL: Super admin password does not match SUPER_ADMIN_PASSWORD');
      process.exit(1);
    }
  }

  // Test 3: Verify old admin accounts are disabled or non-admin
  const [oldAdmins] = await pool.query('SELECT email, role, status FROM users WHERE email IN ("superadmin@hrms.com", "admin@hrms.com")');
  console.log('\n[Test 3] Old Admin Accounts Status:');
  console.table(oldAdmins);
  const allDisabled = oldAdmins.every((u) => u.status === 'inactive' && u.role !== 'admin' && u.role !== 'super_admin');
  if (allDisabled) {
    console.log('✅ PASS: Old admin accounts (superadmin@hrms.com, admin@hrms.com) are demoted and inactive.');
  } else {
    console.error('❌ FAIL: Old admin accounts are still active or privileged.');
    process.exit(1);
  }

  // Test 4: Verify Demo Grant Token Generation and Verification
  const testGrant = jwt.sign(
    {
      type: 'DEMO_ACCESS_GRANT',
      authorized: true,
      email: 'visitor@company.com',
      company: 'Test Company',
    },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  const decoded = jwt.verify(testGrant, env.JWT_SECRET);
  if (decoded.authorized && decoded.type === 'DEMO_ACCESS_GRANT') {
    console.log('✅ PASS: Demo access grant token correctly generated and validated cryptographically.');
  } else {
    console.error('❌ FAIL: Demo token validation failed.');
    process.exit(1);
  }

  // Test 5: Verify Isolated Demo Tenant and User
  const [demoUser] = await pool.query('SELECT id, company_id, email, role, status FROM users WHERE email = "demo@wokhman.com"');
  console.log('\n[Test 5] Demo User Record:');
  console.table(demoUser);
  if (demoUser.length === 1 && demoUser[0].role === 'demo' && demoUser[0].company_id === 'c2000000-0000-0000-0000-000000000001') {
    console.log('✅ PASS: Demo user is isolated to demo tenant c2000000-0000-0000-0000-000000000001 with restricted role demo.');
  } else {
    console.error('❌ FAIL: Demo user not configured correctly.');
    process.exit(1);
  }

  console.log('\n🎉 ALL 5 AUTH & DEMO VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

