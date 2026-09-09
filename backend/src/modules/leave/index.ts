import { Router } from 'express';
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

// Leave Accrual & Policy Engine Endpoints
router.get('/policies', getLeavePolicies);
router.put('/policies/:id', requireRole(['admin']), updateLeavePolicy);
router.post('/entitlements/calculate', requireRole(['admin', 'employer']), calculateEntitlements);
router.get('/entitlements', getEntitlements);
router.post('/transactions', createLeaveTransaction);
router.get('/transactions', getLeaveTransactions);
router.get('/reports/entitlement-register', getEntitlementRegisterReport);

router.get('/balances', getLeaveBalances);
router.get('/ledger', getLeaveLedger);
router.get('/calculate-cl', getCLCalculationDetails);
router.get('/calculate-cl/:userId', getCLCalculationDetails);
router.get('/calculate-pl', getPLCalculationDetails);
router.get('/calculate-pl/:userId', getPLCalculationDetails);
router.get('/employee-balances/:userId', getEmployeeLeaveBalances);
router.post('/allocate-leave', requireRole(['admin', 'employer']), allocateEmployeeLeave);
router.get('/employee-history/:userId', getEmployeeLeaveHistory);
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
