import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';

export async function getDocumentCategories(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, company_id as companyId, name, code, description, is_system as isSystem, display_order as displayOrder
       FROM document_categories
       ORDER BY display_order ASC, name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Document Categories Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch categories.' } });
  }
}

export async function createDocumentCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, code, description, displayOrder } = req.body;
    if (!name || !code) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category Name and Code are required.' } });
      return;
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO document_categories (id, name, code, description, is_system, display_order)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [id, name.trim(), code.toUpperCase().trim(), description || null, displayOrder || 99]
    );

    res.status(201).json({ success: true, message: 'Custom category created successfully.', categoryId: id });
  } catch (error: any) {
    logger.error('Create Category Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create category.' } });
  }
}

export async function getDocumentTypes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT dt.id, dt.company_id as companyId, dt.category_id as categoryId, dc.name as categoryName,
              dt.name, dt.code, dt.description, dt.requires_approval as requiresApproval,
              dt.requires_signature as requiresSignature, dt.requires_employee_access as requiresEmployeeAccess,
              dt.approval_chain_json as approvalChainJson, dt.status
       FROM document_types dt
       JOIN document_categories dc ON dc.id = dt.category_id
       ORDER BY dc.display_order ASC, dt.name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Document Types Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch document types.' } });
  }
}

export async function createDocumentType(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { categoryId, name, code, description, requiresApproval, requiresSignature, requiresEmployeeAccess, approvalChain } = req.body;
    if (!categoryId || !name || !code) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Category, Name, and Code are required.' } });
      return;
    }

    const id = uuidv4();
    const chainJson = approvalChain ? JSON.stringify(approvalChain) : null;

    await pool.query(
      `INSERT INTO document_types (id, category_id, name, code, description, requires_approval, requires_signature, requires_employee_access, approval_chain_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        categoryId,
        name.trim(),
        code.toUpperCase().trim(),
        description || null,
        requiresApproval ? 1 : 0,
        requiresSignature ? 1 : 0,
        requiresEmployeeAccess !== false ? 1 : 0,
        chainJson,
      ]
    );

    res.status(201).json({ success: true, message: 'Document type created successfully.', documentTypeId: id });
  } catch (error: any) {
    logger.error('Create Document Type Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create document type.' } });
  }
}
