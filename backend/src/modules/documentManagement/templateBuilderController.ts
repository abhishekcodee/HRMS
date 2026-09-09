import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';

export async function getDocumentTemplates(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { documentTypeId, document_type, company_id } = req.query as any;
    const companyId = (req as any).user?.companyId || company_id || 'cmp-default-001';

    let query = `
      SELECT dt.id, dt.company_id as companyId, dt.document_type_id as documentTypeId,
             dtype.name as documentTypeName, dtype.code as documentTypeCode,
             dt.name, dt.description, dt.current_version_id as currentVersionId,
             dt.current_version_number as currentVersionNumber, dt.numbering_format as numberingFormat,
             dt.is_active as isActive, dt.created_at as createdAt, dt.updated_at as updatedAt
      FROM document_templates dt
      JOIN document_types dtype ON dtype.id = dt.document_type_id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (companyId) {
      conditions.push(`(dt.company_id = ? OR dt.company_id IS NULL)`);
      params.push(companyId);
    }

    if (documentTypeId) {
      conditions.push(`dt.document_type_id = ?`);
      params.push(documentTypeId);
    } else if (document_type) {
      conditions.push(`(dtype.code = ? OR dtype.name = ?)`);
      params.push(document_type, document_type);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }
    query += ` ORDER BY dt.updated_at DESC`;

    const [rows]: any = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Document Templates Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch templates.' } });
  }
}

export async function getActiveTemplateForType(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { document_type, company_id } = req.query as any;
    const companyId = (req as any).user?.companyId || company_id || 'cmp-default-001';

    if (!document_type) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'document_type query param is required.' } });
      return;
    }

    const [templateRows]: any = await pool.query(
      `SELECT dt.id, dt.company_id as companyId, dt.document_type_id as documentTypeId,
              dtype.name as documentTypeName, dtype.code as documentTypeCode,
              dt.name, dt.description, dt.current_version_id as currentVersionId,
              dt.current_version_number as currentVersionNumber, dt.numbering_format as numberingFormat,
              dt.is_active as isActive
       FROM document_templates dt
       JOIN document_types dtype ON dtype.id = dt.document_type_id
       WHERE (dt.company_id = ? OR dt.company_id IS NULL)
         AND (dtype.code = ? OR dtype.name = ?)
         AND dt.is_active = 1
       ORDER BY dt.updated_at DESC LIMIT 1`,
      [companyId, document_type, document_type]
    );

    if (templateRows.length === 0) {
      // Return clean fallback document type template metadata
      res.json({
        success: true,
        data: {
          id: `default-${document_type.toLowerCase()}`,
          companyId,
          documentType: document_type,
          name: `Standard ${document_type} Template`,
          isActive: true,
          currentVersionNumber: 1,
          currentVersion: {
            content: `Standard ${document_type} Content Template`,
            versionNumber: 1,
          },
        },
      });
      return;
    }

    const template = templateRows[0];

    // Fetch current version details
    const [versionRows]: any = await pool.query(
      `SELECT id, version_number as versionNumber, content, css_styles as cssStyles,
              header_template as headerTemplate, footer_template as footerTemplate,
              signatory_name as signatoryName, signatory_designation as signatoryDesignation,
              signatory_signature_url as signatorySignatureUrl, company_logo_url as companyLogoUrl,
              primary_color as primaryColor, secondary_color as secondaryColor,
              change_summary as changeSummary, created_by as createdBy, created_at as createdAt
       FROM document_template_versions
       WHERE template_id = ?
       ORDER BY version_number DESC`,
      [template.id]
    );

    template.versions = versionRows;
    const currentVer = versionRows.find((v: any) => v.id === template.currentVersionId) || versionRows[0];
    template.currentVersion = currentVer;

    res.json({ success: true, data: template });
  } catch (error: any) {
    logger.error('Get Active Template Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch active template.' } });
  }
}

export async function getTemplateById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const [templateRows]: any = await pool.query(
      `SELECT dt.id, dt.company_id as companyId, dt.document_type_id as documentTypeId,
              dtype.name as documentTypeName, dtype.code as documentTypeCode,
              dt.name, dt.description, dt.current_version_id as currentVersionId,
              dt.current_version_number as currentVersionNumber, dt.numbering_format as numberingFormat,
              dt.is_active as isActive
       FROM document_templates dt
       JOIN document_types dtype ON dtype.id = dt.document_type_id
       WHERE dt.id = ?`,
      [id]
    );

    if (templateRows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found.' } });
      return;
    }

    const template = templateRows[0];

    // Fetch version history
    const [versionRows]: any = await pool.query(
      `SELECT id, version_number as versionNumber, content, css_styles as cssStyles,
              header_template as headerTemplate, footer_template as footerTemplate,
              signatory_name as signatoryName, signatory_designation as signatoryDesignation,
              signatory_signature_url as signatorySignatureUrl, company_logo_url as companyLogoUrl,
              primary_color as primaryColor, secondary_color as secondaryColor,
              change_summary as changeSummary, created_by as createdBy, created_at as createdAt
       FROM document_template_versions
       WHERE template_id = ?
       ORDER BY version_number DESC`,
      [id]
    );

    template.versions = versionRows;
    const currentVer = versionRows.find((v: any) => v.id === template.currentVersionId) || versionRows[0];
    template.currentVersion = currentVer;

    res.json({ success: true, data: template });
  } catch (error: any) {
    logger.error('Get Template By Id Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch template details.' } });
  }
}

export async function saveDocumentTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      id,
      documentTypeId,
      document_type,
      company_id,
      name,
      description,
      numberingFormat,
      content,
      cssStyles,
      headerTemplate,
      footerTemplate,
      signatoryName,
      signatoryDesignation,
      signatorySignatureUrl,
      companyLogoUrl,
      primaryColor,
      secondaryColor,
      changeSummary,
    } = req.body;

    const companyId = (req as any).user?.companyId || company_id || 'cmp-default-001';

    let resolvedDocTypeId = documentTypeId;
    if (!resolvedDocTypeId && document_type) {
      const [dtRows]: any = await pool.query(
        `SELECT id FROM document_types WHERE code = ? OR name = ? LIMIT 1`,
        [document_type, document_type]
      );
      if (dtRows.length > 0) {
        resolvedDocTypeId = dtRows[0].id;
      }
    }

    if (!resolvedDocTypeId || !name || !content) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Document Type, Template Name, and Content are required.' },
      });
      return;
    }

    const userId = req.user?.id;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      let templateId = id;
      let nextVersionNumber = 1;

      if (templateId && !templateId.startsWith('default-')) {
        // Fetch current version number for this specific template ID
        const [existing]: any = await conn.query(
          `SELECT current_version_number FROM document_templates WHERE id = ? AND (company_id = ? OR company_id IS NULL) FOR UPDATE`,
          [templateId, companyId]
        );
        if (existing.length > 0) {
          nextVersionNumber = (existing[0].current_version_number || 1) + 1;
        } else {
          templateId = uuidv4();
        }
      } else {
        templateId = uuidv4();
      }

      const [checkExists]: any = await conn.query(
        `SELECT id FROM document_templates WHERE id = ?`,
        [templateId]
      );

      if (checkExists.length === 0) {
        await conn.query(
          `INSERT INTO document_templates (id, company_id, document_type_id, name, description, numbering_format, current_version_number, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
          [templateId, companyId, resolvedDocTypeId, name.trim(), description || null, numberingFormat || null]
        );
      }

      // Create new version entry
      const versionId = uuidv4();
      await conn.query(
        `INSERT INTO document_template_versions (
          id, template_id, version_number, content, css_styles, header_template, footer_template,
          signatory_name, signatory_designation, signatory_signature_url, company_logo_url,
          primary_color, secondary_color, change_summary, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          versionId,
          templateId,
          nextVersionNumber,
          content,
          cssStyles || null,
          headerTemplate || null,
          footerTemplate || null,
          signatoryName || null,
          signatoryDesignation || null,
          signatorySignatureUrl || null,
          companyLogoUrl || null,
          primaryColor || '#1E3A5F',
          secondaryColor || '#0F172A',
          changeSummary || `Version ${nextVersionNumber} updated`,
          userId || null,
        ]
      );

      // Update template pointer to new version
      await conn.query(
        `UPDATE document_templates SET
          name = ?, description = ?, numbering_format = ?,
          current_version_id = ?, current_version_number = ?
         WHERE id = ?`,
        [name.trim(), description || null, numberingFormat || null, versionId, nextVersionNumber, templateId]
      );

      await conn.commit();
      res.status(200).json({
        success: true,
        message: `Document Template Version ${nextVersionNumber} saved successfully.`,
        templateId,
        versionId,
        versionNumber: nextVersionNumber,
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Save Document Template Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to save document template.' } });
  }
}
