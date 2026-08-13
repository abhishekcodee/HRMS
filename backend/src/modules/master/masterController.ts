import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Get All Master Departments
 */
export async function getMasterDepartments(req: Request, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query('SELECT id, name, code, description FROM master_departments ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch departments.' } });
  }
}

/**
 * Add New Master Department
 */
export async function createMasterDepartment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Department Name and Code are required.' } });
      return;
    }

    const deptId = uuidv4();
    await pool.query(
      'INSERT INTO master_departments (id, name, code, description) VALUES (?, ?, ?, ?)',
      [deptId, name.trim(), code.trim().toUpperCase(), description || null]
    );

    res.status(201).json({ success: true, message: 'Department created successfully.', data: { id: deptId, name, code, description } });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Department with this Name or Code already exists.' } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create department.' } });
  }
}

/**
 * Get All Master Designations
 */
export async function getMasterDesignations(req: Request, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query('SELECT id, name, department_id as departmentId, department_name as departmentName FROM master_designations ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch designations.' } });
  }
}

/**
 * Add New Master Designation
 */
export async function createMasterDesignation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, departmentId, departmentName } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Designation Name is required.' } });
      return;
    }

    const desigId = uuidv4();
    await pool.query(
      'INSERT INTO master_designations (id, name, department_id, department_name) VALUES (?, ?, ?, ?)',
      [desigId, name.trim(), departmentId || null, departmentName || null]
    );

    res.status(201).json({ success: true, message: 'Designation created successfully.', data: { id: desigId, name, departmentName } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create designation.' } });
  }
}

/**
 * Get All Master Branches
 */
export async function getMasterBranches(req: Request, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query('SELECT id, name, code, city, state, country FROM master_branches ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch branches.' } });
  }
}

/**
 * Get All Master Shifts
 */
export async function getMasterShifts(req: Request, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query('SELECT id, name, start_time as startTime, end_time as endTime FROM master_shifts ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch shifts.' } });
  }
}

/**
 * Get All Master Employment Types
 */
export async function getMasterEmploymentTypes(req: Request, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query('SELECT id, name, code FROM master_employment_types ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch employment types.' } });
  }
}
