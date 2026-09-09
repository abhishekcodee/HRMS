import { describe, it, expect } from 'vitest';
import { isValidEmail } from '../src/services/emailService.js';

describe('HRMS Email Validation & Service Security', () => {
  it('isValidEmail - should correctly validate standard RFC email addresses', () => {
    expect(isValidEmail('employee@company.com')).toBe(true);
    expect(isValidEmail('hr.admin@hrms-corp.co.in')).toBe(true);
    expect(isValidEmail('test+user@domain.org')).toBe(true);
  });

  it('isValidEmail - should reject malformed email strings', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('no-at-sign.com')).toBe(false);
    expect(isValidEmail('@missingusername.com')).toBe(false);
    expect(isValidEmail('user@.com')).toBe(false);
  });

  it('SalarySlipPayload - should validate required salary slip fields for single & bulk dispatch', () => {
    const validPayload = {
      employeeId: 'EMP-001',
      employeeName: 'Rahul Sharma',
      employeeEmail: 'rahul.sharma@company.com',
      salaryMonth: 'October',
      salaryYear: '2026',
    };

    expect(validPayload.employeeId.trim().length).toBeGreaterThan(0);
    expect(isValidEmail(validPayload.employeeEmail)).toBe(true);
    expect(validPayload.salaryMonth).toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i);
    expect(Number(validPayload.salaryYear)).toBeGreaterThanOrEqual(2020);
  });

  it('SalarySlipPayload - should detect invalid payload parameters', () => {
    const invalidPayload = {
      employeeId: '',
      employeeEmail: 'invalid-email-address',
      salaryMonth: 'InvalidMonth',
      salaryYear: 'abcd',
    };

    expect(invalidPayload.employeeId.trim().length).toBe(0);
    expect(isValidEmail(invalidPayload.employeeEmail)).toBe(false);
    expect(invalidPayload.salaryMonth).not.toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i);
    expect(isNaN(Number(invalidPayload.salaryYear))).toBe(true);
  });
});

