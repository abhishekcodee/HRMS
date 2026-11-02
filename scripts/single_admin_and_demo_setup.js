import bcrypt from 'bcryptjs';
import { pool } from '../backend/dist/database/index.js';
import { seedDemoData } from '../backend/dist/modules/demo/demoSeeder.js';

async function setupSingleAdminAndDemo() {
  console.log('--- HRMS Single Admin & Demo Setup Script ---');
  const conn = await pool.getConnection();

  try {
    const adminEmail = 'amanupadhyay2030@gmail.com';
    const adminPassRaw = 'Amanupa10';
    const adminHash = await bcrypt.hash(adminPassRaw, 10);

    // 1. Update or Insert the ONLY authorized Super Admin
    const [existingAdmin] = await conn.query('SELECT id, email, role FROM users WHERE email = ?', [adminEmail]);
    if (existingAdmin.length > 0) {
      await conn.query(
        'UPDATE users SET password_hash = ?, role = "super_admin", status = "active", must_change_password = 0, full_name = "Aman Upadhyay" WHERE email = ?',
        [adminHash, adminEmail]
      );
      console.log(`✅ Updated primary Super Admin account: ${adminEmail} with role 'super_admin' and password.`);
    } else {
      await conn.query(
        'INSERT INTO users (id, employee_id, full_name, email, password_hash, role, status, must_change_password) VALUES (UUID(), "AMAN001", "Aman Upadhyay", ?, ?, "super_admin", "active", 0)',
        [adminEmail, adminHash]
      );
      console.log(`✅ Created primary Super Admin account: ${adminEmail} with role 'super_admin' and password.`);
    }

    // 2. Disable and demote old hardcoded admin accounts
    await conn.query(
      'UPDATE users SET role = "employee", status = "inactive" WHERE email IN ("superadmin@hrms.com", "admin@hrms.com")'
    );
    console.log('✅ Disabled & demoted superadmin@hrms.com and admin@hrms.com');

    // 3. Demote any other unauthorized accounts having admin or super_admin role
    const [demoted] = await conn.query(
      'UPDATE users SET role = "employee" WHERE role IN ("admin", "super_admin") AND email != ?',
      [adminEmail]
    );
    console.log(`✅ Demoted other admin accounts. Affected rows: ${demoted.affectedRows}`);

    // 4. Verify that ONLY amanupadhyay2030@gmail.com is an administrator
    const [adminCheck] = await conn.query(
      'SELECT id, employee_id, full_name, email, role, status FROM users WHERE role IN ("admin", "super_admin")'
    );
    console.log('Current System Administrators in Database:');
    console.table(adminCheck);

    if (adminCheck.length === 1 && adminCheck[0].email === adminEmail) {
      console.log('🎯 Strict Single Admin Requirement Satisfied! Exactly ONE Super Admin exists.');
    } else {
      console.warn('⚠️ Warning: Unexpected number of admins:', adminCheck.length);
    }

    // 5. Ensure Demo Settings table exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS demo_settings (
        company_id VARCHAR(36) PRIMARY KEY,
        is_enabled TINYINT(1) DEFAULT 1,
        inactivity_timeout_minutes INT DEFAULT 30,
        allow_reset TINYINT(1) DEFAULT 1,
        last_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      INSERT INTO demo_settings (company_id, is_enabled, inactivity_timeout_minutes, allow_reset)
      VALUES ('c2000000-0000-0000-0000-000000000001', 1, 30, 1)
      ON DUPLICATE KEY UPDATE is_enabled = 1;
    `);

    // 6. Seed isolated demo tenant
    await seedDemoData();
    console.log('✅ Seeded isolated demo company and records.');

  } catch (err) {
    console.error('Error during setup:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

setupSingleAdminAndDemo();
