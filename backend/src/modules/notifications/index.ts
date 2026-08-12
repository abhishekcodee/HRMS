import { Router } from 'express';

/**
 * Notifications Module Boundary
 * Responsibilities: In-app alerts, email notifications, SMS alerts for leave approvals and payslip readiness.
 */
export const notificationsModule = {
  name: 'notifications',
  version: '1.0.0',
  router: Router(),
};
