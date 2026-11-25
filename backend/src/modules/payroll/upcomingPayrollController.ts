import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { isHr } from '../../security/accessControl.js';

/** Company scope + ownership: HR sees its company; employees see only their own rows. */
function scope(req: AuthRequest, alias: string): { where: string; params: any[] } {
  if (isHr(req)) return { where: `WHERE u.company_id = ?`, params: [getTenantId(req)] };
  return { where: `WHERE ${alias}.employee_id = ?`, params: [req.user?.id] };
}

/** The employee a claim is for: employees can only file for themselves; HR only for their company. */
async function resolveClaimEmployee(req: AuthRequest, requested: any): Promise<string | null> {
  if (!isHr(req)) return req.user?.id || null;
  const target = requested || req.user?.id;
  const [rows]: any = await pool.query('SELECT id FROM users WHERE id = ? AND company_id = ?', [target, getTenantId(req)]);
  return rows.length ? rows[0].id : null;
}

/**
 * Get Reimbursement / Expense Claims
 */
export async function getReimbursements(req: AuthRequest, res: Response): Promise<void> {
  try {
    const sc = scope(req, 'r');
    const [rows]: any = await pool.query(
      `SELECT r.*, u.full_name as employeeName, u.employee_id as employeeCode
       FROM reimbursements r
       JOIN users u ON u.id = r.employee_id
       ${sc.where}
       ORDER BY r.created_at DESC`,
      sc.params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch reimbursements.' } });
  }
}

/**
 * Submit Reimbursement Claim
 */
export async function createReimbursement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { employeeId, category, amount, claimDate, description, receiptUrl } = req.body;
    const empId = await resolveClaimEmployee(req, employeeId);
    const amt = Number(amount);

    if (!empId || !category || !Number.isFinite(amt) || amt <= 0 || amt > 10000000) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee, category and a positive amount are required.' } });
      return;
    }

    const rId = uuidv4();
    await pool.query(
      `INSERT INTO reimbursements (id, employee_id, category, amount, claim_date, description, receipt_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [rId, empId, category, amt, claimDate || new Date().toISOString().split('T')[0], description || null, receiptUrl || null]
    );

    res.status(201).json({ success: true, message: 'Reimbursement claim submitted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit reimbursement.' } });
  }
}

/**
 * Approve Reimbursement Claim
 */
export async function approveReimbursement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE reimbursements r JOIN users u ON u.id = r.employee_id
       SET r.status = 'APPROVED', r.approved_by = ?
       WHERE r.id = ? AND u.company_id = ? AND r.employee_id <> ?`,
      [req.user?.id || null, id, getTenantId(req), req.user?.id || '']
    );
    res.json({ success: true, message: 'Reimbursement claim approved.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to approve reimbursement.' } });
  }
}

/**
 * Get Flexible Benefit Plan (FBP) Declarations
 */
export async function getFbpDeclarations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const sc = scope(req, 'f');
    const [rows]: any = await pool.query(
      `SELECT f.*, u.full_name as employeeName, u.employee_id as employeeCode
       FROM flexible_benefit_plans f
       JOIN users u ON u.id = f.employee_id
       ${sc.where}
       ORDER BY f.created_at DESC`,
      sc.params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch FBP declarations.' } });
  }
}

/**
 * Save Flexible Benefit Plan Selection
 */
export async function saveFbpDeclaration(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { employeeId, financialYear, ltaAmount, fuelAllowanceAmount, telephoneAllowanceAmount, foodCouponsAmount } = req.body;
    const empId = await resolveClaimEmployee(req, employeeId);
    if (!empId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unknown employee.' } });
      return;
    }

    const fbpId = uuidv4();
    const lta = Number(ltaAmount) || 0;
    const fuel = Number(fuelAllowanceAmount) || 0;
    const tele = Number(telephoneAllowanceAmount) || 0;
    const food = Number(foodCouponsAmount) || 0;
    const total = lta + fuel + tele + food;

    await pool.query(
      `INSERT INTO flexible_benefit_plans
       (id, employee_id, financial_year, lta_amount, fuel_allowance_amount, telephone_allowance_amount, food_coupons_amount, total_fbp_selected)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fbpId, empId, financialYear || '2025-2026', lta, fuel, tele, food, total]
    );

    res.status(201).json({ success: true, message: 'Flexible Benefit Plan declaration saved.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to save FBP declaration.' } });
  }
}

/**
 * Get Salary Arrears
 */
export async function getSalaryArrears(req: AuthRequest, res: Response): Promise<void> {
  try {
    const sc = scope(req, 'a');
    const [rows]: any = await pool.query(
      `SELECT a.*, u.full_name as employeeName, u.employee_id as employeeCode
       FROM salary_arrears a
       JOIN users u ON u.id = a.employee_id
       ${sc.where}
       ORDER BY a.created_at DESC`,
      sc.params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch salary arrears.' } });
  }
}

/**
 * Create Salary Arrears Record
 */
export async function createSalaryArrear(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { employeeId: requestedEmployee, effectiveFromMonth, effectiveFromYear, effectiveToMonth, effectiveToYear, basicDifferenceTotal, grossDifferenceTotal } = req.body;
    const employeeId = await resolveClaimEmployee(req, requestedEmployee);
    if (!employeeId || !requestedEmployee) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose an employee of your company.' } });
      return;
    }

    const arrearId = uuidv4();
    await pool.query(
      `INSERT INTO salary_arrears
       (id, employee_id, effective_from_month, effective_from_year, effective_to_month, effective_to_year, basic_difference_total, gross_difference_total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        arrearId,
        employeeId,
        Number(effectiveFromMonth),
        Number(effectiveFromYear),
        Number(effectiveToMonth),
        Number(effectiveToYear),
        Number(basicDifferenceTotal),
        Number(grossDifferenceTotal),
      ]
    );

    res.status(201).json({ success: true, message: 'Salary arrear adjustment created.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create salary arrear.' } });
  }
}
