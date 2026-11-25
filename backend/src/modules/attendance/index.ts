import { Router } from 'express';
import { requireRole } from '../../middleware/authMiddleware.js';
import { requireHr } from '../../security/accessControl.js';
import {
  createRegularization,
  getAttendanceCalendar,
  listRegularizations,
  reviewRegularization,
  setManualAttendance,
} from './attendanceCorrectionController.js';
import {
  createFeedLinkHandler,
  downloadAttendanceWorkbookHandler,
  getFeedLinkHandler,
  revokeFeedLinkHandler,
} from './attendanceFeedController.js';

/**
 * Attendance Module Boundary
 * Responsibilities: Processed attendance calculation, work duration, shift rules.
 * Employees do NOT manually create raw attendance.
 */
const router = Router();

// Live Excel link management (the public feed itself is mounted at /api/v1/attendance-feed/:token)
router.get('/feed-link', requireRole(['admin', 'employer']), getFeedLinkHandler);
router.post('/feed-link', requireRole(['admin', 'employer']), createFeedLinkHandler);
router.delete('/feed-link', requireRole(['admin', 'employer']), revokeFeedLinkHandler);
router.get('/export.xlsx', requireRole(['admin', 'employer']), downloadAttendanceWorkbookHandler);

// Attendance calendar, employee correction requests and HR manual corrections
router.get('/calendar', getAttendanceCalendar);
router.get('/regularizations', listRegularizations);
router.post('/regularizations', createRegularization);
router.patch('/regularizations/:id', requireHr, reviewRegularization);
router.put('/manual', requireHr, setManualAttendance);

export const attendanceModule = {
  name: 'attendance',
  version: '1.0.0',
  router,
};
