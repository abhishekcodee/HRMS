import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';

/**
 * ============================================================================
 * 1. COMPANIES MANAGEMENT (MULTI-ENTITY SUPPORT)
 * ============================================================================
 */

export async function getCompanies(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, code, name, legal_suffix as legalSuffix, registered_address as registeredAddress,
              works_address as worksAddress, cin, gstin, pan, phone, email, website,
              logo_path as logoPath, signature_path as signaturePath,
              letterhead_top_margin_mm as letterheadTopMarginMm,
              letterhead_bottom_margin_mm as letterheadBottomMarginMm,
              created_at as createdAt, updated_at as updatedAt
       FROM companies
       WHERE deleted_at IS NULL
       ORDER BY name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Companies Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch companies.' } });
  }
}

export async function createCompany(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      code,
      name,
      legalSuffix = 'Pvt. Ltd.',
      registeredAddress,
      worksAddress,
      cin,
      gstin,
      pan,
      phone,
      email,
      website,
      logoPath,
      signaturePath,
      letterheadTopMarginMm = 20,
      letterheadBottomMarginMm = 20,
    } = req.body;

    if (!code || !name) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Company Code and Name are required.' } });
      return;
    }

    const companyId = uuidv4();
    await pool.query(
      `INSERT INTO companies (
        id, code, name, legal_suffix, registered_address, works_address, cin, gstin, pan,
        phone, email, website, logo_path, signature_path, letterhead_top_margin_mm, letterhead_bottom_margin_mm
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId, code.toUpperCase().trim(), name.trim(), legalSuffix, registeredAddress || null,
        worksAddress || null, cin || null, gstin || null, pan || null, phone || null,
        email || null, website || null, logoPath || null, signaturePath || null,
        letterheadTopMarginMm, letterheadBottomMarginMm
      ]
    );

    // Also seed default letter numbering format for this company
    const defaultFormats = [
      { type: 'appointment', pattern: `${code.toUpperCase()}/HR/APPT/{FY}/{SEQ:0000}` },
      { type: 'offer', pattern: `${code.toUpperCase()}/HR/OFFER/{FY}/{SEQ:0000}` },
      { type: 'confirmation', pattern: `${code.toUpperCase()}/HR/CONF/{FY}/{SEQ:0000}` },
      { type: 'relieving', pattern: `${code.toUpperCase()}/HR/REL/{FY}/{SEQ:0000}` },
    ];

    for (const fmt of defaultFormats) {
      await pool.query(
        `INSERT INTO letter_numbering (id, company_id, letter_type, format_pattern, current_counter)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE format_pattern = VALUES(format_pattern)`,
        [uuidv4(), companyId, fmt.type, fmt.pattern]
      );
    }

    res.status(201).json({ success: true, message: 'Company created successfully.', companyId });
  } catch (error: any) {
    logger.error('Create Company Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create company.' } });
  }
}

export async function updateCompany(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      legalSuffix,
      registeredAddress,
      worksAddress,
      cin,
      gstin,
      pan,
      phone,
      email,
      website,
      logoPath,
      signaturePath,
      letterheadTopMarginMm,
      letterheadBottomMarginMm,
    } = req.body;

    await pool.query(
      `UPDATE companies SET
        code = ?, name = ?, legal_suffix = ?, registered_address = ?, works_address = ?,
        cin = ?, gstin = ?, pan = ?, phone = ?, email = ?, website = ?,
        logo_path = ?, signature_path = ?, letterhead_top_margin_mm = ?, letterhead_bottom_margin_mm = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        code?.toUpperCase().trim(), name?.trim(), legalSuffix, registeredAddress || null,
        worksAddress || null, cin || null, gstin || null, pan || null, phone || null,
        email || null, website || null, logoPath || null, signaturePath || null,
        letterheadTopMarginMm || 20, letterheadBottomMarginMm || 20, id
      ]
    );

    res.json({ success: true, message: 'Company updated successfully.' });
  } catch (error: any) {
    logger.error('Update Company Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update company.' } });
  }
}

export async function deleteCompany(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE companies SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Company soft-deleted successfully.' });
  } catch (error: any) {
    logger.error('Delete Company Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete company.' } });
  }
}

/**
 * ============================================================================
 * 2. STATUTORY RATES & RULES SETTINGS
 * ============================================================================
 */

export async function getStatutorySettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, setting_key as settingKey, setting_value as settingValue, description, effective_from as effectiveFrom, updated_at as updatedAt
       FROM statutory_settings
       ORDER BY setting_key ASC`
    );

    // Convert into key-value map for easy frontend binding
    const settingsMap: Record<string, any> = {};
    rows.forEach((r: any) => {
      let parsedVal = r.settingValue;
      try {
        parsedVal = JSON.parse(r.settingValue);
      } catch {
        // Keep string
      }
      settingsMap[r.settingKey] = {
        id: r.id,
        value: parsedVal,
        description: r.description,
        effectiveFrom: r.effectiveFrom,
        updatedAt: r.updatedAt,
      };
    });

    res.json({ success: true, data: settingsMap, list: rows });
  } catch (error: any) {
    logger.error('Get Statutory Settings Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch statutory settings.' } });
  }
}

export async function updateStatutorySettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { settings } = req.body; // Map of { key: value }

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'settings object is required.' } });
      return;
    }

    const userId = req.user?.id || null;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      for (const [key, val] of Object.entries(settings)) {
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        await conn.query(
          `INSERT INTO statutory_settings (id, setting_key, setting_value, updated_by)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
          [uuidv4(), key, strVal, userId]
        );
      }

      await conn.commit();
      res.json({ success: true, message: 'Statutory settings updated successfully.' });
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Update Statutory Settings Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update statutory settings.' } });
  }
}

/**
 * ============================================================================
 * 3. REFERENCE NUMBER FORMATS
 * ============================================================================
 */

export async function getLetterNumberingFormats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { companyId } = req.params;
    const [rows]: any = await pool.query(
      `SELECT id, company_id as companyId, letter_type as letterType, format_pattern as formatPattern, current_counter as currentCounter
       FROM letter_numbering
       WHERE company_id = ?`,
      [companyId]
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Letter Numbering Formats Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch numbering formats.' } });
  }
}

export async function updateLetterNumberingFormat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { company_id, letter_type, format_pattern } = req.body;
    if (!company_id || !letter_type || !format_pattern) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'company_id, letter_type, and format_pattern are required.' } });
      return;
    }

    await pool.query(
      `INSERT INTO letter_numbering (id, company_id, letter_type, format_pattern, current_counter)
       VALUES (?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE format_pattern = VALUES(format_pattern)`,
      [uuidv4(), company_id, letter_type, format_pattern]
    );

    res.json({ success: true, message: 'Reference numbering pattern updated successfully.' });
  } catch (error: any) {
    logger.error('Update Letter Numbering Format Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update reference numbering format.' } });
  }
}
