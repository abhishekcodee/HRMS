import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Get PF Configuration
 */
export async function getPfConfig(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(`SELECT * FROM statutory_pf_configs WHERE is_active = 1 LIMIT 1`);
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch PF config.' } });
  }
}

/**
 * Update PF Configuration
 */
export async function updatePfConfig(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { enabled, employeeRate, employerRate, epsRate, epfEmployerRate, wageCeiling, restrictToCeiling, allowVpf, effectiveFrom } = req.body;

    const id = uuidv4();
    await pool.query(`UPDATE statutory_pf_configs SET is_active = 0`);
    await pool.query(
      `INSERT INTO statutory_pf_configs 
       (id, enabled, employee_rate, employer_rate, eps_rate, epf_employer_rate, wage_ceiling, restrict_to_ceiling, allow_vpf, effective_from, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        enabled ? 1 : 0,
        Number(employeeRate) || 12.0,
        Number(employerRate) || 12.0,
        Number(epsRate) || 8.33,
        Number(epfEmployerRate) || 3.67,
        Number(wageCeiling) || 15000.0,
        restrictToCeiling ? 1 : 0,
        allowVpf ? 1 : 0,
        effectiveFrom || '2026-01-01',
      ]
    );

    res.json({ success: true, message: 'EPF Configuration updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update PF config.' } });
  }
}

/**
 * Get ESIC Configuration
 */
export async function getEsicConfig(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(`SELECT * FROM statutory_esic_configs WHERE is_active = 1 LIMIT 1`);
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch ESIC config.' } });
  }
}

/**
 * Update ESIC Configuration
 */
export async function updateEsicConfig(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { enabled, eligibilityThreshold, employeeRate, employerRate, effectiveFrom } = req.body;

    const id = uuidv4();
    await pool.query(`UPDATE statutory_esic_configs SET is_active = 0`);
    await pool.query(
      `INSERT INTO statutory_esic_configs 
       (id, enabled, eligibility_threshold, employee_rate, employer_rate, effective_from, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        enabled ? 1 : 0,
        Number(eligibilityThreshold) || 21000.0,
        Number(employeeRate) || 0.75,
        Number(employerRate) || 3.25,
        effectiveFrom || '2026-01-01',
      ]
    );

    res.json({ success: true, message: 'ESIC Configuration updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update ESIC config.' } });
  }
}

/**
 * Get Professional Tax Slabs
 */
export async function getProfessionalTaxSlabs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(`SELECT * FROM professional_tax_slabs WHERE is_active = 1 ORDER BY state ASC, min_gross ASC`);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch PT slabs.' } });
  }
}

/**
 * Create Professional Tax Slab
 */
export async function createProfessionalTaxSlab(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { state, minGross, maxGross, monthlyTax, februaryTax, effectiveFrom } = req.body;
    const id = uuidv4();
    await pool.query(
      `INSERT INTO professional_tax_slabs 
       (id, state, min_gross, max_gross, monthly_tax, february_tax, effective_from, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        state || 'Maharashtra',
        Number(minGross) || 0,
        Number(maxGross) || 9999999,
        Number(monthlyTax) || 0,
        februaryTax ? Number(februaryTax) : null,
        effectiveFrom || '2026-01-01',
      ]
    );
    res.status(201).json({ success: true, message: 'PT slab created successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create PT slab.' } });
  }
}

/**
 * Get Loans & Advances
 */
export async function getLoansAdvancement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT l.*, u.full_name as employeeName, u.employee_id as employeeCode
       FROM employee_loans_advancements l
       JOIN users u ON u.id = l.employee_id
       ORDER BY l.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch loans & advances.' } });
  }
}

/**
 * Create Loan / Salary Advance
 */
export async function createLoanAdvancement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { employeeId, type, principalAmount, monthlyEmi, startDate, endDate, notes } = req.body;
    if (!employeeId || !principalAmount || !monthlyEmi || !startDate) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee, Amount, EMI, and Start Date are required.' } });
      return;
    }

    const loanId = uuidv4();
    const amount = Number(principalAmount);
    await pool.query(
      `INSERT INTO employee_loans_advancements
       (id, employee_id, type, principal_amount, paid_amount, remaining_amount, monthly_emi, start_date, end_date, notes, created_by, status)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [loanId, employeeId, type || 'LOAN', amount, amount, Number(monthlyEmi), startDate, endDate || null, notes || null, req.user?.id || null]
    );

    res.status(201).json({ success: true, message: `${type === 'SALARY_ADVANCE' ? 'Salary Advance' : 'Loan'} created successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create loan.' } });
  }
}
