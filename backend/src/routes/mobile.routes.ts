import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import {
  getMobileConfig,
  getMobileDashboard,
  mobileCheckIn,
  mobileCheckOut,
  getMobileLeaveRequests,
  applyMobileLeave,
  getMobilePayslips,
} from '../modules/mobile/mobileController.js';

export const mobileRouter = Router();

mobileRouter.use(authenticateToken);
mobileRouter.use(tenantMiddleware);

// Mobile Configuration & Branding
mobileRouter.get('/config', getMobileConfig);

// Dual-Mode Dashboard Telemetry
mobileRouter.get('/dashboard', getMobileDashboard);

// Mobile Attendance Clocking
mobileRouter.post('/attendance/check-in', mobileCheckIn);
mobileRouter.post('/attendance/check-out', mobileCheckOut);

// Mobile Leave Management
mobileRouter.get('/leave/my-requests', getMobileLeaveRequests);
mobileRouter.post('/leave/apply', applyMobileLeave);

// Mobile Payslips & Payroll
mobileRouter.get('/payroll/my-payslips', getMobilePayslips);
