import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';
import {
  calculateLeaveAccrual,
  AccrualPolicyConfig,
  AccrualCalculationResult,
} from './accrualEngine.js';

// Helper to validate grade integer
function parseGrade(val: any): { valid: boolean; value?: number; error?: string } {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { valid: false, error: 'Grade is required and must be a non-null integer.' };
  }
  const num = Number(val);
  if (!Number.isInteger(num)) {
    return { valid: false, error: `Grade '${val}' must be a valid integer.` };
  }
  return { valid: true, value: num };
}

// Helper to validate DOJ non-future and separation after DOJ
function validateDates(doj?: string, dos?: string): { valid: boolean; error?: string } {
  if (doj && String(doj).trim() !== '') {
    const dojDate = new Date(doj);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (dojDate > today) {
      return { valid: false, error: `Date of joining (${doj}) cannot be in the future.` };
    }

    if (dos && String(dos).trim() !== '') {
      const dosDate = new Date(dos);
      if (dosDate < dojDate) {
        return { valid: false, error: `Date of separation (${dos}) must be after date of joining (${doj}).` };
      }
    }
  }
  return { valid: true };
}

/**
 * 1. GET /api/v1/employees — Paginated employee list with filters
 */
export async function getEmployees(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, department, page = '1', limit = '10', search } = req.query;
    const p = Math.max(1, parseInt(String(page), 10));
    const l = Math.max(1, parseInt(String(limit), 10));
    const offset = (p - 1) * l;

    let query = `
      SELECT u.id, u.employee_id as emp_code, u.full_name as name, u.email, u.role, u.status,
             ep.joining_date as date_of_joining, ep.grade, ep.date_of_separation,
             ep.department_name as department, ep.designation, u.created_at, u.updated_at
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND u.status = ?`;
      params.push(String(status));
    }

    if (department) {
      query += ` AND ep.department_name = ?`;
      params.push(String(department));
    }

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.employee_id LIKE ? OR u.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(l, offset);

    const [rows]: any = await pool.query(query, params);

    // Count total records
    const [countRows]: any = await pool.query(`SELECT COUNT(*) as total FROM users u LEFT JOIN employee_profiles ep ON ep.user_id = u.id`);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: p,
        limit: l,
        total: countRows[0]?.total || rows.length,
      },
    });
  } catch (error: any) {
    logger.error('Get Employees Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch employees.' } });
  }
}

/**
 * 2. POST /api/v1/employees — Create employee with strict grade & date validations
 */
export async function createEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { emp_code, name, email, role = 'employee', date_of_joining, grade, date_of_separation, department, designation } = req.body;

    if (!emp_code || !name || !email) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'emp_code, name, and email are required.' } });
      return;
    }

    const gradeCheck = parseGrade(grade);
    if (!gradeCheck.valid) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: gradeCheck.error } });
      return;
    }

    const dateCheck = validateDates(date_of_joining, date_of_separation);
    if (!dateCheck.valid) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: dateCheck.error } });
      return;
    }

    const userId = uuidv4();
    const profileId = uuidv4();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `INSERT INTO users (id, employee_id, full_name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'argon2_dummy_hash', ?, 'active')`,
        [userId, String(emp_code).trim(), String(name).trim(), String(email).trim().toLowerCase(), role]
      );

      await conn.query(
        `INSERT INTO employee_profiles (id, user_id, department_name, designation, joining_date, grade, date_of_separation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [profileId, userId, department || null, designation || null, date_of_joining || null, gradeCheck.value, date_of_separation || null]
      );

      await conn.commit();
      res.status(201).json({
        success: true,
        message: 'Employee created successfully.',
        data: { id: userId, emp_code, name, email, grade: gradeCheck.value, date_of_joining, date_of_separation },
      });
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Create Employee Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create employee.' } });
  }
}

/**
 * 3. GET /api/v1/employees/:id — Fetch single employee
 */
export async function getEmployeeById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const [rows]: any = await pool.query(
      `SELECT u.id, u.employee_id as emp_code, u.full_name as name, u.email, u.role, u.status,
              ep.joining_date as date_of_joining, ep.grade, ep.date_of_separation,
              ep.department_name as department, ep.designation, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.id = ? OR u.employee_id = ?`,
      [id, id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found.' } });
      return;
    }

    res.json({ success: true, data: rows[0] });
  } catch (error: any) {
    logger.error('Get Employee By ID Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch employee details.' } });
  }
}

/**
 * 4. PUT /api/v1/employees/:id — Update employee
 */
export async function updateEmployee(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, date_of_joining, grade, date_of_separation, department, designation, status } = req.body;

    if (grade !== undefined) {
      const gradeCheck = parseGrade(grade);
      if (!gradeCheck.valid) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: gradeCheck.error } });
        return;
      }
    }

    const dateCheck = validateDates(date_of_joining, date_of_separation);
    if (!dateCheck.valid) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: dateCheck.error } });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (name || status) {
        await conn.query(
          `UPDATE users SET full_name = COALESCE(?, full_name), status = COALESCE(?, status) WHERE id = ? OR employee_id = ?`,
          [name || null, status || null, id, id]
        );
      }

      await conn.query(
        `UPDATE employee_profiles
         SET joining_date = COALESCE(?, joining_date),
             grade = COALESCE(?, grade),
             date_of_separation = COALESCE(?, date_of_separation),
             department_name = COALESCE(?, department_name),
             designation = COALESCE(?, designation)
         WHERE user_id = (SELECT id FROM users WHERE id = ? OR employee_id = ?)`,
        [date_of_joining || null, grade !== undefined ? Number(grade) : null, date_of_separation || null, department || null, designation || null, id, id]
      );

      await conn.commit();
      res.json({ success: true, message: 'Employee updated successfully.' });
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Update Employee Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to update employee.' } });
  }
}

/**
 * 5. POST /api/v1/employees/import — CSV bulk upload with row-level error report & transactional rollback
 */
export async function importEmployeesCsv(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { csvText, rows: inputRows } = req.body;

    let parsedRows: any[] = [];
    if (Array.isArray(inputRows)) {
      parsedRows = inputRows;
    } else if (csvText && typeof csvText === 'string') {
      const lines = csvText.trim().split('\n').filter(Boolean);
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx];
        });
        parsedRows.push(rowObj);
      }
    }

    if (parsedRows.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No valid CSV rows provided for import.' } });
      return;
    }

    const rowErrors: Array<{ row: number; empCode?: string; error: string }> = [];

    // Row-level validation phase
    parsedRows.forEach((r, idx) => {
      const rowNum = idx + 2; // Header is row 1
      const empCode = r.emp_code || r.empcode || r.employee_id;
      const name = r.name || r.full_name;
      const email = r.email;
      const grade = r.grade;
      const doj = r.date_of_joining || r.doj;
      const dos = r.date_of_separation || r.dos;

      if (!empCode) rowErrors.push({ row: rowNum, empCode: 'N/A', error: 'emp_code is required.' });
      if (!name) rowErrors.push({ row: rowNum, empCode, error: 'name is required.' });
      if (!email) rowErrors.push({ row: rowNum, empCode, error: 'email is required.' });

      const gCheck = parseGrade(grade);
      if (!gCheck.valid) {
        rowErrors.push({ row: rowNum, empCode, error: gCheck.error || 'Invalid grade.' });
      }

      const dCheck = validateDates(doj, dos);
      if (!dCheck.valid) {
        rowErrors.push({ row: rowNum, empCode, error: dCheck.error || 'Invalid dates.' });
      }
    });

    if (rowErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: { code: 'IMPORT_VALIDATION_FAILED', message: `${rowErrors.length} row(s) failed validation. Import aborted.` },
        rowErrors,
      });
      return;
    }

    // Database insertion phase (transactional)
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const r of parsedRows) {
        const empCode = String(r.emp_code || r.empcode || r.employee_id).trim();
        const name = String(r.name || r.full_name).trim();
        const email = String(r.email).trim().toLowerCase();
        const grade = parseInt(r.grade, 10);
        const doj = r.date_of_joining || r.doj || null;
        const dos = r.date_of_separation || r.dos || null;
        const department = r.department || null;

        const userId = uuidv4();
        const profileId = uuidv4();

        await conn.query(
          `INSERT INTO users (id, employee_id, full_name, email, password_hash, role, status)
           VALUES (?, ?, ?, ?, 'argon2_dummy_hash', 'employee', 'active')
           ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
          [userId, empCode, name, email]
        );

        await conn.query(
          `INSERT INTO employee_profiles (id, user_id, department_name, joining_date, grade, date_of_separation)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE joining_date = VALUES(joining_date), grade = VALUES(grade), date_of_separation = VALUES(date_of_separation)`,
          [profileId, userId, department, doj, grade, dos]
        );
      }

      await conn.commit();
      res.json({
        success: true,
        message: `Successfully imported ${parsedRows.length} employee record(s).`,
        importedCount: parsedRows.length,
      });
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Import Employees Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to import CSV.' } });
  }
}

/**
 * 6. GET /api/v1/policies — Get leave policies
 */
export async function getLeavePolicies(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, leave_type as leaveType, annual_quota as annualQuota,
              waiting_months_high as waitingMonthsHigh, waiting_months_low as waitingMonthsLow,
              grade_threshold as gradeThreshold, effective_from as effectiveFrom,
              is_active as isActive, created_at as createdAt
       FROM leave_policies
       WHERE is_active = 1
       ORDER BY leave_type ASC`
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Leave Policies Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch leave policies.' } });
  }
}

/**
 * 7. PUT /api/v1/policies/:id — Versioned policy edit (inserts new row with effectiveFrom, preserves history)
 */
export async function updateLeavePolicy(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { annual_quota, waiting_months_high, waiting_months_low, grade_threshold, effective_from } = req.body;

    const [existing]: any = await pool.query(`SELECT * FROM leave_policies WHERE id = ?`, [id]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found.' } });
      return;
    }

    const oldPolicy = existing[0];
    const newId = uuidv4();
    const effFrom = effective_from || new Date().toISOString().split('T')[0];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Deactivate old policy
      await conn.query(`UPDATE leave_policies SET is_active = 0 WHERE id = ?`, [id]);

      // Insert new versioned row
      await conn.query(
        `INSERT INTO leave_policies (
          id, leave_type, annual_quota, waiting_months_high, waiting_months_low,
          grade_threshold, effective_from, is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          newId,
          oldPolicy.leave_type,
          annual_quota !== undefined ? parseFloat(annual_quota) : oldPolicy.annual_quota,
          waiting_months_high !== undefined ? parseInt(waiting_months_high, 10) : oldPolicy.waiting_months_high,
          waiting_months_low !== undefined ? parseInt(waiting_months_low, 10) : oldPolicy.waiting_months_low,
          grade_threshold !== undefined ? parseInt(grade_threshold, 10) : oldPolicy.grade_threshold,
          effFrom,
        ]
      );

      await conn.commit();
      res.json({
        success: true,
        message: 'Policy updated with versioning (new version created, history preserved).',
        newPolicyId: newId,
      });
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Update Policy Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to update policy.' } });
  }
}

/**
 * 8. POST /api/v1/entitlements/calculate — Recalculate & upsert leave_entitlements, return per-employee breakdown
 */
export async function calculateEntitlements(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { fy_start = '2026-04-01', fy_end = '2027-03-31', employee_ids } = req.body;

    // Fetch active policies
    const [policyRows]: any = await pool.query(`SELECT * FROM leave_policies WHERE is_active = 1`);
    if (policyRows.length === 0) {
      res.status(400).json({ success: false, error: { code: 'POLICY_MISSING', message: 'No active leave policies found.' } });
      return;
    }

    // Fetch target employees
    let empQuery = `
      SELECT u.id as user_id, u.employee_id as emp_code, u.full_name as name,
             ep.joining_date as date_of_joining, ep.grade, ep.date_of_separation
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE u.status = 'active'
    `;
    const empParams: any[] = [];

    if (Array.isArray(employee_ids) && employee_ids.length > 0) {
      empQuery += ` AND (u.id IN (?) OR u.employee_id IN (?))`;
      empParams.push(employee_ids, employee_ids);
    }

    const [empRows]: any = await pool.query(empQuery, empParams);

    const breakdownResults: any[] = [];
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      for (const emp of empRows) {
        for (const pol of policyRows) {
          const policyConfig: AccrualPolicyConfig = {
            id: pol.id,
            leaveType: pol.leave_type,
            annualQuota: parseFloat(pol.annual_quota),
            waitingMonthsHigh: pol.waiting_months_high,
            waitingMonthsLow: pol.waiting_months_low,
            gradeThreshold: pol.grade_threshold,
          };

          const calcRes: AccrualCalculationResult = calculateLeaveAccrual({
            dateOfJoining: emp.date_of_joining,
            grade: emp.grade !== null && emp.grade !== undefined ? Number(emp.grade) : 0,
            policy: policyConfig,
            fyStart: fy_start,
            fyEnd: fy_end,
            dateOfSeparation: emp.date_of_separation,
          });

          // Upsert into leave_entitlements
          const entId = uuidv4();
          await conn.query(
            `INSERT INTO leave_entitlements (
              id, employee_id, leave_type, fy_start, fy_end, eligible_from,
              months_counted, raw_days, entitled_days, policy_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               eligible_from = VALUES(eligible_from),
               months_counted = VALUES(months_counted),
               raw_days = VALUES(raw_days),
               entitled_days = VALUES(entitled_days),
               policy_id = VALUES(policy_id),
               calculated_at = CURRENT_TIMESTAMP`,
            [
              entId,
              emp.user_id,
              pol.leave_type,
              fy_start,
              fy_end,
              calcRes.eligibleFrom,
              calcRes.monthsCounted || 0,
              calcRes.rawDays || 0,
              calcRes.entitledDays || 0,
              pol.id,
            ]
          );

          breakdownResults.push({
            employee_id: emp.user_id,
            emp_code: emp.emp_code,
            name: emp.name,
            leave_type: pol.leave_type,
            date_of_joining: emp.date_of_joining,
            grade: emp.grade,
            eligible_from: calcRes.eligibleFrom,
            months_counted: calcRes.monthsCounted,
            raw_days: calcRes.rawDays,
            entitled_days: calcRes.entitledDays,
          });
        }
      }

      await conn.commit();
      res.json({
        success: true,
        message: `Entitlements calculated and upserted for ${empRows.length} employee(s).`,
        fy_start,
        fy_end,
        breakdown: breakdownResults,
      });
    } catch (err: any) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    logger.error('Calculate Entitlements Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to calculate entitlements.' } });
  }
}

/**
 * 9. GET /api/v1/entitlements — List stored entitlements
 */
export async function getEntitlements(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { fy_start = '2026-04-01', leave_type } = req.query;

    let query = `
      SELECT le.id, le.employee_id, u.employee_id as emp_code, u.full_name as name,
             le.leave_type, le.fy_start, le.fy_end, le.eligible_from,
             le.months_counted, le.raw_days, le.entitled_days, le.calculated_at, le.policy_id
      FROM leave_entitlements le
      JOIN users u ON u.id = le.employee_id
      WHERE le.fy_start = ?
    `;
    const params: any[] = [String(fy_start)];

    if (leave_type) {
      query += ` AND le.leave_type = ?`;
      params.push(String(leave_type));
    }

    query += ` ORDER BY u.employee_id ASC, le.leave_type ASC`;

    const [rows]: any = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Entitlements Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch stored entitlements.' } });
  }
}

/**
 * 10. GET /api/v1/employees/:id/balance — Derived balance (entitled + carry_forward + adjustments - debits)
 */
export async function getEmployeeDerivedBalance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { fy_start = '2026-04-01' } = req.query;

    // Fetch user & employee record
    const [userRows]: any = await pool.query(`SELECT id, employee_id, full_name FROM users WHERE id = ? OR employee_id = ?`, [id, id]);
    if (userRows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found.' } });
      return;
    }
    const emp = userRows[0];

    // Fetch stored entitlements for FY
    const [entRows]: any = await pool.query(
      `SELECT leave_type, entitled_days FROM leave_entitlements WHERE employee_id = ? AND fy_start = ?`,
      [emp.id, String(fy_start)]
    );

    // Fetch all transactions for FY
    const [txRows]: any = await pool.query(
      `SELECT leave_type, type, days FROM leave_transactions WHERE employee_id = ? AND fy_start = ?`,
      [emp.id, String(fy_start)]
    );

    const leaveTypes = ['PL', 'CL'];
    const balanceResult: Record<string, any> = {};

    for (const lt of leaveTypes) {
      const ent = entRows.find((e: any) => e.leave_type === lt)?.entitled_days || 0;

      let used = 0;
      let adjusted = 0;
      let carry_forward = 0;

      txRows.filter((t: any) => t.leave_type === lt).forEach((t: any) => {
        const d = parseFloat(t.days) || 0;
        if (t.type === 'debit') used += d;
        else if (t.type === 'adjustment') adjusted += d;
        else if (t.type === 'carry_forward') carry_forward += d;
        else if (t.type === 'credit') adjusted += d;
      });

      const available = ent + carry_forward + adjusted - used;

      balanceResult[lt] = {
        leave_type: lt,
        entitled: ent,
        used,
        adjusted,
        carry_forward,
        available: Math.max(0, available),
      };
    }

    res.json({
      success: true,
      employee: { id: emp.id, emp_code: emp.employee_id, name: emp.full_name },
      fy_start,
      balances: balanceResult,
    });
  } catch (error: any) {
    logger.error('Get Derived Balance Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to calculate derived balance.' } });
  }
}

/**
 * 11. POST /api/v1/leave-transactions — Record debit / credit / adjustment / carry_forward
 */
export async function createLeaveTransaction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { employee_id, leave_type, fy_start = '2026-04-01', type, days, from_date, to_date, reason } = req.body;

    if (!employee_id || !leave_type || !type || days === undefined) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employee_id, leave_type, type, and days are required.' } });
      return;
    }

    const validTypes = ['credit', 'debit', 'adjustment', 'carry_forward'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Invalid transaction type '${type}'. Allowed: ${validTypes.join(', ')}` } });
      return;
    }

    const txId = uuidv4();
    await pool.query(
      `INSERT INTO leave_transactions (id, employee_id, leave_type, fy_start, type, days, from_date, to_date, reason, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, employee_id, leave_type, fy_start, type, parseFloat(days), from_date || null, to_date || null, reason || null, req.user?.id || null]
    );

    res.status(201).json({ success: true, message: 'Transaction recorded successfully.', transactionId: txId });
  } catch (error: any) {
    logger.error('Create Transaction Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create transaction.' } });
  }
}

/**
 * 12. GET /api/v1/leave-transactions — Filter transactions by employee_id & fy_start
 */
export async function getLeaveTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { employee_id, fy_start = '2026-04-01' } = req.query;

    let query = `SELECT id, employee_id, leave_type, fy_start, type, days, from_date, to_date, reason, created_by, created_at FROM leave_transactions WHERE fy_start = ?`;
    const params: any[] = [String(fy_start)];

    if (employee_id) {
      query += ` AND employee_id = ?`;
      params.push(String(employee_id));
    }

    query += ` ORDER BY created_at DESC`;

    const [rows]: any = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Get Transactions Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch transactions.' } });
  }
}

/**
 * 13. GET /api/v1/reports/entitlement-register — Sheet-style export (CSV + JSON) for reconciliation
 */
export async function getEntitlementRegisterReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { fy_start = '2026-04-01', format = 'json' } = req.query;

    const [rows]: any = await pool.query(
      `SELECT u.employee_id as emp_code, u.full_name as name, ep.department_name as department,
              ep.grade, ep.joining_date as date_of_joining, le.leave_type, le.eligible_from,
              le.months_counted, le.raw_days, le.entitled_days, le.calculated_at
       FROM leave_entitlements le
       JOIN users u ON u.id = le.employee_id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE le.fy_start = ?
       ORDER BY u.employee_id ASC, le.leave_type ASC`,
      [String(fy_start)]
    );

    if (String(format).toLowerCase() === 'csv') {
      let csv = 'Emp Code,Employee Name,Department,Grade,Date of Joining,Leave Type,Eligible From,Months Counted,Raw Days,Entitled Days,Calculated At\n';
      rows.forEach((r: any) => {
        csv += `"${r.emp_code}","${r.name}","${r.department || ''}",${r.grade || ''},"${r.date_of_joining || ''}","${r.leave_type}","${r.eligible_from || ''}",${r.months_counted},${r.raw_days},${r.entitled_days},"${r.calculated_at}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="entitlement-register-${fy_start}.csv"`);
      res.status(200).send(csv);
      return;
    }

    res.json({ success: true, fy_start, totalRows: rows.length, data: rows });
  } catch (error: any) {
    logger.error('Entitlement Register Report Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate report.' } });
  }
}
