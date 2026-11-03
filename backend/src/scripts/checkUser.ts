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

  const [rows]: any = await conn.query(
    'SELECT id, employee_id, full_name, email, role, status, company_id, password_hash FROM users WHERE LOWER(email) = LOWER(?)',
    ['amanupadhyay2030@gmail.com']
  );

  console.log('Found users:', rows.length);
  for (const r of rows) {
    const isMatch = await bcrypt.compare('Amanupa10', r.password_hash);
    console.log(`User ID: ${r.id}, Email: ${r.email}, Role: ${r.role}, Status: ${r.status}, Company: ${r.company_id}, Amanupa10 match: ${isMatch}`);
  }

  await conn.end();
}

main().catch(console.error);
