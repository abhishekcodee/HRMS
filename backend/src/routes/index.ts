import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { employeeRouter } from './employee.routes.js';
import { getDashboardStats } from '../modules/dashboard/dashboardController.js';
import { authModule } from '../modules/auth/index.js';
import { usersModule } from '../modules/users/index.js';
import { rolesModule } from '../modules/roles/index.js';
import { permissionsModule } from '../modules/permissions/index.js';
import { organizationModule } from '../modules/organization/index.js';
import { employeesModule } from '../modules/employees/index.js';
import { attendanceModule } from '../modules/attendance/index.js';
import { zktecoModule } from '../modules/zkteco/index.js';
import { leaveModule } from '../modules/leave/index.js';
import { documentsModule } from '../modules/documents/index.js';
import { notificationsModule } from '../modules/notifications/index.js';
import { reportsModule } from '../modules/reports/index.js';
import { auditModule } from '../modules/audit/index.js';
import { calendarModule } from '../modules/calendar/index.js';
import { masterRouter } from './master.routes.js';
import { payrollRouter } from './payroll.routes.js';
import { zktecoRouter } from './zkteco.routes.js';
import { chatRouter } from '../modules/chat/index.js';
import settingsRouter from '../modules/settings/index.js';

import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import {
  getEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  importEmployeesCsv,
  getLeavePolicies,
  updateLeavePolicy,
  calculateEntitlements,
  getEntitlements,
  getEmployeeDerivedBalance,
  createLeaveTransaction,
  getLeaveTransactions,
  getEntitlementRegisterReport,
} from '../modules/leave/leaveAccrualController.js';

import {
  getDefaultTemplate,
  saveTemplate,
  generateAppointmentLetter,
  getAppointmentLettersHistory,
  getEmployeeAppointmentLetters,
  getAppointmentLetterById,
} from '../modules/documents/appointmentLetterController.js';

import {
  getHRDocumentTypes,
  generateHRDocument,
  getHRDocumentsHistory,
} from '../modules/documents/multiDocumentController.js';

import {
  getActiveCompanyLetterhead,
  uploadCompanyLetterhead,
  getCompanyLetterheadHistory,
  activateLetterheadVersion,
  updateLetterheadMargins,
  updateLetterheadSettings,
} from '../modules/documents/companyLetterheadController.js';

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const letterheadDir = path.join(process.cwd(), 'uploads', 'letterheads');
const publicLetterheadDir = path.join(process.cwd(), 'public', 'uploads', 'letterheads');
if (!fs.existsSync(letterheadDir)) {
  fs.mkdirSync(letterheadDir, { recursive: true });
}
if (!fs.existsSync(publicLetterheadDir)) {
  fs.mkdirSync(publicLetterheadDir, { recursive: true });
}

const letterheadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, letterheadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `letterhead_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});
const uploadLetterhead = multer({ storage: letterheadStorage });

import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getStatutorySettings,
  updateStatutorySettings,
  getLetterNumberingFormats,
  updateLetterNumberingFormat,
} from '../modules/documents/settingsController.js';

export const v1Router = Router();

// Health & Readiness Routes
v1Router.use('/', healthRouter);

// High-Performance Consolidated Dashboard Stats Endpoint
v1Router.get('/dashboard/stats', authenticateToken, tenantMiddleware, getDashboardStats);

// Employee Self Service Isolated Routes
v1Router.use('/employee', employeeRouter);

// Companies & Multi-Entity Endpoints
v1Router.get('/companies', authenticateToken, getCompanies);
v1Router.post('/companies', authenticateToken, requireRole(['admin', 'employer']), createCompany);
v1Router.put('/companies/:id', authenticateToken, requireRole(['admin', 'employer']), updateCompany);
v1Router.delete('/companies/:id', authenticateToken, requireRole(['admin', 'employer']), deleteCompany);

// Statutory Settings Endpoints
v1Router.get('/statutory-settings', authenticateToken, getStatutorySettings);
v1Router.put('/statutory-settings', authenticateToken, requireRole(['admin', 'employer']), updateStatutorySettings);

// Reference Numbering Endpoints
v1Router.get('/letter-numbering/company/:companyId', authenticateToken, getLetterNumberingFormats);
v1Router.put('/letter-numbering', authenticateToken, requireRole(['admin', 'employer']), updateLetterNumberingFormat);

// Company Letterhead System Endpoints
v1Router.get('/document-management/letterhead/active', authenticateToken, getActiveCompanyLetterhead);
v1Router.post('/document-management/letterhead/upload', authenticateToken, requireRole(['admin', 'employer']), uploadLetterhead.single('file'), uploadCompanyLetterhead);
v1Router.get('/document-management/letterhead/history', authenticateToken, getCompanyLetterheadHistory);
v1Router.post('/document-management/letterhead/activate/:id', authenticateToken, requireRole(['admin', 'employer']), activateLetterheadVersion);
v1Router.put('/document-management/letterhead/margins', authenticateToken, requireRole(['admin', 'employer']), updateLetterheadMargins);
v1Router.put('/document-management/letterhead/settings', authenticateToken, requireRole(['admin', 'employer']), updateLetterheadSettings);

// Centralized Multi-Document Generator Endpoints
v1Router.get('/document-management/generator/types', authenticateToken, getHRDocumentTypes);
v1Router.post('/document-management/generator/generate', authenticateToken, requireRole(['admin', 'employer']), generateHRDocument);
v1Router.get('/document-management/generator/history', authenticateToken, getHRDocumentsHistory);

// Appointment Letters Top-Level Endpoints
v1Router.get('/appointment-letters/templates/default', authenticateToken, getDefaultTemplate);
v1Router.post('/appointment-letters/templates', authenticateToken, requireRole(['admin', 'employer']), saveTemplate);
v1Router.put('/appointment-letters/templates/:id', authenticateToken, requireRole(['admin', 'employer']), saveTemplate);
v1Router.post('/appointment-letters/generate', authenticateToken, requireRole(['admin', 'employer']), generateAppointmentLetter);
v1Router.get('/appointment-letters/history', authenticateToken, getAppointmentLettersHistory);
v1Router.get('/appointment-letters/employee/:employeeId', authenticateToken, getEmployeeAppointmentLetters);
v1Router.get('/appointment-letters/:id', authenticateToken, getAppointmentLetterById);

// Prompt Endpoints Exact Mounts
v1Router.get('/employees/import', authenticateToken, requireRole(['admin', 'employer']), importEmployeesCsv);
v1Router.post('/employees/import', authenticateToken, requireRole(['admin', 'employer']), importEmployeesCsv);
v1Router.get('/employees/:id/balance', authenticateToken, getEmployeeDerivedBalance);

v1Router.get('/policies', authenticateToken, getLeavePolicies);
v1Router.put('/policies/:id', authenticateToken, requireRole(['admin']), updateLeavePolicy);

v1Router.post('/entitlements/calculate', authenticateToken, requireRole(['admin', 'employer']), calculateEntitlements);
v1Router.get('/entitlements', authenticateToken, getEntitlements);

v1Router.post('/leave-transactions', authenticateToken, createLeaveTransaction);
v1Router.get('/leave-transactions', authenticateToken, getLeaveTransactions);

v1Router.get('/reports/entitlement-register', authenticateToken, getEntitlementRegisterReport);

// Multi-Tenant & Super Admin Mount Points
import { superAdminRouter } from './superAdmin.routes.js';
import { companyRouter } from './company.routes.js';

v1Router.use('/super-admin', superAdminRouter);
v1Router.use('/company', companyRouter);

// Module Boundaries Mount Points
v1Router.use('/auth', authModule.router);
v1Router.use('/users', authenticateToken, tenantMiddleware, usersModule.router);
v1Router.use('/roles', authenticateToken, tenantMiddleware, rolesModule.router);
v1Router.use('/permissions', authenticateToken, tenantMiddleware, permissionsModule.router);
v1Router.use('/organization', authenticateToken, tenantMiddleware, organizationModule.router);
v1Router.use('/employees', authenticateToken, tenantMiddleware, employeesModule.router);
v1Router.use('/master', authenticateToken, tenantMiddleware, masterRouter);
v1Router.use('/attendance', authenticateToken, tenantMiddleware, attendanceModule.router);
// The ADMS heartbeat/punch endpoints are public because devices cannot send JWTs.
// Management endpoints keep their own authentication and role guards in zkteco.routes.ts.
v1Router.use('/zkteco', tenantMiddleware, zktecoRouter);
v1Router.use('/essl', tenantMiddleware, zktecoRouter);
v1Router.use('/leave', authenticateToken, tenantMiddleware, leaveModule.router);
v1Router.use('/payroll', authenticateToken, tenantMiddleware, payrollRouter);
v1Router.use('/documents', authenticateToken, tenantMiddleware, documentsModule.router);
v1Router.use('/notifications', authenticateToken, tenantMiddleware, notificationsModule.router);
v1Router.use('/reports', authenticateToken, tenantMiddleware, reportsModule.router);
v1Router.use('/audit', authenticateToken, tenantMiddleware, auditModule.router);
v1Router.use('/calendar', authenticateToken, tenantMiddleware, calendarModule.router);
v1Router.use('/chat', authenticateToken, tenantMiddleware, chatRouter);
v1Router.use('/settings', authenticateToken, tenantMiddleware, settingsRouter);

// Layer A & B Enterprise Additions Mount Points
import documentManagementRouter from '../modules/documentManagement/index.js';
import securityRouter from '../modules/security/index.js';

v1Router.use('/document-management', authenticateToken, tenantMiddleware, documentManagementRouter);
v1Router.use('/security', authenticateToken, tenantMiddleware, securityRouter);

import { mobileRouter } from './mobile.routes.js';
v1Router.use('/mobile', mobileRouter);

