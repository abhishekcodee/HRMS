import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getEmployeeDashboard,
  getEmployeeProfile,
  getEmployeeAttendance,
  getEmployeeLeave,
  getEmployeePayroll,
  getEmployeeDocuments,
} from '../modules/employee/employeeSelfServiceController.js';

export const employeeRouter = Router();

// Require authentication for all employee self-service routes
employeeRouter.use(authenticateToken);

employeeRouter.get('/dashboard', getEmployeeDashboard);
employeeRouter.get('/profile', getEmployeeProfile);
employeeRouter.get('/attendance', getEmployeeAttendance);
employeeRouter.get('/leave', getEmployeeLeave);
employeeRouter.get('/payroll', getEmployeePayroll);
employeeRouter.get('/documents', getEmployeeDocuments);
