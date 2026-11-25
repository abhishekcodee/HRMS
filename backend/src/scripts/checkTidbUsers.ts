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

  console.log('Connected to TiDB Cloud!');
  const [rows]: any = await conn.query('SELECT id, email, full_name, role, status, password_hash FROM users WHERE role = "super_admin" OR email LIKE "%aman%"');
  console.log('Users in TiDB Cloud:', rows);

  if (rows.length > 0) {
    for (const u of rows) {
      const check = process.env.CHECK_PASSWORD;
      if (check) console.log(`User ${u.email} matches CHECK_PASSWORD?`, await bcrypt.compare(check, u.password_hash));
    }
  }

  await conn.end();
}

main().catch(console.error);

