import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Get Reimbursement / Expense Claims
 */
export async function getReimbursements(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT r.*, u.full_name as employeeName, u.employee_id as employeeCode
       FROM reimbursements r
       JOIN users u ON u.id = r.employee_id
       ORDER BY r.created_at DESC`
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
    const empId = employeeId || req.user?.id;

    if (!empId || !amount || !category) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee, Category, and Amount are required.' } });
      return;
    }

    const rId = uuidv4();
    await pool.query(
      `INSERT INTO reimbursements (id, employee_id, category, amount, claim_date, description, receipt_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [rId, empId, category, Number(amount), claimDate || new Date().toISOString().split('T')[0], description || null, receiptUrl || null]
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
      `UPDATE reimbursements SET status = 'APPROVED', approved_by = ? WHERE id = ?`,
      [req.user?.id || null, id]
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
    const [rows]: any = await pool.query(
      `SELECT f.*, u.full_name as employeeName, u.employee_id as employeeCode
       FROM flexible_benefit_plans f
       JOIN users u ON u.id = f.employee_id
       ORDER BY f.created_at DESC`
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
    const empId = employeeId || req.user?.id;

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
    const [rows]: any = await pool.query(
      `SELECT a.*, u.full_name as employeeName, u.employee_id as employeeCode
       FROM salary_arrears a
       JOIN users u ON u.id = a.employee_id
       ORDER BY a.created_at DESC`
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
    const { employeeId, effectiveFromMonth, effectiveFromYear, effectiveToMonth, effectiveToYear, basicDifferenceTotal, grossDifferenceTotal } = req.body;

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
