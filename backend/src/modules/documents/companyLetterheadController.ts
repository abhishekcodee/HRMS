import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';

export interface LetterheadMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const DEFAULT_MARGINS: LetterheadMargins = {
  top: 48,
  bottom: 60,
  left: 20,
  right: 20,
};

/**
 * Resolves active company ID for multi-tenant isolation
 */
export function getTenantCompanyId(req: AuthRequest): string {
  return (req as any).user?.companyId || (req.query?.company_id as string) || (req.body?.company_id as string) || 'cmp-default-001';
}

/**
 * 1. GET /api/v1/document-management/letterhead/active — Fetch active company letterhead
 */
export async function getActiveCompanyLetterhead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantCompanyId(req);

    const [rows]: any = await pool.query(
      `SELECT id, company_id as companyId, file_name as fileName, file_path as filePath, 
              file_type as fileType, file_size as fileSize, version, is_active as isActive, 
              margins_json as marginsJson, uploaded_by as uploadedBy, created_at as createdAt 
       FROM company_letterheads 
       WHERE company_id = ? AND is_active = 1 
       ORDER BY version DESC LIMIT 1`,
      [companyId]
    );

    const [settingsRows]: any = await pool.query(
      `SELECT require_letterhead as requireLetterhead, allow_hr_replace as allowHrReplace, 
              allow_hr_edit_company_details as allowHrEditCompanyDetails 
       FROM company_letterhead_settings 
       WHERE company_id = ? LIMIT 1`,
      [companyId]
    );

    const settings = settingsRows.length > 0 ? settingsRows[0] : {
      requireLetterhead: false,
      allowHrReplace: true,
      allowHrEditCompanyDetails: true,
    };

    if (rows.length === 0) {
      res.json({
        success: true,
        data: {
          id: 'default-active',
          version: 1,
          fileName: 'Standard Corporate Letterhead',
          fileType: 'PDF',
          fileSize: 0,
          isActive: 1,
          createdAt: new Date().toISOString(),
          margins: DEFAULT_MARGINS,
          fileUrl: null,
        },
        settings,
        message: 'Using standard company letterhead defaults with 60mm bottom margin clearance.',
      });
      return;
    }

    const item = rows[0];
    let margins = DEFAULT_MARGINS;
    if (item.marginsJson) {
      try {
        margins = { ...DEFAULT_MARGINS, ...JSON.parse(item.marginsJson) };
      } catch (e) {}
    }

    res.json({
      success: true,
      data: {
        ...item,
        margins,
        fileUrl: item.filePath ? `/uploads/letterheads/${path.basename(item.filePath)}` : null,
      },
      settings,
    });
  } catch (error: any) {
    logger.error('Get Active Letterhead Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch active letterhead.' } });
  }
}

/**
 * 2. POST /api/v1/document-management/letterhead/upload — Upload & activate new letterhead version
 */
export async function uploadCompanyLetterhead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantCompanyId(req);
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Letterhead file is required (PDF, PNG, JPG, JPEG).' } });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg'];
    if (!allowedExts.includes(ext)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Only PDF, PNG, JPG, and JPEG file formats are supported.' } });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Determine highest existing version for this company
      const [verRows]: any = await conn.query(
        `SELECT MAX(version) as maxVer FROM company_letterheads WHERE company_id = ?`,
        [companyId]
      );
      const nextVersion = (verRows[0]?.maxVer || 0) + 1;

      // Deactivate previous active letterheads for this company
      await conn.query(
        `UPDATE company_letterheads SET is_active = 0 WHERE company_id = ?`,
        [companyId]
      );

      const letterheadId = uuidv4();
      const relativePath = `/uploads/letterheads/${file.filename}`;
      const defaultMarginsJson = JSON.stringify(DEFAULT_MARGINS);

      const pubDir = path.join(process.cwd(), 'public', 'uploads', 'letterheads');
      if (!fs.existsSync(pubDir)) {
        fs.mkdirSync(pubDir, { recursive: true });
      }
      const pubPath = path.join(pubDir, file.filename);
      if (fs.existsSync(file.path) && !fs.existsSync(pubPath)) {
        try {
          fs.copyFileSync(file.path, pubPath);
        } catch (e) {
          // ignore copy error
        }
      }

      await conn.query(
        `INSERT INTO company_letterheads 
          (id, company_id, file_name, file_path, file_type, file_size, version, is_active, margins_json, uploaded_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          letterheadId,
          companyId,
          file.originalname,
          relativePath,
          ext.replace('.', ''),
          file.size,
          nextVersion,
          defaultMarginsJson,
          req.user?.id || 'admin',
        ]
      );

      await conn.commit();

      res.status(201).json({
        success: true,
        message: 'Letterhead uploaded successfully. Letterhead is now active.',
        data: {
          id: letterheadId,
          companyId,
          fileName: file.originalname,
          fileUrl: relativePath,
          fileType: ext.replace('.', ''),
          version: nextVersion,
          isActive: true,
          margins: DEFAULT_MARGINS,
        },
      });
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Upload Letterhead Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to upload letterhead.' } });
  }
}

/**
 * 3. GET /api/v1/document-management/letterhead/history — Fetch letterhead version history
 */
export async function getCompanyLetterheadHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantCompanyId(req);

    const [rows]: any = await pool.query(
      `SELECT id, company_id as companyId, file_name as fileName, file_path as filePath, 
              file_type as fileType, file_size as fileSize, version, is_active as isActive, 
              margins_json as marginsJson, uploaded_by as uploadedBy, created_at as createdAt 
       FROM company_letterheads 
       WHERE company_id = ? 
       ORDER BY version DESC`,
      [companyId]
    );

    const formatted = rows.map((item: any) => ({
      ...item,
      fileUrl: item.filePath ? `/uploads/letterheads/${path.basename(item.filePath)}` : null,
    }));

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    logger.error('Get Letterhead History Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch letterhead history.' } });
  }
}

/**
 * 4. POST /api/v1/document-management/letterhead/activate/:id — Activate specific letterhead version
 */
export async function activateLetterheadVersion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantCompanyId(req);
    const { id } = req.params;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [targetRows]: any = await conn.query(
        `SELECT id, version FROM company_letterheads WHERE id = ? AND company_id = ?`,
        [id, companyId]
      );

      if (targetRows.length === 0) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Letterhead version not found for your company.' } });
        conn.release();
        return;
      }

      await conn.query(`UPDATE company_letterheads SET is_active = 0 WHERE company_id = ?`, [companyId]);
      await conn.query(`UPDATE company_letterheads SET is_active = 1 WHERE id = ? AND company_id = ?`, [id, companyId]);

      await conn.commit();

      res.json({ success: true, message: `Letterhead v${targetRows[0].version} activated successfully.` });
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Activate Letterhead Version Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to activate letterhead version.' } });
  }
}

/**
 * 5. PUT /api/v1/document-management/letterhead/margins — Update safe content area margins
 */
export async function updateLetterheadMargins(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantCompanyId(req);
    const { top = 48, bottom = 60, left = 20, right = 20 } = req.body;

    const margins: LetterheadMargins = {
      top: Number(top) || 48,
      bottom: Number(bottom) || 60,
      left: Number(left) || 20,
      right: Number(right) || 20,
    };

    const [updateResult]: any = await pool.query(
      `UPDATE company_letterheads SET margins_json = ? WHERE company_id = ? AND is_active = 1`,
      [JSON.stringify(margins), companyId]
    );

    if (updateResult.affectedRows === 0) {
      const letterheadId = uuidv4();
      await pool.query(
        `INSERT INTO company_letterheads 
          (id, company_id, file_name, file_path, file_type, file_size, version, is_active, margins_json, uploaded_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          letterheadId,
          companyId,
          'Standard Corporate Letterhead',
          '',
          'pdf',
          0,
          1,
          JSON.stringify(margins),
          req.user?.id || 'admin',
        ]
      );
    }

    res.json({ success: true, message: 'Content safe area margins updated successfully.', margins });
  } catch (error: any) {
    logger.error('Update Margins Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update margins.' } });
  }
}

/**
 * 6. GET/PUT Document Settings Policy Toggles
 */
export async function updateLetterheadSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantCompanyId(req);
    const { requireLetterhead = false, allowHrReplace = true, allowHrEditCompanyDetails = true } = req.body;

    const settingId = uuidv4();
    await pool.query(
      `INSERT INTO company_letterhead_settings 
        (id, company_id, require_letterhead, allow_hr_replace, allow_hr_edit_company_details) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
        require_letterhead = VALUES(require_letterhead), 
        allow_hr_replace = VALUES(allow_hr_replace), 
        allow_hr_edit_company_details = VALUES(allow_hr_edit_company_details)`,
      [settingId, companyId, Boolean(requireLetterhead), Boolean(allowHrReplace), Boolean(allowHrEditCompanyDetails)]
    );

    res.json({
      success: true,
      message: 'Company letterhead policy settings updated.',
      settings: { requireLetterhead, allowHrReplace, allowHrEditCompanyDetails },
    });
  } catch (error: any) {
    logger.error('Update Settings Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update settings.' } });
  }
}
