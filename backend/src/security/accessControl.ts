import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';

/** Roles that manage a company (HR / owner). The platform super admin also passes. */
export const HR_ROLES = ['admin', 'employer', 'hr'];

export function isHr(req: AuthRequest): boolean {
  if (req.isSuperAdmin || req.user?.isSuperAdmin) return true;
  return HR_ROLES.includes(String(req.user?.role || '').toLowerCase());
}

export function isSelf(req: AuthRequest, idOrCode: string | undefined | null): boolean {
  if (!idOrCode || !req.user) return false;
  return idOrCode === req.user.id || idOrCode === req.user.employeeId;
}

/** Express guard: only HR roles (and the super admin) may continue. */
export function requireHr(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    return;
  }
  if (!isHr(req)) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only HR or company administrators can do this.' } });
    return;
  }
  next();
}

/** Fields of an employee record that only HR (or the employee themself) may see. */
const PRIVATE_EMPLOYEE_FIELDS = [
  'salary', 'pan', 'aadhaar', 'uan', 'pfNumber', 'esicNumber', 'bankName', 'accountNumber', 'ifsc', 'dob',
  'address', 'residentialAddress', 'residentialCity', 'residentialState', 'residentialPincode',
  'permanentAddress', 'permanentCity', 'permanentState', 'permanentPincode', 'permanentAddressSame',
  'emergencyContact', 'emergencyPhone', 'experienceYears', 'gradeId', 'costCenterId', 'lastLoginAt',
  'resignationDate', 'lastWorkingDate', 'confirmationDate',
  // snake_case variants returned by some endpoints
  'account_number', 'bank_name', 'pf_number', 'esic_number',
];

export function redactEmployee<T extends Record<string, any>>(row: T): T {
  const copy: Record<string, any> = { ...row };
  for (const f of PRIVATE_EMPLOYEE_FIELDS) if (f in copy) delete copy[f];
  return copy as T;
}

/** Profile fields an employee may change on their own record. Everything else is HR-only. */
export const SELF_EDITABLE_FIELDS = [
  'phone', 'profilePhoto', 'gender', 'dob', 'address',
  'residentialAddress', 'residentialCity', 'residentialState', 'residentialPincode',
  'permanentAddress', 'permanentCity', 'permanentState', 'permanentPincode', 'permanentAddressSame',
  'emergencyContact', 'emergencyPhone',
];

/**
 * Which role values a caller may assign. Company HR can create employees and other HR users (employer);
 * only the platform super admin can grant admin / super_admin.
 */
export function assignableRole(req: AuthRequest, requested: any): { ok: true; role: string | null } | { ok: false; message: string } {
  if (requested === undefined || requested === null || requested === '') return { ok: true, role: null };
  const role = String(requested).trim().toLowerCase();
  const allowed = req.isSuperAdmin || req.user?.isSuperAdmin ? ['employee', 'employer', 'hr', 'admin'] : ['employee', 'employer', 'hr'];
  if (role === 'super_admin' || !allowed.includes(role)) {
    return { ok: false, message: `You are not allowed to assign the role "${role}".` };
  }
  return { ok: true, role };
}
