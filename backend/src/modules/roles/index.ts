import { Router } from 'express';

/**
 * Roles Module Boundary
 * Responsibilities: Role definitions (Admin, HR, Manager, Employee) & custom role assignments.
 */
export const rolesModule = {
  name: 'roles',
  version: '1.0.0',
  router: Router(),
};
