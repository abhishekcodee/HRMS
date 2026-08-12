import { Router } from 'express';

/**
 * Payroll Module Boundary
 * Responsibilities: Monthly India payroll, PF, ESI, TDS calculations, payslips, and salary components.
 * Money values MUST use NUMERIC/decimal types, never floating point.
 */
export const payrollModule = {
  name: 'payroll',
  version: '1.0.0',
  router: Router(),
};
