import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { resolveTemplateVariables } from '../src/modules/documentManagement/variableResolver.js';
import { generateTotpPin, generateTotpSecret, verifyTotpPin } from '../src/security/mfaService.js';
import { pool, checkDatabaseHealth } from '../src/database/index.js';
import crypto from 'crypto';

describe('Layer A (Security) & Layer B (Document Management) Enterprise Tests', () => {
  let isDbAvailable = false;
  const adminUserId = 'usr-test-admin-99';
  const empUserId = 'usr-test-emp-99';

  const adminToken = jwt.sign(
    { id: adminUserId, email: 'admin@testcorp.com', role: 'admin' },
    env.JWT_SECRET || 'secret'
  );

  const employeeToken = jwt.sign(
    { id: empUserId, email: 'emp@testcorp.com', role: 'employee' },
    env.JWT_SECRET || 'secret'
  );

  beforeAll(async () => {
    const health = await checkDatabaseHealth();
    isDbAvailable = health === 'CONNECTED';

    if (isDbAvailable) {
      const conn = await pool.getConnection();
      try {
        await conn.query(
          `INSERT INTO users (id, employee_id, full_name, email, password_hash, role, status, must_change_password)
           VALUES (?, 'EMP-ADMIN-99', 'Test Admin', 'admin@testcorp.com', 'hash', 'admin', 'active', 0)
           ON DUPLICATE KEY UPDATE status = 'active', must_change_password = 0`,
          [adminUserId]
        );

        await conn.query(
          `INSERT INTO users (id, employee_id, full_name, email, password_hash, role, status, must_change_password)
           VALUES (?, 'EMP-STAFF-99', 'Test Employee', 'emp@testcorp.com', 'hash', 'employee', 'active', 0)
           ON DUPLICATE KEY UPDATE status = 'active', must_change_password = 0`,
          [empUserId]
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
        await conn.query(`DELETE FROM users WHERE id IN (?, ?)`, [adminUserId, empUserId]);
      } finally {
        conn.release();
      }
    }
  });

  it('1. Variable Resolver Engine - should resolve whitelisted dynamic variables accurately', () => {
    const rawTemplate = 'Dear {{employee_name}}, Ref: {{document_number}} from {{company_name}} for {{monthly_salary}}';
    const resolved = resolveTemplateVariables(rawTemplate, {
      employee: { name: 'Aman Upadhyay' },
      company: { name: 'Acme Corporate Technologies' },
      salary: { monthlySalary: 125000 },
      document: { number: 'ACME/HR/APPT/2026/0001' },
    });

    expect(resolved).toContain('Aman Upadhyay');
    expect(resolved).toContain('ACME/HR/APPT/2026/0001');
    expect(resolved).toContain('Acme Corporate Technologies');
    expect(resolved).toContain('125000');
  });

  it('2. Cryptographic SHA-256 Hash Verification - should compute tamper-proof 64-char hex hash', () => {
    const documentContent = '<html><body><h1>APPOINTMENT LETTER</h1></body></html>';
    const hash = crypto.createHash('sha256').update(documentContent).digest('hex');
    expect(hash).toHaveLength(64);
  });

  it('3. TOTP MFA Secret & PIN Validation - should verify 6-digit TOTP pin', () => {
    const secret = generateTotpSecret();
    expect(secret).toBeTruthy();
    // A real authenticator code for this secret is accepted; fixed "backdoor" codes are not
    expect(verifyTotpPin(secret, generateTotpPin(secret))).toBe(true);
    const current = generateTotpPin(secret);
    for (const fake of ['123456', '654321']) {
      if (fake !== current) expect(verifyTotpPin(secret, fake)).toBe(false);
    }
    expect(verifyTotpPin(secret, 'abcdef')).toBe(false);
  });

  it('4. GET /api/v1/document-management/categories - should return default document categories when DB available', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .get('/api/v1/document-management/categories')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('5. GET /api/v1/document-management/types - should return configured document types when DB available', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .get('/api/v1/document-management/types')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('6. Granular RBAC Permission Enforcement - Standard employee should be denied template management', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .post('/api/v1/document-management/templates')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        documentTypeId: 'dt-offer',
        name: 'Unauthorized Template',
        content: 'Content',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('7. GET /api/v1/security/audit-logs - Standard employee should be denied access to Security Audit Center', async () => {
    if (!isDbAvailable) return;

    const res = await request(app)
      .get('/api/v1/security/audit-logs')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
