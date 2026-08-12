import { Router } from 'express';

/**
 * Reports Module Boundary
 * Responsibilities: Analytical dashboards, attendance summaries, payroll summaries, export options (CSV/PDF).
 */
export const reportsModule = {
  name: 'reports',
  version: '1.0.0',
  router: Router(),
};
