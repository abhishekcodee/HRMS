import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  getPlatformStats,
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  listAdmins,
  assignCompanyAdmin,
  resetAdminPassword,
  toggleAdminStatus,
  listPlans,
  createPlan,
  getPlatformAuditLogs,
  getSystemHealthAndBackups,
} from '../modules/superAdmin/superAdminController.js';

export const superAdminRouter = Router();

// All Super Admin routes require authentication and super_admin role
superAdminRouter.use(authenticateToken);
superAdminRouter.use(requireRole(['super_admin']));

// Platform Statistics
superAdminRouter.get('/stats', getPlatformStats);

// Multi-Company Management
superAdminRouter.get('/companies', listCompanies);
superAdminRouter.post('/companies', createCompany);
superAdminRouter.put('/companies/:id', updateCompany);
superAdminRouter.patch('/companies/:id', updateCompany);
superAdminRouter.delete('/companies/:id', deleteCompany);

// Company Administrator Management & Credentials
superAdminRouter.get('/admins', listAdmins);
superAdminRouter.post('/companies/:id/admin', assignCompanyAdmin);
superAdminRouter.post('/admins/:id/reset-password', resetAdminPassword);
superAdminRouter.patch('/admins/:id/status', toggleAdminStatus);

// Plans, Logs & System Diagnostics
superAdminRouter.get('/plans', listPlans);
superAdminRouter.post('/plans', createPlan);
superAdminRouter.get('/audit-logs', getPlatformAuditLogs);
superAdminRouter.get('/health-backups', getSystemHealthAndBackups);
