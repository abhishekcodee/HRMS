import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Connecting to Render to fetch DB environment variables...');
  const res = await fetch('https://api.render.com/v1/services/srv-dbi7mh1srm7s73dg5i50/env-vars', {
    headers: {
      'Authorization': 'Bearer rnd_AcnYM2SFCaTdUfH89jQVOgGoKdK2',
      'Accept': 'application/json'
    }
  });
  const envs = await res.json();
  const map = {};
  for (const item of envs) {
    map[item.envVar.key] = item.envVar.value;
  }

  console.log('Connecting to TiDB Cloud:', map.DB_HOST, 'Database:', map.DB_NAME);
  const conn = await mysql.createConnection({
    host: map.DB_HOST,
    port: parseInt(map.DB_PORT || '4000', 10),
    user: map.DB_USER || map.DB_USERNAME,
    password: map.DB_PASSWORD,
    database: map.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  const [companies] = await conn.query('SELECT id, name, code, status FROM companies');
  console.log('Current companies in TiDB:', companies);

  const [users] = await conn.query('SELECT id, employee_id, full_name, email, role, status FROM users');
  console.log('Current users in TiDB:', users);

  const DEMO_COMPANY_ID = 'c2000000-0000-0000-0000-000000000001';
  const DEMO_USER_ID = 'd1000000-0000-0000-0000-000000000001';
  const demoPasswordHash = await bcrypt.hash('Demo@12345', 10);

  console.log('1. Upserting Demo Company...');
  await conn.query(`
    INSERT INTO companies (id, code, name, tagline, email, phone, status, logo_url, brand_color, secondary_brand_color, max_employees)
    VALUES (?, 'DEMO_CORP', 'Wokhman Demo Corp', 'Work Meets Human. (Live Interactive Demo)', 'demo@wokhman.com', '+1 (555) 019-DEMO', 'active', '/logo.png', '#4f46e5', '#0066ff', 50)
    ON DUPLICATE KEY UPDATE name = VALUES(name), tagline = VALUES(tagline), status = 'active', logo_url = '/logo.png'
  `, [DEMO_COMPANY_ID]);

  console.log('2. Upserting Demo User (demo@wokhman.com)...');
  await conn.query(`
    INSERT INTO users (id, company_id, employee_id, full_name, email, phone, password_hash, role, status, must_change_password)
    VALUES (?, ?, 'DEMO001', 'Demo Administrator', 'demo@wokhman.com', '+1 (555) 019-3366', ?, 'demo', 'active', 0)
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'demo', status = 'active', must_change_password = 0
  `, [DEMO_USER_ID, DEMO_COMPANY_ID, demoPasswordHash]);

  console.log('3. Ensuring demo_settings and marketing_demo_requests tables exist...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS marketing_demo_requests (
      id VARCHAR(36) PRIMARY KEY,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL,
      phone VARCHAR(40),
      company_name VARCHAR(160) NOT NULL,
      company_size VARCHAR(50),
      status VARCHAR(30) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS demo_settings (
      id VARCHAR(36) PRIMARY KEY,
      company_id VARCHAR(36) NOT NULL UNIQUE,
      is_enabled TINYINT(1) DEFAULT 1,
      inactivity_timeout_minutes INT DEFAULT 30,
      allow_reset TINYINT(1) DEFAULT 1,
      last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    INSERT INTO demo_settings (id, company_id, is_enabled, inactivity_timeout_minutes, allow_reset)
    VALUES ('ds-c2000000-0001', ?, 1, 30, 1)
    ON DUPLICATE KEY UPDATE is_enabled = 1, inactivity_timeout_minutes = 30
  `, [DEMO_COMPANY_ID]);

  console.log('Demo setup verified successfully on TiDB Cloud!');
  await conn.end();
}

main().catch(console.error);
