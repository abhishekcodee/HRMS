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
});
