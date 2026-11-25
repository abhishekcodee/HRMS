import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { requireHr } from '../security/accessControl.js';
import {
  getSalaryComponents,
  createSalaryComponent,
  getSalaryStructures,
  createSalaryStructure,
  assignEmployeeSalaryStructure,
} from '../modules/payroll/salaryStructureController.js';
import {
  getPfConfig,
  updatePfConfig,
  getEsicConfig,
  updateEsicConfig,
  getProfessionalTaxSlabs,
  createProfessionalTaxSlab,
  getLoansAdvancement,
  createLoanAdvancement,
} from '../modules/payroll/statutoryController.js';
import {
  validatePayrollReadiness,
  calculateMonthlyPayroll,
  getPayrollRuns,
  getPayrollRunById,
  updatePayrollRunStatus,
} from '../modules/payroll/payrollRunController.js';
import { getPayslipById } from '../modules/payroll/payslipGenerator.js';
import {
  downloadPayslipPdfHandler,
  getMyPayslipsHandler,
  getPayrollSettingsHandler,
  runAutomationNowHandler,
  sendRunPayslipsHandler,
  updatePayrollSettingsHandler,
} from '../modules/payroll/payrollAutomationController.js';
import {
  generateBankTransferBatch,
  getBankTransferBatch,
  updateBankPaymentStatus,
} from '../modules/payroll/bankTransferController.js';
import {
  calculateFullAndFinalSettlement,
  getFfSettlements,
  approveFfSettlement,
} from '../modules/payroll/ffSettlementController.js';
import { getPayrollReport } from '../modules/payroll/payrollReportsController.js';
import {
  getReimbursements,
  createReimbursement,
  approveReimbursement,
  getFbpDeclarations,
  saveFbpDeclaration,
  getSalaryArrears,
  createSalaryArrear,
} from '../modules/payroll/upcomingPayrollController.js';
import {
  uploadMiddleware,
  uploadSingleMiddleware,
  validateSalarySlipExcel,
  sendSingleSalarySlip,
  sendBulkSalarySlips,
  retryFailedSalarySlips,
  getSalarySlipLogs,
} from '../modules/payroll/salarySlipController.js';

export const payrollRouter = Router();

payrollRouter.use(authenticateToken);

// Salary Components & Structures
payrollRouter.get('/components', requireHr, getSalaryComponents);
payrollRouter.post('/components', requireRole(['admin', 'employer']), createSalaryComponent);
payrollRouter.get('/structures', requireHr, getSalaryStructures);
payrollRouter.post('/structures', requireRole(['admin', 'employer']), createSalaryStructure);
payrollRouter.post('/assign-structure', requireRole(['admin', 'employer']), assignEmployeeSalaryStructure);

// Statutory Configurations
payrollRouter.get('/statutory/pf', requireHr, getPfConfig);
payrollRouter.put('/statutory/pf', requireRole(['admin']), updatePfConfig);
payrollRouter.get('/statutory/esic', requireHr, getEsicConfig);
payrollRouter.put('/statutory/esic', requireRole(['admin']), updateEsicConfig);
payrollRouter.get('/statutory/pt', requireHr, getProfessionalTaxSlabs);
payrollRouter.post('/statutory/pt', requireRole(['admin']), createProfessionalTaxSlab);

// Loans & Advances
payrollRouter.get('/loans', requireHr, getLoansAdvancement);
payrollRouter.post('/loans', requireRole(['admin', 'employer']), createLoanAdvancement);

// Upcoming Payroll Modules: Reimbursements, FBP & Salary Arrears
payrollRouter.get('/reimbursements', getReimbursements);
payrollRouter.post('/reimbursements', createReimbursement);
payrollRouter.put('/reimbursements/:id/approve', requireRole(['admin', 'employer']), approveReimbursement);
payrollRouter.get('/fbp', getFbpDeclarations);
payrollRouter.post('/fbp', saveFbpDeclaration);
payrollRouter.get('/arrears', requireHr, getSalaryArrears);
payrollRouter.post('/arrears', requireRole(['admin', 'employer']), createSalaryArrear);

// Monthly Payroll Runs Engine
payrollRouter.get('/validate-readiness', requireHr, validatePayrollReadiness);
payrollRouter.post('/calculate', requireRole(['admin', 'employer']), calculateMonthlyPayroll);
payrollRouter.get('/runs', requireHr, getPayrollRuns);
payrollRouter.get('/runs/:id', requireHr, getPayrollRunById);
payrollRouter.put('/runs/:id/status', requireRole(['admin', 'employer']), updatePayrollRunStatus);

// Payroll policy + salary-day automation
payrollRouter.get('/settings', requireRole(['admin', 'employer']), getPayrollSettingsHandler);
payrollRouter.put('/settings', requireRole(['admin', 'employer']), updatePayrollSettingsHandler);
payrollRouter.post('/automation/run-now', requireRole(['admin', 'employer']), runAutomationNowHandler);
payrollRouter.post('/runs/:id/send-payslips', requireRole(['admin', 'employer']), sendRunPayslipsHandler);

// Payslips
payrollRouter.get('/my-payslips', getMyPayslipsHandler);
payrollRouter.get('/payslip/:itemId/pdf', downloadPayslipPdfHandler);
payrollRouter.get('/payslip/:itemId', getPayslipById);

// Bank Transfer Disbursement
payrollRouter.post('/bank-transfer/generate', requireRole(['admin', 'employer']), generateBankTransferBatch);
payrollRouter.get('/bank-transfer', requireHr, getBankTransferBatch);
payrollRouter.put('/bank-transfer/:id/status', requireRole(['admin', 'employer']), updateBankPaymentStatus);

// Full & Final Settlement (F&F)
payrollRouter.post('/ff-settlement/calculate', requireRole(['admin', 'employer']), calculateFullAndFinalSettlement);
payrollRouter.get('/ff-settlement', requireHr, getFfSettlements);
payrollRouter.put('/ff-settlement/:id/approve', requireRole(['admin', 'employer']), approveFfSettlement);

// HR & Payroll Reports
payrollRouter.get('/reports', requireHr, getPayrollReport);

// Excel Bulk Salary Slips (Preserved legacy routes)
payrollRouter.post('/salary-slips/validate-excel', requireHr, uploadMiddleware, validateSalarySlipExcel);
payrollRouter.post('/salary-slips/send-single', requireHr, uploadSingleMiddleware, sendSingleSalarySlip);
payrollRouter.post('/salary-slips/send-bulk', requireHr, sendBulkSalarySlips);
payrollRouter.post('/salary-slips/retry-failed', requireHr, retryFailedSalarySlips);
payrollRouter.get('/salary-slips/logs', requireHr, getSalarySlipLogs);
