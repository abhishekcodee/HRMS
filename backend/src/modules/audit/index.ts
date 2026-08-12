import { Router } from 'express';

/**
 * Audit Log Module Boundary
 * Responsibilities: First-class immutable security audit logs for sensitive operations.
 */
export const auditModule = {
  name: 'audit',
  version: '1.0.0',
  router: Router(),
};
