import { Router } from 'express';

/**
 * Attendance Module Boundary
 * Responsibilities: Processed attendance calculation, work duration, shift rules.
 * Employees do NOT manually create raw attendance.
 */
export const attendanceModule = {
  name: 'attendance',
  version: '1.0.0',
  router: Router(),
};
