import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function main() {
  const conn = await mysql.createConnection({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2wmQscp4a6Rw6js.root',
    password: 'N6UFsQIoc5k2JlHB',
    database: 'hrms_db',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });

  console.log('Connected to TiDB Cloud!');
  const [rows]: any = await conn.query('SELECT id, email, full_name, role, status, password_hash FROM users WHERE role = "super_admin" OR email LIKE "%aman%"');
  console.log('Users in TiDB Cloud:', rows);

  if (rows.length > 0) {
    for (const u of rows) {
      const match = await bcrypt.compare('Amanupa10', u.password_hash);
      console.log(`User ${u.email} matches Amanupa10?`, match);
    }
  }

  await conn.end();
}

main().catch(console.error);

