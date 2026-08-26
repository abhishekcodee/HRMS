import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import {
  getReportsOverview,
  getHeadcountAnalytics,
  getNewHiresAnalytics,
  getAttritionAnalytics,
  getAbsenteeismAnalytics,
  getDepartmentAnalytics,
  getDiversityAnalytics,
  getPayrollAnalytics,
  getLeaveAnalytics,
  getRecruitmentAnalytics,
  getDetailedReport,
} from './reportsController.js';

const router = Router();

// Protect all reports routes with authentication & admin/employer permissions
router.use(authenticateToken);
router.use(requireRole(['admin', 'employer']));

router.get('/overview', getReportsOverview);
router.get('/headcount', getHeadcountAnalytics);
router.get('/new-hires', getNewHiresAnalytics);
router.get('/attrition', getAttritionAnalytics);
router.get('/absenteeism', getAbsenteeismAnalytics);
router.get('/department', getDepartmentAnalytics);
router.get('/diversity', getDiversityAnalytics);
router.get('/payroll', getPayrollAnalytics);
router.get('/leave', getLeaveAnalytics);
router.get('/recruitment', getRecruitmentAnalytics);
router.get('/detailed-report', getDetailedReport);

/**
 * Reports Module Boundary
 * Responsibilities: Analytical dashboards, attendance summaries, payroll summaries, export options.
 */
export const reportsModule = {
  name: 'reports',
  version: '1.0.0',
  router,
};
