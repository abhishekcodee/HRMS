import { Router } from 'express';

/**
 * Organization Module Boundary
 * Responsibilities: Company profile, Departments, Teams, Manager hierarchy management.
 * Hierarchy: Company -> Department -> Team -> Manager -> Employee
 */
export const organizationModule = {
  name: 'organization',
  version: '1.0.0',
  router: Router(),
};
