import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import {
  applyLeave,
  listLeaveRequests,
  approveLeave,
  rejectLeave,
  getLeaveAuditTrail,
  getEmailLogs,
  retryNotification,
} from './leaveController.js';

const router = Router();
router.use(authenticateToken);

router.post('/', applyLeave);
router.get('/', listLeaveRequests);
router.patch('/:id/approve', requireRole(['admin', 'employer']), approveLeave);
router.patch('/:id/reject', requireRole(['admin', 'employer']), rejectLeave);
router.get('/audit-trail', requireRole(['admin', 'employer']), getLeaveAuditTrail);
router.get('/email-logs', requireRole(['admin', 'employer']), getEmailLogs);
router.post('/email-logs/:id/retry', requireRole(['admin', 'employer']), retryNotification);

/**
 * Leave Module Boundary
 * Responsibilities: Leave applications, balances, HR approval/rejection workflows, and email notifications.
 */
export const leaveModule = {
  name: 'leave',
  version: '1.0.0',
  router,
};

