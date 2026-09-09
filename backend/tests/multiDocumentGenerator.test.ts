import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { pool, checkDatabaseHealth } from '../src/database/index.js';
import { sanitizeFilename } from '../src/modules/documents/multiDocumentController.js';

describe('Centralized Multi-Document Generator System Test Suite', () => {
  let isDbAvailable = false;
  const adminUserId = 'usr-test-admin-multi-doc-99';
  const adminToken = jwt.sign(
    { id: adminUserId, email: 'admin@multidoc.com', role: 'admin' },
    env.JWT_SECRET
  );

  beforeAll(async () => {
    const health = await checkDatabaseHealth();
    isDbAvailable = health === 'CONNECTED';

    if (isDbAvailable) {
      const conn = await pool.getConnection();
      try {
        await conn.query(
          `INSERT INTO users (id, employee_id, full_name, email, password_hash, role, status, must_change_password)
           VALUES (?, 'EMP-ADMIN-MDOC', 'MultiDoc Admin', 'admin@multidoc.com', 'hash', 'admin', 'active', 0)
           ON DUPLICATE KEY UPDATE status = 'active'`,
          [adminUserId]
        );
        await conn.query(`DELETE FROM generated_hr_documents WHERE employee_code IN ('EMP001', 'EMP002', 'EMP003')`);
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
        await conn.query(`DELETE FROM generated_hr_documents WHERE employee_code IN ('EMP001', 'EMP002', 'EMP003')`);
      } finally {
        conn.release();
      }
    }
  });

  it('1. GET /api/v1/document-management/generator/types - should return 7 supported document types', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .get('/api/v1/document-management/generator/types')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(7);

    const types = res.body.data.map((d: any) => d.type);
    expect(types).toContain('APPOINTMENT_LETTER');
    expect(types).toContain('LEAVING_CERTIFICATE');
    expect(types).toContain('EXPERIENCE_CERTIFICATE');
    expect(types).toContain('RELIEVING_LETTER');
    expect(types).toContain('SALARY_CERTIFICATE');
    expect(types).toContain('PAYSLIP');
    expect(types).toContain('WARNING_LETTER');
  });

  it('2. Filename Sanitization - should properly format document filenames', () => {
    const cleanName = sanitizeFilename('Rahul Sharma');
    const cleanCode = sanitizeFilename('EMP001');
    expect(`Appointment_Letter_${cleanName}_${cleanCode}.pdf`).toBe('Appointment_Letter_Rahul_Sharma_EMP001.pdf');
    expect(`Leaving_Certificate_${cleanName}_${cleanCode}.pdf`).toBe('Leaving_Certificate_Rahul_Sharma_EMP001.pdf');
    expect(`Pay_Slip_${cleanName}_${cleanCode}.pdf`).toBe('Pay_Slip_Rahul_Sharma_EMP001.pdf');
  });

  it('3. Validation Rule - should block Appointment Letter if Date of Joining is missing', async () => {
    if (!isDbAvailable) return;
    const res = await request(app)
      .post('/api/v1/document-management/generator/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        document_type: 'APPOINTMENT_LETTER',
        employee_name: 'Rahul Sharma',
        employee_code: 'EMP001',
        designation: 'Software Engineer',
        joining_date: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Date of Joining is required');
  });

  it('4. Generate Appointment Letter - should create record with sanitized PDF filename', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/v1/document-management/generator/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        document_type: 'APPOINTMENT_LETTER',
        employee_name: 'Rahul Sharma',
        employee_code: 'EMP001',
        designation: 'Software Engineer',
        department: 'Engineering',
        joining_date: '01/09/2026',
        document_date: '31/08/2026',
        monthly_gross: 50000,
        annual_ctc: 600000,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileName).toBe('Appointment_Letter_Rahul_Sharma_EMP001.pdf');
    expect(res.body.data.versionNumber).toBeGreaterThanOrEqual(1);
  });

  it('5. Generate Leaving Certificate - should create leaving certificate record', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/v1/document-management/generator/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        document_type: 'LEAVING_CERTIFICATE',
        employee_name: 'Rahul Sharma',
        employee_code: 'EMP001',
        designation: 'Software Engineer',
        department: 'Engineering',
        joining_date: '01/09/2023',
        leaving_date: '31/08/2026',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileName).toBe('Leaving_Certificate_Rahul_Sharma_EMP001.pdf');
  });

  it('6. Generate Experience Certificate - should create experience certificate record', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/v1/document-management/generator/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        document_type: 'EXPERIENCE_CERTIFICATE',
        employee_name: 'Amit Kumar',
        employee_code: 'EMP002',
        designation: 'Senior Developer',
        department: 'IT',
        joining_date: '01/01/2022',
        leaving_date: '31/08/2026',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileName).toBe('Experience_Certificate_Amit_Kumar_EMP002.pdf');
  });

  it('7. Generate Relieving Letter - should create relieving letter record', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/v1/document-management/generator/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        document_type: 'RELIEVING_LETTER',
        employee_name: 'Amit Kumar',
        employee_code: 'EMP002',
        designation: 'Senior Developer',
        relieving_date: '31/08/2026',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileName).toBe('Relieving_Letter_Amit_Kumar_EMP002.pdf');
  });

  it('8. Generate Salary Certificate - should create salary certificate record', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/v1/document-management/generator/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        document_type: 'SALARY_CERTIFICATE',
        employee_name: 'Priya Verma',
        employee_code: 'EMP003',
        designation: 'Product Manager',
        monthly_gross: 100000,
        annual_ctc: 1200000,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileName).toBe('Salary_Certificate_Priya_Verma_EMP003.pdf');
  });

  it('9. Generate Warning Letter - should create warning notice record', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/v1/document-management/generator/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        document_type: 'WARNING_LETTER',
        employee_name: 'Priya Verma',
        employee_code: 'EMP003',
        designation: 'Product Manager',
        document_data: {
          subject: 'Notice for Policy Non-Compliance',
          issue_description: 'Unauthorized absence from team standup meetings.',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fileName).toBe('Warning_Letter_Priya_Verma_EMP003.pdf');
  });

  it('10. Document History & Versioning - should retrieve ledger and increment versions on regeneration', async () => {
    if (!isDbAvailable) return;

    // Regenerate Appointment Letter for Rahul Sharma (EMP001)
    const regenRes = await request(app)
      .post('/api/v1/document-management/generator/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        document_type: 'APPOINTMENT_LETTER',
        employee_name: 'Rahul Sharma',
        employee_code: 'EMP001',
        designation: 'Lead Software Engineer',
        joining_date: '01/09/2026',
        monthly_gross: 65000,
        annual_ctc: 780000,
      });

    expect(regenRes.status).toBe(201);
    expect(regenRes.body.data.versionNumber).toBeGreaterThan(1);

    // Fetch Document History
    const historyRes = await request(app)
      .get('/api/v1/document-management/generator/history')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.success).toBe(true);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(6);
  });
});
