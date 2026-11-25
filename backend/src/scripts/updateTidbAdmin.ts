import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: 4000,
    user: process.env.DB_USERNAME || process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'hrms_db',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });

  console.log('Connected to TiDB Cloud Production Database...');

  const newPassword = process.env.SUPER_ADMIN_PASSWORD || '';
  if (newPassword.length < 10) {
    throw new Error('Set SUPER_ADMIN_PASSWORD (at least 10 characters) before running this script.');
  }
  const newHash = await bcrypt.hash(newPassword, 10);

  // 1. Remove or disable any other super_admin accounts (e.g. superadmin@hrms.com)
  const [removed]: any = await conn.query(
    'DELETE FROM users WHERE role = "super_admin" AND LOWER(email) != LOWER("amanupadhyay2030@gmail.com")'
  );
  console.log('Removed other super_admin accounts:', removed.affectedRows);

  // 2. Ensure amanupadhyay2030@gmail.com exists with the SUPER_ADMIN_PASSWORD password and role super_admin
  const [existing]: any = await conn.query(
    'SELECT id, email FROM users WHERE LOWER(email) = LOWER("amanupadhyay2030@gmail.com")'
  );

  if (existing.length > 0) {
    await conn.query(
      `UPDATE users 
       SET password_hash = ?, 
           role = 'super_admin', 
           status = 'active', 
           full_name = 'Aman Upadhyay',
           must_change_password = 0,
           updated_at = NOW()
       WHERE id = ?`,
      [newHash, existing[0].id]
    );
    console.log(`Updated Super Admin '${existing[0].email}' password hash and active status.`);
  } else {
    await conn.query(
      `INSERT INTO users (
        id, employee_id, full_name, email, password_hash, role, status, must_change_password, created_at, updated_at
      ) VALUES (UUID(), 'SUPER-001', 'Aman Upadhyay', 'amanupadhyay2030@gmail.com', ?, 'super_admin', 'active', 0, NOW(), NOW())`,
      [newHash]
    );
    console.log('Created Super Admin amanupadhyay2030@gmail.com in TiDB Cloud.');
  }

  // 3. Verify
  const [verifyRows]: any = await conn.query(
    'SELECT id, email, full_name, role, status, password_hash FROM users WHERE role = "super_admin"'
  );
  console.log('Active Super Admin in TiDB Cloud:', verifyRows);

  for (const u of verifyRows) {
    const match = await bcrypt.compare(newPassword, u.password_hash);
    console.log(`Verification: ${u.email} password updated =>`, match);
  }

  await conn.end();
}

main().catch(console.error);

