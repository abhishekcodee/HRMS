import { describe, it, expect, beforeAll } from 'vitest';
import { pool, checkDatabaseHealth } from '../src/database/index.js';
import {
  users,
  employeeProfiles,
  employerProfiles,
  attendance,
  leaveRequests,
  employeeDocuments,
  passwordResetTokens,
  auditLogs,
} from '../src/database/schema/index.js';

describe('HRMS MySQL Database Constraints & Schema Invariants', () => {
  let isDbAvailable = false;

  beforeAll(async () => {
    const health = await checkDatabaseHealth();
    isDbAvailable = health === 'CONNECTED';
  });

  it('1. Schema exports and table definitions should be correctly structured', () => {
    expect(users).toBeDefined();
    expect(employeeProfiles).toBeDefined();
    expect(employerProfiles).toBeDefined();
    expect(attendance).toBeDefined();
    expect(leaveRequests).toBeDefined();
    expect(employeeDocuments).toBeDefined();
    expect(passwordResetTokens).toBeDefined();
    expect(auditLogs).toBeDefined();
  });

  it('2. [DB-CONNECTED] Duplicate user email or employee_id should violate unique constraint', async () => {
    if (!isDbAvailable) return;

    const conn = await pool.getConnection();
    try {
      const testEmail = 'unique_test_' + Date.now() + '@hrms.com';
      const testEmpId = 'EMP_UNIQ_' + Date.now();

      await conn.query(
        `INSERT INTO users (id, employee_id, full_name, email, password_hash, role)
         VALUES (UUID(), ?, 'Test User', ?, 'hash', 'employee')`,
        [testEmpId, testEmail]
      );

      // Duplicate email insert must throw
      await expect(
        conn.query(
          `INSERT INTO users (id, employee_id, full_name, email, password_hash, role)
           VALUES (UUID(), 'EMP_OTHER', 'Test User 2', ?, 'hash', 'employee')`,
          [testEmail]
        )
      ).rejects.toThrow();

      // Clean up test insert
      await conn.query('DELETE FROM users WHERE email = ?', [testEmail]);
    } finally {
      conn.release();
    }
  });
});
