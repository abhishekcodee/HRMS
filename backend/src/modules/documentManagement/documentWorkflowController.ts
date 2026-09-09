import { Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';
import { resolveTemplateVariables } from './variableResolver.js';
import { generateDocumentReferenceNumber } from './numberingEngine.js';
import { logSecurityEvent, extractReqSecurityContext } from '../../security/securityAuditLogger.js';

export async function generateDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      employeeId,
      documentTypeId,
      templateId,
      customTitle,
      salaryData,
      customVariables,
    } = req.body;

    if (!employeeId || !documentTypeId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employeeId and documentTypeId are required.' } });
      return;
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;
    const companyId = (req.user as any)?.companyId || 'default-company';

    // 1. Fetch Employee Details
    const [empRows]: any = await pool.query(
      `SELECT u.id as user_id, u.full_name, u.email, u.employee_id as employee_code,
              ep.designation, ep.department_name, ep.joining_date, ep.dob,
              ep.branch_name, ep.salary, ep.manager_name
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.id = ? OR u.employee_id = ?`,
      [employeeId, employeeId]
    );

    if (empRows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Target employee not found.' } });
      return;
    }

    const emp = empRows[0];

    // 2. Fetch Document Type & Template
    const [typeRows]: any = await pool.query(
      `SELECT dt.id, dt.name, dt.code, dt.requires_approval, dt.requires_signature, dt.approval_chain_json
       FROM document_types dt WHERE dt.id = ?`,
      [documentTypeId]
    );

    if (typeRows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document Type not found.' } });
      return;
    }

    const docType = typeRows[0];

    let tplId = templateId;
    let versionId: string | null = null;
    let versionNum = 1;
    let templateContent = `<h1>${docType.name}</h1><p>Dear {{employee_name}},</p><p>This is your official ${docType.name}.</p>`;
    let signatoryName = 'Head of Human Resources';
    let signatoryDesignation = 'HR Manager';

    if (!tplId) {
      const [defaultTpl]: any = await pool.query(
        `SELECT id, current_version_id, current_version_number FROM document_templates 
         WHERE document_type_id = ? AND is_active = 1 LIMIT 1`,
        [documentTypeId]
      );
      if (defaultTpl.length > 0) {
        tplId = defaultTpl[0].id;
      }
    }

    if (tplId) {
      const [tplVerRows]: any = await pool.query(
        `SELECT dtv.id, dtv.version_number, dtv.content, dtv.signatory_name, dtv.signatory_designation
         FROM document_templates dt
         JOIN document_template_versions dtv ON dtv.id = dt.current_version_id
         WHERE dt.id = ?`,
        [tplId]
      );

      if (tplVerRows.length > 0) {
        versionId = tplVerRows[0].id;
        versionNum = tplVerRows[0].version_number;
        templateContent = tplVerRows[0].content;
        if (tplVerRows[0].signatory_name) signatoryName = tplVerRows[0].signatory_name;
        if (tplVerRows[0].signatory_designation) signatoryDesignation = tplVerRows[0].signatory_designation;
      }
    }

    // 3. Generate Reference Number
    const refNumber = await generateDocumentReferenceNumber(companyId, docType.code, docType.code.slice(0, 4));

    // 4. Fetch Company Details
    const [compRows]: any = await pool.query(
      `SELECT name, registered_address, email, phone, logo_path FROM companies WHERE id = ? OR deleted_at IS NULL LIMIT 1`,
      [companyId]
    );

    const comp = compRows.length > 0 ? compRows[0] : { name: 'Acme Global Pvt. Ltd.', registered_address: 'Main Office' };

    // 5. Variable Resolution
    const resolvedHtml = resolveTemplateVariables(templateContent, {
      employee: {
        name: emp.full_name,
        id: emp.user_id,
        code: emp.employee_code,
        designation: emp.designation || 'Staff',
        department: emp.department_name || 'General',
        joiningDate: emp.joining_date || 'N/A',
        dob: emp.dob || 'N/A',
        workLocation: emp.branch_name || 'HQ',
        reportingManager: emp.manager_name || 'N/A',
      },
      company: {
        name: comp.name,
        address: comp.registered_address,
        email: comp.email,
        phone: comp.phone,
        logoUrl: comp.logo_path,
      },
      salary: salaryData || {
        monthlySalary: emp.salary || 0,
        annualCtc: emp.salary ? Number(emp.salary) * 12 : 0,
      },
      document: {
        date: new Date().toISOString().split('T')[0],
        number: refNumber,
      },
      hr: {
        name: signatoryName,
        designation: signatoryDesignation,
      },
    });

    // 6. Compute Cryptographic SHA-256 Hash
    const docHash = crypto.createHash('sha256').update(resolvedHtml).digest('hex');

    const docId = uuidv4();
    const mockPdfPath = `/uploads/documents/${docId}.pdf`;
    const docTitle = customTitle || `${docType.name} - ${emp.full_name} (${refNumber})`;
    const initialStatus = docType.requires_approval ? 'SUBMITTED' : 'FINAL';

    await pool.query(
      `INSERT INTO documents (
        id, company_id, employee_id, document_type_id, template_id, template_version_id,
        template_version_number, reference_number, title, status, html_snapshot, pdf_path,
        file_size, document_hash, generated_by, approved_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docId,
        companyId,
        emp.user_id,
        documentTypeId,
        tplId || null,
        versionId || null,
        versionNum,
        refNumber,
        docTitle,
        initialStatus,
        resolvedHtml,
        mockPdfPath,
        '1.5 MB',
        docHash,
        userId || null,
        initialStatus === 'FINAL' ? new Date() : null,
      ]
    );

    // If approval required, seed approval workflow steps
    if (docType.requires_approval) {
      await pool.query(
        `INSERT INTO document_approvals (id, document_id, step_order, approver_role_id, status)
         VALUES (?, ?, 1, 'admin', 'PENDING')`,
        [uuidv4(), docId]
      );
    }

    const ctx = extractReqSecurityContext(req);
    await logSecurityEvent({
      ...ctx,
      action: 'DOCUMENT_GENERATED',
      resourceType: 'DOCUMENT',
      resourceId: docId,
      metadata: { refNumber, docTitle, status: initialStatus, hash: docHash },
    });

    res.status(201).json({
      success: true,
      message: docType.requires_approval
        ? 'Document drafted and submitted for approval.'
        : 'Document generated and finalized successfully.',
      documentId: docId,
      referenceNumber: refNumber,
      status: initialStatus,
      documentHash: docHash,
    });
  } catch (error: any) {
    logger.error('Generate Document Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to generate document.' } });
  }
}

export async function approveDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'APPROVE' | 'REJECT'
    const userId = req.user?.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Action must be APPROVE or REJECT.' } });
      return;
    }

    const [docRows]: any = await pool.query(`SELECT id, status, title FROM documents WHERE id = ?`, [id]);
    if (docRows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found.' } });
      return;
    }

    const newStatus = action === 'APPROVE' ? 'FINAL' : 'REJECTED';

    await pool.query(
      `UPDATE documents SET status = ?, approved_at = ? WHERE id = ?`,
      [newStatus, action === 'APPROVE' ? new Date() : null, id]
    );

    await pool.query(
      `UPDATE document_approvals SET status = ?, comments = ?, action_at = NOW(), approver_user_id = ?
       WHERE document_id = ? AND status = 'PENDING'`,
      [action === 'APPROVE' ? 'APPROVED' : 'REJECTED', comments || null, userId, id]
    );

    const ctx = extractReqSecurityContext(req);
    await logSecurityEvent({
      ...ctx,
      action: action === 'APPROVE' ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
      resourceType: 'DOCUMENT',
      resourceId: id,
      metadata: { comments, newStatus },
    });

    res.json({ success: true, message: `Document ${action === 'APPROVE' ? 'approved and finalized' : 'rejected'}.`, status: newStatus });
  } catch (error: any) {
    logger.error('Approve Document Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to process document approval.' } });
  }
}
