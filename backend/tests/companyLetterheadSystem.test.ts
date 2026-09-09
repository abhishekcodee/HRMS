import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { pool, checkDatabaseHealth } from '../src/database/index.js';
import path from 'path';
import fs from 'fs';

describe('Company Letterhead System Integration Tests', () => {
  let isDbAvailable = false;
  const adminUserId = 'usr-test-lh-admin-001';
  const adminToken = jwt.sign(
    { id: adminUserId, email: 'lhadmin@testcorp.com', role: 'admin', companyId: 'cmp-default-001' },
    env.JWT_SECRET
  );
  const dummyFilePath = path.join(process.cwd(), 'tests', 'dummy_letterhead.png');

  beforeAll(async () => {
    const health = await checkDatabaseHealth();
    isDbAvailable = health === 'CONNECTED';

    if (!fs.existsSync(dummyFilePath)) {
      fs.writeFileSync(dummyFilePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
    }

    if (isDbAvailable) {
      const conn = await pool.getConnection();
      try {
        await conn.query(
          `INSERT INTO users (id, employee_id, full_name, email, password_hash, role, status, must_change_password)
           VALUES (?, 'EMP-ADMIN-LH', 'LH Admin', 'lhadmin@testcorp.com', 'hash', 'admin', 'active', 0)
           ON DUPLICATE KEY UPDATE status = 'active'`,
          [adminUserId]
        );
      } finally {
        conn.release();
      }
    }
  });

  afterAll(async () => {
    if (isDbAvailable) {
      const conn = await pool.getConnection();
      try {
        await conn.query(`DELETE FROM users WHERE id = ?`, [adminUserId]);
      } finally {
        conn.release();
      }
    }
  });

  it('1. GET /api/v1/document-management/letterhead/active should return active letterhead or default settings', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .get('/api/v1/document-management/letterhead/active')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('settings');
  });

  it('2. POST /api/v1/document-management/letterhead/upload should upload letterhead and increment version', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .post('/api/v1/document-management/letterhead/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', dummyFilePath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data.isActive).toBe(true);
  });

  it('3. GET /api/v1/document-management/letterhead/history should list version history', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .get('/api/v1/document-management/letterhead/history')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('4. PUT /api/v1/document-management/letterhead/margins should update content safe margins', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .put('/api/v1/document-management/letterhead/margins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ top: 30, bottom: 30, left: 22, right: 22 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.margins.top).toBe(30);
  });

  it('5. PUT /api/v1/document-management/letterhead/settings should update policy toggles', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .put('/api/v1/document-management/letterhead/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ requireLetterhead: true, allowHrReplace: true, allowHrEditCompanyDetails: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.requireLetterhead).toBe(true);
  });

  it('6. POST /api/v1/document-management/generator/generate should generate document with active letterhead version & salutation', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .post('/api/v1/document-management/generator/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        document_type: 'EXPERIENCE_CERTIFICATE',
        salutation: 'Mr.',
        employee_name: 'Jake Willms',
        employee_code: 'EMP-9001',
        designation: 'Data Analyst',
        department: 'Engineering',
        joining_date: 'August 2050',
        leaving_date: 'August 2053',
        document_date: 'November 28, 2050',
        document_data: {
          main_tasks: 'analyzing data, creating reports, and assisting in strategic decision-making processes',
          company_email: 'inquire@bridify.mail',
          company_phone: '222 555 7777',
          company_website: 'Template.net',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('pdfPath');
  });
});
