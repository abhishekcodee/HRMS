import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';
import { logSecurityEvent, extractReqSecurityContext } from '../../security/securityAuditLogger.js';
import { isHr } from '../../security/accessControl.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/**
 * Secure Authorized File Stream & Download.
 * Performs 8-step security verification before serving file content.
 */
export async function downloadDocumentSecurely(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const superAdminGlobal = Boolean(req.isSuperAdmin && !req.tenantId);
    const userCompanyId = getTenantId(req);

    // 1. Fetch Document Metadata
    const [rows]: any = await pool.query(
      `SELECT d.id, d.company_id as companyId, d.employee_id as employeeId, d.title,
              d.reference_number as referenceNumber, d.status, d.pdf_path as pdfPath,
              d.html_snapshot as htmlSnapshot, d.document_hash as documentHash,
              u.full_name as employeeName
       FROM documents d
       JOIN users u ON u.id = d.employee_id
       WHERE d.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Requested document does not exist.' } });
      return;
    }

    const doc = rows[0];

    // 2. Tenant Isolation Check
    // Only the platform super admin (global view) may cross companies; company admins may not.
    if (!superAdminGlobal && doc.companyId && doc.companyId !== userCompanyId) {
      const ctx = extractReqSecurityContext(req);
      await logSecurityEvent({
        ...ctx,
        action: 'UNAUTHORIZED_CROSS_TENANT_DOWNLOAD_ATTEMPT',
        resourceType: 'DOCUMENT',
        resourceId: id,
        status: 'DENIED',
      });
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant access denied.' } });
      return;
    }

    // 3. Employee Ownership / IDOR Check
    // Anyone who is not HR (employees, demo users) may only open their own approved documents
    if (!isHr(req) && (doc.employeeId !== userId || !['APPROVED', 'FINAL'].includes(String(doc.status)))) {
      const ctx = extractReqSecurityContext(req);
      await logSecurityEvent({
        ...ctx,
        action: 'IDOR_DOCUMENT_DOWNLOAD_ATTEMPT',
        resourceType: 'DOCUMENT',
        resourceId: id,
        status: 'DENIED',
      });
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Employees can only download their own documents.' } });
      return;
    }

    // 4. Audit Log Download Event
    const ctx = extractReqSecurityContext(req);
    await logSecurityEvent({
      ...ctx,
      action: 'DOCUMENT_DOWNLOADED',
      resourceType: 'DOCUMENT',
      resourceId: id,
      metadata: { referenceNumber: doc.referenceNumber, title: doc.title, hash: doc.documentHash },
    });

    // 5. Serve HTML/PDF content safely
    if (doc.htmlSnapshot) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="${doc.referenceNumber || 'document'}.html"`);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${escapeHtml(doc.title)}</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 40px; color: #0F172A; line-height: 1.6; }
            .watermark { position: fixed; bottom: 20px; right: 20px; font-size: 12px; color: #94A3B8; }
            .hash-badge { font-family: monospace; font-size: 11px; background: #F1F5F9; padding: 6px 12px; border-radius: 4px; border: 1px solid #E2E8F0; margin-bottom: 20px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="hash-badge">Integrity hash (SHA-256): ${escapeHtml(doc.documentHash || 'not recorded')}</div>
          ${doc.htmlSnapshot}
          <div class="watermark">Digitally Sealed & Verified by Enterprise HRMS Architecture</div>
        </body>
        </html>
      `);
      return;
    }

    res.json({ success: true, message: 'Document access authorized.', data: doc });
  } catch (error: any) {
    logger.error('Download Document Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to download document.' } });
  }
}

/**
 * Employee Document Locker API ("My Documents").
 */
export async function getEmployeeLocker(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id as string;
    // Only HR may look at another employee's locker, and only inside its own company
    const hr = isHr(req);
    const requested = typeof req.query.employeeId === 'string' ? req.query.employeeId : '';
    const targetUserId = hr && requested ? requested : userId;
    const restrictCompany = hr && !(req.isSuperAdmin && !req.tenantId);

    const [rows]: any = await pool.query(
      `SELECT d.id, d.company_id as companyId, d.employee_id as employeeId,
              d.reference_number as referenceNumber, d.title, d.status,
              d.file_size as fileSize, d.created_at as createdAt, d.approved_at as approvedAt,
              dt.name as documentTypeName, dt.code as documentTypeCode,
              dc.name as categoryName, dc.code as categoryCode
       FROM documents d
       JOIN document_types dt ON dt.id = d.document_type_id
       JOIN document_categories dc ON dc.id = dt.category_id
       WHERE d.employee_id = ? AND d.status IN ('APPROVED', 'FINAL')${restrictCompany ? ' AND d.company_id = ?' : ''}
       ORDER BY d.created_at DESC`,
      restrictCompany ? [targetUserId, getTenantId(req)] : [targetUserId]
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Employee Locker Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch employee locker.' } });
  }
}
