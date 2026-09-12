import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

/**
 * Calculate & Create Full & Final Settlement (F&F)
 */
export async function calculateFullAndFinalSettlement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      employeeId,
      lastWorkingDate,
      resignationDate,
      pendingSalaryDays,
      leaveEncashmentDays,
      gratuityYears,
      bonusAmount,
      noticePeriodRecoveryAmount,
      loanBalanceRecoveryAmount,
      otherRecoveriesAmount,
    } = req.body;

    if (!employeeId || !lastWorkingDate) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee ID and Last Working Date are required.' } });
      return;
    }

    const [empRows]: any = await pool.query(
      `SELECT ep.*, u.full_name as fullName, u.employee_id as employeeCode
       FROM employee_profiles ep
       JOIN users u ON u.id = ep.user_id
       WHERE ep.user_id = ? OR ep.id = ?`,
      [employeeId, employeeId]
    );

    if (!empRows || empRows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found.' } });
      return;
    }
    const emp = empRows[0];

    const monthlyGross = Number(emp.salary) || 50000;
    const dailySalary = monthlyGross / 30;
    const basicSalary = monthlyGross * 0.40;

    // 1. Pending Salary Amount
    const pDays = Number(pendingSalaryDays) || 0;
    const pendingSalaryAmount = Math.round(dailySalary * pDays);

    // 2. Leave Encashment Amount
    const lDays = Number(leaveEncashmentDays) || 0;
    const leaveEncashmentAmount = Math.round(dailySalary * lDays);

    // 3. Gratuity Calculation (Formula: 15 * Last Drawn Basic * Tenure Years / 26)
    let gYears = Number(gratuityYears) || 0;
    if (!gYears && emp.joining_date) {
      const joinDate = new Date(emp.joining_date);
      const exitDate = new Date(lastWorkingDate);
      const diffTime = Math.abs(exitDate.getTime() - joinDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      gYears = Number((diffDays / 365).toFixed(2));
    }

    let gratuityAmount = 0;
    if (gYears >= 5) {
      gratuityAmount = Math.round((15 * basicSalary * gYears) / 26);
    }

    const bonus = Number(bonusAmount) || 0;
    const totalEarnings = pendingSalaryAmount + leaveEncashmentAmount + gratuityAmount + bonus;

    const noticeRecovery = Number(noticePeriodRecoveryAmount) || 0;
    const loanRecovery = Number(loanBalanceRecoveryAmount) || 0;
    const otherRecovery = Number(otherRecoveriesAmount) || 0;
    const totalRecoveries = noticeRecovery + loanRecovery + otherRecovery;

    const netSettlementAmount = Math.max(0, totalEarnings - totalRecoveries);

    const ffId = uuidv4();
    await pool.query(
      `INSERT INTO ff_settlements
       (id, employee_id, employee_code, employee_name, joining_date, resignation_date, last_working_date,
        pending_salary_days, pending_salary_amount, leave_encashment_days, leave_encashment_amount,
        gratuity_years, gratuity_amount, bonus_amount, notice_period_recovery_amount,
        loan_balance_recovery_amount, other_recoveries_amount, total_earnings, total_recoveries,
        net_settlement_amount, settlement_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
      [
        ffId,
        emp.user_id,
        emp.employeeCode,
        emp.fullName,
        emp.joining_date || '2025-01-01',
        resignationDate || null,
        lastWorkingDate,
        pDays,
        pendingSalaryAmount,
        lDays,
        leaveEncashmentAmount,
        gYears,
        gratuityAmount,
        bonus,
        noticeRecovery,
        loanRecovery,
        otherRecovery,
        totalEarnings,
        totalRecoveries,
        netSettlementAmount,
        req.user?.id || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Full & Final Settlement statement generated in Draft state.',
      data: {
        id: ffId,
        employeeName: emp.fullName,
        employeeCode: emp.employeeCode,
        totalEarnings,
        totalRecoveries,
        netSettlementAmount,
        gratuityAmount,
        gratuityYears: gYears,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to calculate F&F.' } });
  }
}

/**
 * Get All F&F Settlements
 */
export async function getFfSettlements(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [rows]: any = await pool.query(`SELECT * FROM ff_settlements ORDER BY created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch F&F settlements.' } });
  }
}

/**
 * Approve F&F Settlement
 */
export async function approveFfSettlement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE ff_settlements SET settlement_status = 'APPROVED', approved_by = ? WHERE id = ?`,
      [req.user?.id || null, id]
    );

    // Update employee profile status to Separated
    const [ffs]: any = await pool.query(`SELECT employee_id, last_working_date FROM ff_settlements WHERE id = ?`, [id]);
    if (ffs && ffs.length > 0) {
      await pool.query(
        `UPDATE employee_profiles SET date_of_separation = ? WHERE user_id = ?`,
        [ffs[0].last_working_date, ffs[0].employee_id]
      );
      await pool.query(`UPDATE users SET status = 'inactive' WHERE id = ?`, [ffs[0].employee_id]);
    }

    res.json({ success: true, message: 'F&F Settlement approved successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to approve F&F settlement.' } });
  }
}
