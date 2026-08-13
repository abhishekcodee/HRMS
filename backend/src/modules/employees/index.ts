import { Router } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import {
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
} from './employeeCrudController.js';

const router = Router();
router.use(authenticateToken);

router.get('/', listEmployees);
router.get('/:id', getEmployeeById);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.patch('/:id/status', updateEmployeeStatus);

/**
 * Employees Module Boundary
 * Responsibilities: Employee master data, employment details, reporting structure.
 */
export const employeesModule = {
  name: 'employees',
  version: '1.0.0',
  router,
};
