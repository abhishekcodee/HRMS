import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { authenticateToken, AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { isHr, isSelf } from '../../security/accessControl.js';

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

/**
 * Company-level document work (companies, statutory settings, numbering, salary components, appointment and
 * termination letters) is HR-only. Employees may only read their own letters and manage their own uploads.
 */
router.use((req: AuthRequest, res: Response, next) => {
  if (isHr(req)) return next();
  const path = req.path;
  const ownLetter = path.match(/^\/(?:appointment-letters|termination-letters)\/employee\/([^/]+)$/);
  if (req.method === 'GET' && ownLetter) {
    return isSelf(req, decodeURIComponent(ownLetter[1])) ? next() : void res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view your own letters.' } });
  }
  const selfService =
    path === '/' ||
    (/^\/[^/]+$/.test(path) && req.method === 'DELETE') ||
    (/^\/[^/]+\/download$/.test(path) && req.method === 'GET');
  const readOnlyLookups = req.method === 'GET' && ['/salary-presets', '/appointment-letters/templates/default'].includes(path);
  if (selfService || readOnlyLookups) return next();
  res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only HR or company administrators can do this.' } });
});

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
 * Employee documents vault.
 * Files are kept on the server in a private folder (never under the public /uploads static route) and are only
 * served through GET /:id/download, which checks that the caller is the owner or HR of the owner's company.
 */
const DOCUMENT_STORAGE_DIR = path.resolve(process.env.DOCUMENT_STORAGE_DIR || path.join(process.cwd(), 'storage', 'documents'));
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain',
};

const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdir(DOCUMENT_STORAGE_DIR, { recursive: true }, (err) => cb(err, DOCUMENT_STORAGE_DIR));
    },
    // The stored name is random; the original name is never used as a path
    filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_DOCUMENT_TYPES[ext]) return cb(null, true);
    cb(new Error('UNSUPPORTED_TYPE'));
  },
});

/** Runs multer and turns its errors into clear JSON responses. */
function receiveDocumentFile(req: AuthRequest, res: Response, next: () => void) {
  documentUpload.single('file')(req as any, res as any, (err: any) => {
    if (!err) return next();
    const message =
      err?.code === 'LIMIT_FILE_SIZE'
        ? 'The file is larger than 10 MB.'
        : err?.message === 'UNSUPPORTED_TYPE'
          ? 'Only PDF, Word, Excel, PNG, JPG and TXT files can be uploaded.'
          : 'The file could not be received. Please try again.';
    res.status(400).json({ success: false, error: { code: 'INVALID_FILE', message } });
  });
}

const formatFileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Resolves a stored file name to a path inside the storage folder, or null for legacy/invalid records. */
function storedFilePath(fileUrl: string | null | undefined): string | null {
  if (!fileUrl || !fileUrl.startsWith('stored:')) return null;
  const name = path.basename(fileUrl.slice('stored:'.length));
  const full = path.join(DOCUMENT_STORAGE_DIR, name);
  return full.startsWith(DOCUMENT_STORAGE_DIR + path.sep) ? full : null;
}

const removeFileQuietly = (filePath?: string | null) => {
  if (filePath) fs.unlink(filePath, () => undefined);
};

/** Loads a document with its owner's company, if the caller may access it. */
async function findAccessibleDocument(req: AuthRequest, id: string) {
  const [rows]: any = await pool.query(
    `SELECT ed.id, ed.user_id AS userId, ed.title, ed.file_url AS fileUrl, u.company_id AS companyId
       FROM employee_documents ed JOIN users u ON u.id = ed.user_id
      WHERE ed.id = ?`,
    [id]
  );
  const doc = rows?.[0];
  if (!doc) return null;
  if (isHr(req)) {
    const superAdminGlobal = req.isSuperAdmin && !req.tenantId;
    return superAdminGlobal || doc.companyId === getTenantId(req) ? doc : null;
  }
  return doc.userId === req.user?.id ? doc : null;
}

/**
 * List documents (HR sees its company's documents; an employee sees their own)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    let query = `
      SELECT ed.id, ed.title, ed.document_type as category, ed.file_size as fileSize, ed.uploaded_at as uploadedAt,
             ed.user_id as userId, u.full_name as employeeName, u.employee_id as employeeCode,
             (ed.file_url LIKE 'stored:%') as hasFile
      FROM employee_documents ed
      JOIN users u ON u.id = ed.user_id
    `;
    const params: any[] = [];

    if (!isHr(req)) {
      query += ` WHERE ed.user_id = ?`;
      params.push(req.user?.id);
    } else if (!(req.isSuperAdmin && !req.tenantId)) {
      query += ` WHERE u.company_id = ?`;
      params.push(getTenantId(req));
    }

    query += ` ORDER BY ed.uploaded_at DESC`;

    const [rows]: any = await pool.query(query, params);
    res.json({
      success: true,
      data: rows.map((r: any) => ({ ...r, hasFile: Boolean(Number(r.hasFile)) })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch documents.' } });
  }
});

/**
 * Upload a document (multipart/form-data: file, title, category, and for HR an optional employeeId).
 * HR may file a document for any employee of its company; everyone else uploads only for themselves.
 */
router.post('/', receiveDocumentFile, async (req: AuthRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  try {
    const title = String(req.body?.title || '').trim();
    const category = String(req.body?.category || '').trim();
    const requestedOwner = String(req.body?.employeeId || '').trim();

    if (!file) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please choose a file to upload.' } });
      return;
    }
    if (!title || !category) {
      removeFileQuietly(file.path);
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title and Category are required.' } });
      return;
    }
    if (title.length > 255 || category.length > 100) {
      removeFileQuietly(file.path);
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title or category is too long.' } });
      return;
    }

    let ownerId = req.user?.id as string;
    if (requestedOwner && requestedOwner !== ownerId) {
      if (!isHr(req)) {
        removeFileQuietly(file.path);
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only upload documents for yourself.' } });
        return;
      }
      const [owners]: any = await pool.query(`SELECT id, company_id AS companyId FROM users WHERE id = ?`, [requestedOwner]);
      const owner = owners?.[0];
      const superAdminGlobal = req.isSuperAdmin && !req.tenantId;
      if (!owner || (!superAdminGlobal && owner.companyId !== getTenantId(req))) {
        removeFileQuietly(file.path);
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found in this company.' } });
        return;
      }
      ownerId = owner.id;
    }

    const docId = uuidv4();
    await pool.query(
      `INSERT INTO employee_documents (id, user_id, title, document_type, file_url, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [docId, ownerId, title, category, `stored:${path.basename(file.path)}`, formatFileSize(file.size)]
    );

    res.status(201).json({ success: true, message: 'Document uploaded.', data: { id: docId } });
  } catch (error) {
    removeFileQuietly(file?.path);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to upload document.' } });
  }
});

/**
 * Download (or, with ?inline=1, view) the stored file.
 */
router.get('/:id/download', async (req: AuthRequest, res: Response) => {
  try {
    const doc = await findAccessibleDocument(req, req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found.' } });
      return;
    }
    const filePath = storedFilePath(doc.fileUrl);
    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        error: { code: 'FILE_MISSING', message: 'The file for this document is not on the server. Please upload it again.' },
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const safeTitle = String(doc.title).replace(/[^\w .()-]+/g, '_').trim().slice(0, 120) || 'document';
    const downloadName = safeTitle.toLowerCase().endsWith(ext) ? safeTitle : `${safeTitle}${ext}`;
    const inline = req.query.inline === '1' && ['.pdf', '.png', '.jpg', '.jpeg', '.txt'].includes(ext);

    res.setHeader('Content-Type', ALLOWED_DOCUMENT_TYPES[ext] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${downloadName.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to download document.' } });
  }
});

/**
 * Delete a document and its file (employees: their own; HR: its company's)
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const doc = await findAccessibleDocument(req, req.params.id);
    if (!doc) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found.' } });
      return;
    }
    await pool.query(`DELETE FROM employee_documents WHERE id = ?`, [doc.id]);
    removeFileQuietly(storedFilePath(doc.fileUrl));
    res.json({ success: true, message: 'Document deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete document.' } });
  }
});

export const documentsModule = {
  name: 'documents',
  version: '1.0.0',
  router,
};
