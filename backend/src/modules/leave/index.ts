import { Router } from 'express';

/**
 * Leave Module Boundary
 * Responsibilities: Leave applications, balances, and single-stage approval workflow (Manager OR HR/Admin).
 * Sequential Manager + HR approval is NOT required.
 */
export const leaveModule = {
  name: 'leave',
  version: '1.0.0',
  router: Router(),
};
