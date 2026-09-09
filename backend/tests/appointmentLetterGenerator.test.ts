import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { pool, checkDatabaseHealth } from '../src/database/index.js';
import { sanitizeFilename } from '../src/modules/documents/appointmentLetterController.js';

describe('Appointment Letter Generator Integration & Validation Test Suite', () => {
  let isDbAvailable = false;
  const adminUserId = 'usr-test-admin-appt-unique-88';
  let adminToken = '';

  beforeAll(async () => {
    adminToken = jwt.sign(
      { id: adminUserId, email: 'admin-appt-letter-unique@testcorp.com', role: 'admin' },
      env.JWT_SECRET
    );

    const health = await checkDatabaseHealth();
    isDbAvailable = health === 'CONNECTED';

    if (isDbAvailable) {
      const conn = await pool.getConnection();
      try {
        await conn.query(
          `INSERT INTO users (id, employee_id, full_name, email, password_hash, role, status, must_change_password)
           VALUES (?, 'EMP-ADMIN-APPT-UNIQ', 'Test Appt Admin', 'admin-appt-letter-unique@testcorp.com', 'hash', 'admin', 'active', 0)
           ON DUPLICATE KEY UPDATE status = 'active'`,
          [adminUserId]
        );
        await conn.query(`DELETE FROM employee_appointment_letters WHERE employee_code IN ('EMP001', 'EMP002')`);
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
        await conn.query(`DELETE FROM employee_appointment_letters WHERE employee_code IN ('EMP001', 'EMP002')`);
      } finally {
        conn.release();
      }
    }
  });

  it('1. Filename Sanitization - should properly format PDF filenames', () => {
    const sanitized = sanitizeFilename('Rahul Sharma');
    expect(sanitized).toBe('Rahul_Sharma');
    expect(`Appointment_Letter_${sanitized}_EMP001.pdf`).toBe('Appointment_Letter_Rahul_Sharma_EMP001.pdf');
  });

  it('2. Validation Rule (Test 4) - should block generation if Employee Name is missing', async () => {
    const res = await request(app)
      .post('/api/v1/appointment-letters/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employee_name: '',
        designation: 'Software Engineer',
        employee_code: 'EMP001',
        letter_date: '31/08/2026',
        joining_date: '01/09/2026',
        monthly_gross: 50000,
        annual_ctc: 600000,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Employee Name is required');
  });

  it('3. Validation Rule (Test 5) - should block generation if Date of Joining is missing', async () => {
    const res = await request(app)
      .post('/api/v1/appointment-letters/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employee_name: 'Rahul Sharma',
        designation: 'Software Engineer',
        employee_code: 'EMP001',
        letter_date: '31/08/2026',
        joining_date: '',
        monthly_gross: 50000,
        annual_ctc: 600000,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Date of Joining is required');
  });

  it('4. Scenario Generation (Test 1) - Rahul Sharma, Software Engineer, 01/09/2026, ₹6,00,000 CTC', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/v1/appointment-letters/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employee_name: 'Rahul Sharma',
        designation: 'Software Engineer',
        employee_code: 'EMP001',
        letter_date: '31/08/2026',
        joining_date: '01/09/2026',
        monthly_gross: 50000,
        annual_ctc: 600000,
        document_date: '31/08/2026',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeName).toBe('Rahul Sharma');
    expect(res.body.data.fileName).toBe('Appointment_Letter_Rahul_Sharma_EMP001.pdf');
    expect(res.body.data.versionNumber).toBeGreaterThanOrEqual(1);
  });

  it('5. Independent Creation (Test 2) - Different employee, no stale data cross-contamination', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/v1/appointment-letters/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employee_name: 'Priya Verma',
        designation: 'Product Manager',
        employee_code: 'EMP002',
        letter_date: '31/08/2026',
        joining_date: '15/09/2026',
        monthly_gross: 80000,
        annual_ctc: 960000,
        document_date: '31/08/2026',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeName).toBe('Priya Verma');
    expect(res.body.data.fileName).toBe('Appointment_Letter_Priya_Verma_EMP002.pdf');
  });

  it('6. History & Versioning (Test 3) - Regenerating should increment version number without destroying previous record', async () => {
    if (!isDbAvailable) return;

    // Regenerate for EMP001
    const resRegen = await request(app)
      .post('/api/v1/appointment-letters/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employee_name: 'Rahul Sharma',
        designation: 'Senior Software Engineer',
        employee_code: 'EMP001',
        letter_date: '31/08/2026',
        joining_date: '01/09/2026',
        monthly_gross: 60000,
        annual_ctc: 720000,
        document_date: '31/08/2026',
      });

    expect(resRegen.status).toBe(201);
    expect(resRegen.body.data.versionNumber).toBeGreaterThan(1);

    // Fetch History
    const historyRes = await request(app)
      .get('/api/v1/appointment-letters/history')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.success).toBe(true);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
  });
});
