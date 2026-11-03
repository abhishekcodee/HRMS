import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  getPlatformStats,
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  listPlans,
  createPlan,
  getPlatformAuditLogs,
  getSystemHealthAndBackups,
} from '../modules/superAdmin/superAdminController.js';

export const superAdminRouter = Router();

// All Super Admin routes require authentication and super_admin role
superAdminRouter.use(authenticateToken);
superAdminRouter.use(requireRole(['super_admin']));

superAdminRouter.get('/stats', getPlatformStats);
superAdminRouter.get('/companies', listCompanies);
superAdminRouter.post('/companies', createCompany);
superAdminRouter.put('/companies/:id', updateCompany);
superAdminRouter.patch('/companies/:id', updateCompany);
superAdminRouter.delete('/companies/:id', deleteCompany);
superAdminRouter.get('/plans', listPlans);
superAdminRouter.post('/plans', createPlan);
superAdminRouter.get('/audit-logs', getPlatformAuditLogs);
superAdminRouter.get('/health-backups', getSystemHealthAndBackups);
