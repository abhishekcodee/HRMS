import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  uploadMiddleware,
  validateSalarySlipExcel,
  sendBulkSalarySlips,
  retryFailedSalarySlips,
  getSalarySlipLogs,
} from '../modules/payroll/salarySlipController.js';

export const payrollRouter = Router();

payrollRouter.use(authenticateToken);
payrollRouter.use(requireRole(['admin', 'employer']));

payrollRouter.post('/salary-slips/validate-excel', uploadMiddleware, validateSalarySlipExcel);
payrollRouter.post('/salary-slips/send-bulk', sendBulkSalarySlips);
payrollRouter.post('/salary-slips/retry-failed', retryFailedSalarySlips);
payrollRouter.get('/salary-slips/logs', getSalarySlipLogs);
