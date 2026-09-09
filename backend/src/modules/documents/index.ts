import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { authenticateToken, AuthRequest } from '../../middleware/authMiddleware.js';

import {
  getDefaultTemplate,
  saveTemplate,
  generateAppointmentLetter,
  getEmployeeAppointmentLetters,
  getAppointmentLetterById,
} from './appointmentLetterController.js';

import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getStatutorySettings,
  updateStatutorySettings,
  getLetterNumberingFormats,
  updateLetterNumberingFormat,
} from './settingsController.js';

import {
  getSalaryComponents,
  createSalaryComponent,
  getSalaryPresets,
  calculateSalaryAnnexure,
} from './salaryController.js';

import {
  getTerminationTemplates,
  draftTerminationLetter,
  submitTerminationForApproval,
  approveTerminationLetter,
  issueTerminationLetter,
  updateDeliveryRecord,
  getEmployeeTerminationLetters,
} from './terminationController.js';

const router = Router();
router.use(authenticateToken);

// Companies (Multi-Entity) Endpoints
router.get('/companies', getCompanies);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);

// Statutory Rates Settings Endpoints
router.get('/statutory-settings', getStatutorySettings);
router.put('/statutory-settings', updateStatutorySettings);

// Reference Numbering Endpoints
router.get('/letter-numbering/company/:companyId', getLetterNumberingFormats);
router.put('/letter-numbering', updateLetterNumberingFormat);

// Salary Components, Presets & Calculation Endpoints
router.get('/salary-components', getSalaryComponents);
router.post('/salary-components', createSalaryComponent);
router.get('/salary-presets', getSalaryPresets);
router.post('/salary-presets/calculate', calculateSalaryAnnexure);

// Termination Letter Endpoints (3 Variants, Attachment Validation, 2nd Approver & Delivery Record)
router.get('/termination-letters/templates', getTerminationTemplates);
router.post('/termination-letters/draft', draftTerminationLetter);
router.post('/termination-letters/:id/submit-approval', submitTerminationForApproval);
router.post('/termination-letters/:id/approve', approveTerminationLetter);
router.post('/termination-letters/:id/issue', issueTerminationLetter);
router.post('/termination-letters/:id/delivery-record', updateDeliveryRecord);
router.get('/termination-letters/employee/:employeeId', getEmployeeTerminationLetters);

// Appointment Letter Endpoints
router.get('/appointment-letters/templates/default', getDefaultTemplate);
router.post('/appointment-letters/templates', saveTemplate);
router.put('/appointment-letters/templates/:id', saveTemplate);
router.post('/appointment-letters/generate', generateAppointmentLetter);
router.get('/appointment-letters/employee/:employeeId', getEmployeeAppointmentLetters);
router.get('/appointment-letters/:id', getAppointmentLetterById);

/**
 * Get Documents (Admin/Employer sees all; Employee sees their own)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    let query = `
      SELECT ed.id, ed.title, ed.document_type as category, ed.file_url as fileUrl,
             ed.file_size as fileSize, ed.uploaded_at as uploadedAt,
             u.full_name as employeeName
      FROM employee_documents ed
      JOIN users u ON u.id = ed.user_id
    `;
    const params: any[] = [];

    if (role === 'employee') {
      query += ` WHERE ed.user_id = ?`;
      params.push(userId);
    }

    query += ` ORDER BY ed.uploaded_at DESC`;

    const [rows]: any = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch documents.' } });
  }
});

/**
 * Upload Document
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, category, fileSize } = req.body;

    if (!title || !category) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title and Category are required.' } });
      return;
    }

    const docId = uuidv4();
    const mockFileUrl = `/documents/${docId}.pdf`;

    await pool.query(
      `INSERT INTO employee_documents (id, user_id, title, document_type, file_url, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [docId, userId, title.trim(), category, mockFileUrl, fileSize || '1.2 MB']
    );

    res.status(201).json({ success: true, message: 'Document uploaded successfully to database.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to upload document.' } });
  }
});

/**
 * Delete Document
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM employee_documents WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Document deleted from database successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete document.' } });
  }
});

export const documentsModule = {
  name: 'documents',
  version: '1.0.0',
  router,
};
