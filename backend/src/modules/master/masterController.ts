import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Get All Master Departments
 */
export async function getMasterDepartments(req: Request, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT d.id, d.name, d.code, d.head_name as headName, d.description,
              (SELECT COUNT(*) FROM employee_profiles ep WHERE ep.department_name = d.name) as employeeCount,
              (SELECT COUNT(*) FROM master_teams t WHERE t.department_id = d.id) as teamsCount
       FROM master_departments d
       ORDER BY d.name ASC`
    );
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
    const { name, code, headName, description } = req.body;
    if (!name || !code) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Department Name and Code are required.' } });
      return;
    }

    const deptId = uuidv4();
    await pool.query(
      'INSERT INTO master_departments (id, name, code, head_name, description) VALUES (?, ?, ?, ?, ?)',
      [deptId, name.trim(), code.trim().toUpperCase(), headName || null, description || null]
    );

    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: { id: deptId, name: name.trim(), code: code.trim().toUpperCase(), headName, description }
    });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Department with this Name or Code already exists.' } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create department.' } });
  }
}

/**
 * Update Master Department
 */
export async function updateMasterDepartment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, code, headName, description } = req.body;

    if (!name || !code) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Department Name and Code are required.' } });
      return;
    }

    await pool.query(
      'UPDATE master_departments SET name = ?, code = ?, head_name = ?, description = ? WHERE id = ?',
      [name.trim(), code.trim().toUpperCase(), headName || null, description || null, id]
    );

    res.json({ success: true, message: 'Department updated successfully in database.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update department.' } });
  }
}

/**
 * Delete Master Department
 */
export async function deleteMasterDepartment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM master_departments WHERE id = ?', [id]);
    await pool.query('DELETE FROM master_teams WHERE department_id = ?', [id]);
    res.json({ success: true, message: 'Department deleted successfully from database.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete department.' } });
  }
}

/**
 * Get All Master Teams
 */
export async function getMasterTeams(req: Request, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT t.id, t.department_id as departmentId, t.department_name as departmentName,
              t.name, t.leader_name as leaderName,
              (SELECT COUNT(*) FROM employee_profiles ep WHERE ep.department_name = t.department_name) as memberCount
       FROM master_teams t
       ORDER BY t.name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch teams.' } });
  }
}

/**
 * Create Master Team
 */
export async function createMasterTeam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, departmentId, leaderName } = req.body;
    if (!name || !departmentId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Team Name and Department are required.' } });
      return;
    }

    const [depts]: any = await pool.query('SELECT name FROM master_departments WHERE id = ?', [departmentId]);
    const deptName = depts.length > 0 ? depts[0].name : '';

    const teamId = uuidv4();
    await pool.query(
      'INSERT INTO master_teams (id, department_id, department_name, name, leader_name) VALUES (?, ?, ?, ?, ?)',
      [teamId, departmentId, deptName, name.trim(), leaderName || null]
    );

    res.status(201).json({
      success: true,
      message: 'Team created successfully.',
      data: { id: teamId, departmentId, departmentName: deptName, name: name.trim(), leaderName }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create team.' } });
  }
}

/**
 * Update Master Team
 */
export async function updateMasterTeam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, departmentId, leaderName } = req.body;

    if (!name || !departmentId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Team Name and Department are required.' } });
      return;
    }

    const [depts]: any = await pool.query('SELECT name FROM master_departments WHERE id = ?', [departmentId]);
    const deptName = depts.length > 0 ? depts[0].name : '';

    await pool.query(
      'UPDATE master_teams SET department_id = ?, department_name = ?, name = ?, leader_name = ? WHERE id = ?',
      [departmentId, deptName, name.trim(), leaderName || null, id]
    );

    res.json({ success: true, message: 'Team updated successfully in database.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update team.' } });
  }
}

/**
 * Delete Master Team
 */
export async function deleteMasterTeam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM master_teams WHERE id = ?', [id]);
    res.json({ success: true, message: 'Team deleted successfully from database.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete team.' } });
  }
}

/**
 * Get Team Members
 */
export async function getTeamMembers(req: Request, res: Response): Promise<void> {
  try {
    const { teamId } = req.params;
    const [teams]: any = await pool.query('SELECT department_name FROM master_teams WHERE id = ?', [teamId]);
    const deptName = teams.length > 0 ? teams[0].department_name : '';

    const [rows]: any = await pool.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email, u.profile_photo as profilePhoto,
              ep.designation, ep.department_name as departmentName
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.role = 'employee' AND (ep.department_name = ? OR ep.department_name LIKE ?)`,
      [deptName, `%${deptName}%`]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch team members.' } });
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
