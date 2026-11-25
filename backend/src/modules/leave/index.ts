import { Router } from 'express';
import { NextFunction, Response } from 'express';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { isHr, isSelf, requireHr } from '../../security/accessControl.js';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import {
  applyLeave,
  listLeaveRequests,
  getLeaveBalances,
  getLeaveLedger,
  getCLCalculationDetails,
  getPLCalculationDetails,
  employerActionOnLeave,
  adminActionOnLeave,
  approveLeave,
  rejectLeave,
  getLeaveAuditTrail,
  getEmailLogs,
  retryNotification,
  getEmployeeLeaveBalances,
  allocateEmployeeLeave,
  getEmployeeLeaveHistory,
} from './leaveController.js';

import {
  getEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  importEmployeesCsv,
  getLeavePolicies,
  updateLeavePolicy,
  calculateEntitlements,
  getEntitlements,
  getEmployeeDerivedBalance,
  createLeaveTransaction,
  getLeaveTransactions,
  getEntitlementRegisterReport,
} from './leaveAccrualController.js';

const router = Router();
router.use(authenticateToken);

/**
 * Leave data for a specific employee (path :userId or body.userId): employees may only access their own,
 * HR only employees of its own company.
 */
async function leaveTargetGuard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const target = String(req.params.userId || req.body?.userId || '');
  if (!target || isSelf(req, target)) return next();
  if (!isHr(req)) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view your own leave.' } });
    return;
  }
  if (req.isSuperAdmin && !req.tenantId) return next();
  const [rows]: any = await pool.query('SELECT id FROM users WHERE (id = ? OR employee_id = ?) AND company_id = ? LIMIT 1', [target, target, getTenantId(req)]);
  if (!rows.length) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found in your company.' } });
    return;
  }
  next();
}

// Leave Accrual & Policy Engine Endpoints
router.get('/policies', getLeavePolicies);
router.put('/policies/:id', requireRole(['admin']), updateLeavePolicy);
router.post('/entitlements/calculate', requireRole(['admin', 'employer']), calculateEntitlements);
router.get('/entitlements', requireHr, getEntitlements);
router.post('/transactions', requireHr, createLeaveTransaction);
router.get('/transactions', requireHr, getLeaveTransactions);
router.get('/reports/entitlement-register', requireHr, getEntitlementRegisterReport);

router.get('/balances', getLeaveBalances);
router.get('/ledger', getLeaveLedger);
router.get('/calculate-cl', getCLCalculationDetails);
router.get('/calculate-cl/:userId', leaveTargetGuard, getCLCalculationDetails);
router.get('/calculate-pl', getPLCalculationDetails);
router.get('/calculate-pl/:userId', leaveTargetGuard, getPLCalculationDetails);
router.get('/employee-balances/:userId', leaveTargetGuard, getEmployeeLeaveBalances);
router.post('/allocate-leave', requireRole(['admin', 'employer']), leaveTargetGuard, allocateEmployeeLeave);
router.get('/employee-history/:userId', leaveTargetGuard, getEmployeeLeaveHistory);
router.post('/', applyLeave);
router.get('/', listLeaveRequests);
router.patch('/:id/employer-action', requireRole(['admin', 'employer']), employerActionOnLeave);
router.patch('/:id/admin-action', requireRole(['admin']), adminActionOnLeave);
router.patch('/:id/approve', requireRole(['admin', 'employer']), approveLeave);
router.patch('/:id/reject', requireRole(['admin', 'employer']), rejectLeave);
router.get('/audit-trail', requireRole(['admin', 'employer']), getLeaveAuditTrail);
router.get('/email-logs', requireRole(['admin', 'employer']), getEmailLogs);
router.post('/email-logs/:id/retry', requireRole(['admin', 'employer']), retryNotification);

/**
 * Leave Module Boundary
 * Responsibilities: Dual-approval leave applications, balances, employer & admin review workflows, and audit notifications.
 */
export const leaveModule = {
  name: 'leave',
  version: '1.0.0',
  router,
};
