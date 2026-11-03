import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { calculateEmployeeMonthlyPayroll } from './payrollEngine.js';

/**
 * Validate Employees Readiness for Payroll Run (Strictly Scoped to Company)
 */
export async function validatePayrollReadiness(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { month, year } = req.query;
    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();
    const companyId = getTenantId(req);
    const isSuperGlobal = req.isSuperAdmin && !req.tenantId;

    let query = `
      SELECT u.id, u.employee_id as employeeCode, u.full_name as fullName,
             ep.salary, ep.bank_name as bankName, ep.account_number as accountNumber,
             ep.pan, ep.uan, ep.department_name as department
      FROM users u
      JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE u.status = 'active'
    `;
    const params: any[] = [];
    if (!isSuperGlobal) {
      query += ' AND u.company_id = ?';
      params.push(companyId);
    }

    const [employees]: any = await pool.query(query, params);

    const validationReport = employees.map((emp: any) => {
      const warnings: string[] = [];
      const errors: string[] = [];

      if (!emp.salary || Number(emp.salary) <= 0) {
        errors.push('Salary / CTC is not configured');
      }
      if (!emp.accountNumber || !emp.bankName) {
        warnings.push('Bank details missing');
      }
      if (!emp.pan) {
        warnings.push('PAN number missing');
      }

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        department: emp.department || 'Unassigned',
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    });

    res.json({
      success: true,
      data: {
        totalEmployees: employees.length,
        validCount: validationReport.filter((r: any) => r.isValid).length,
        errorCount: validationReport.filter((r: any) => !r.isValid).length,
        items: validationReport,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to validate payroll readiness.' } });
  }
}

/**
 * Execute or Recalculate Monthly Payroll Run (Company Isolated)
 */
export async function calculateMonthlyPayroll(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { month, year, payableDaysPolicy } = req.body;
    const m = Number(month);
    const y = Number(year);
    const companyId = getTenantId(req);

    if (!m || !y) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Month and Year are required.' } });
      return;
    }

    const policy = payableDaysPolicy || 'CALENDAR_DAYS';
    const calendarDays = new Date(y, m, 0).getDate();
    const payPeriodStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const payPeriodEnd = `${y}-${String(m).padStart(2, '0')}-${String(calendarDays).padStart(2, '0')}`;
    const financialYear = m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;

    // Duplicate Check: Check if existing payroll run exists for month & year for THIS company
    const [existingRun]: any = await pool.query(
      `SELECT id, status FROM payroll_runs WHERE payroll_month = ? AND payroll_year = ? AND company_id = ? LIMIT 1`,
      [m, y, companyId]
    );

    let runId = '';
    if (existingRun && existingRun.length > 0) {
      if (existingRun[0].status === 'LOCKED' || existingRun[0].status === 'APPROVED' || existingRun[0].status === 'PAID') {
        res.status(409).json({
          success: false,
          error: {
            code: 'LOCKED',
            message: `Payroll for ${m}/${y} is locked with status '${existingRun[0].status}'. Recalculation is forbidden.`,
          },
        });
        return;
      }
      runId = existingRun[0].id;
      // Delete old items for recalculation
      await pool.query(`DELETE FROM payroll_items WHERE payroll_run_id = ? AND company_id = ?`, [runId, companyId]);
    } else {
      runId = uuidv4();
      await pool.query(
        `INSERT INTO payroll_runs 
         (id, company_id, payroll_month, payroll_year, financial_year, pay_period_start, pay_period_end, status, payable_days_policy, calculated_by, calculated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'CALCULATED', ?, ?, NOW())`,
        [runId, companyId, m, y, financialYear, payPeriodStart, payPeriodEnd, policy, req.user?.id || null]
      );
    }

    // Fetch active employees belonging EXCLUSIVELY to this company
    const [employees]: any = await pool.query(
      `SELECT u.id FROM users u WHERE u.status = 'active' AND u.company_id = ?`,
      [companyId]
    );

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalEmployerCost = 0;
    const calculatedItems = [];

    for (const emp of employees) {
      try {
        const item = await calculateEmployeeMonthlyPayroll(emp.id, m, y, policy);
        const itemId = uuidv4();

        await pool.query(
          `INSERT INTO payroll_items
           (id, company_id, payroll_run_id, employee_id, employee_code, employee_name, department, designation,
            bank_name, account_number, ifsc, pan, uan, calendar_days, working_days, present_days, absent_days,
            paid_leave_days, lop_days, payable_days, overtime_hours, basic_salary, hra, conveyance,
            special_allowance, medical_allowance, other_allowances, overtime_pay, bonus_incentive,
            lop_deduction_amount, gross_earnings, employee_pf, employee_esic, professional_tax, tds,
            loan_emi_deduction, other_deductions, total_deductions, net_salary, employer_pf, employer_esic,
            gratuity_provision, total_employer_cost, calculation_breakdown_json, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CALCULATED')`,
          [
            itemId,
            companyId,
            runId,
            emp.id,
            item.employeeCode,
            item.employeeName,
            item.department,
            item.designation,
            item.bankName || null,
            item.accountNumber || null,
            item.ifsc || null,
            item.pan || null,
            item.uan || null,
            item.calendarDays,
            item.workingDays,
            item.presentDays,
            item.absentDays,
            item.paidLeaveDays,
            item.lopDays,
            item.payableDays,
            item.overtimeHours,
            item.basicSalary,
            item.hra,
            item.conveyance,
            item.specialAllowance,
            item.medicalAllowance,
            item.otherAllowances,
            item.overtimePay,
            item.bonusIncentive,
            item.lopDeductionAmount,
            item.grossEarnings,
            item.employeePf,
            item.employeeEsic,
            item.professionalTax,
            item.tds,
            item.loanEmiDeduction,
            item.otherDeductions,
            item.totalDeductions,
            item.netSalary,
            item.employerPf,
            item.employerEsic,
            item.gratuityProvision,
            item.totalEmployerCost,
            item.calculationBreakdownJson,
          ]
        );

        totalGross += item.grossEarnings;
        totalDeductions += item.totalDeductions;
        totalNet += item.netSalary;
        totalEmployerCost += item.totalEmployerCost;
        calculatedItems.push({ id: itemId, ...item });
      } catch (err: any) {
        console.error(`Failed to calculate payroll for employee ${emp.id}:`, err.message);
      }
    }

    // Update summary totals on payroll_run
    await pool.query(
      `UPDATE payroll_runs 
       SET total_employees = ?, total_gross = ?, total_deductions = ?, total_net = ?, total_employer_cost = ?, status = 'CALCULATED', calculated_at = NOW()
       WHERE id = ? AND company_id = ?`,
      [employees.length, totalGross, totalDeductions, totalNet, totalEmployerCost, runId, companyId]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (id, company_id, user_id, user_email, role, action, details) VALUES (UUID(), ?, ?, ?, ?, 'PAYROLL_CALCULATED', ?)`,
      [companyId, req.user?.id || null, req.user?.email || null, req.user?.role || 'admin', `Calculated payroll for ${m}/${y} for ${employees.length} employees.`]
    );

    res.json({
      success: true,
      message: `Payroll for ${m}/${y} calculated successfully.`,
      data: {
        runId,
        payrollMonth: m,
        payrollYear: y,
        status: 'CALCULATED',
        totalEmployees: employees.length,
        totalGross,
        totalDeductions,
        totalNet,
        totalEmployerCost,
        items: calculatedItems,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to calculate payroll.' } });
  }
}

/**
 * Get Payroll Runs History (Strictly Isolated by Company)
 */
export async function getPayrollRuns(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantId(req);
    const isSuperGlobal = req.isSuperAdmin && !req.tenantId;

    let query = `
      SELECT r.id, r.company_id as companyId, r.payroll_month as payrollMonth, r.payroll_year as payrollYear,
             r.financial_year as financialYear, r.status, r.payable_days_policy as payableDaysPolicy,
             r.total_employees as totalEmployees, r.total_gross as totalGross,
             r.total_deductions as totalDeductions, r.total_net as totalNet,
             r.total_employer_cost as totalEmployerCost, r.created_at as createdAt,
             r.approved_at as approvedAt, r.locked_at as lockedAt
      FROM payroll_runs r
    `;
    const params: any[] = [];
    if (!isSuperGlobal) {
      query += ` WHERE r.company_id = ?`;
      params.push(companyId);
    }
    query += ` ORDER BY r.payroll_year DESC, r.payroll_month DESC`;

    const [rows]: any = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch payroll runs.' } });
  }
}

/**
 * Get Single Payroll Run Details & Items (Tenant Guarded)
 */
export async function getPayrollRunById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const companyId = getTenantId(req);
    const isSuperGlobal = req.isSuperAdmin && !req.tenantId;

    let runSql = `SELECT * FROM payroll_runs WHERE id = ?`;
    const runParams: any[] = [id];
    if (!isSuperGlobal) {
      runSql += ` AND company_id = ?`;
      runParams.push(companyId);
    }

    const [runs]: any = await pool.query(runSql, runParams);
    if (!runs || runs.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll run not found in company database.' } });
      return;
    }

    let itemsSql = `SELECT * FROM payroll_items WHERE payroll_run_id = ?`;
    const itemsParams: any[] = [id];
    if (!isSuperGlobal) {
      itemsSql += ` AND company_id = ?`;
      itemsParams.push(companyId);
    }
    itemsSql += ` ORDER BY employee_code ASC`;

    const [items]: any = await pool.query(itemsSql, itemsParams);

    res.json({
      success: true,
      data: {
        run: runs[0],
        items,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch payroll run details.' } });
  }
}

/**
 * Update Status (Lock, Approve, Process, Cancel) - Tenant Guarded
 */
export async function updatePayrollRunStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const companyId = getTenantId(req);
    const isSuperGlobal = req.isSuperAdmin && !req.tenantId;

    if (!['UNDER_REVIEW', 'APPROVED', 'PROCESSED', 'PAID', 'CANCELLED'].includes(status)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status requested.' } });
      return;
    }

    // Verify run exists for company
    let checkSql = `SELECT id FROM payroll_runs WHERE id = ?`;
    const checkParams: any[] = [id];
    if (!isSuperGlobal) {
      checkSql += ` AND company_id = ?`;
      checkParams.push(companyId);
    }
    const [existing]: any = await pool.query(checkSql, checkParams);
    if (existing.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll run not found in company database.' } });
      return;
    }

    let extraSet = '';
    if (status === 'APPROVED') extraSet = ', approved_by = ?, approved_at = NOW(), locked_at = NOW()';

    let updateRunSql = `UPDATE payroll_runs SET status = ? ${extraSet} WHERE id = ?`;
    const updateRunParams: any[] = status === 'APPROVED' ? [status, req.user?.id || null, id] : [status, id];
    if (!isSuperGlobal) {
      updateRunSql += ` AND company_id = ?`;
      updateRunParams.push(companyId);
    }
    await pool.query(updateRunSql, updateRunParams);

    let updateItemsSql = `UPDATE payroll_items SET status = ? WHERE payroll_run_id = ?`;
    const updateItemsParams: any[] = [status, id];
    if (!isSuperGlobal) {
      updateItemsSql += ` AND company_id = ?`;
      updateItemsParams.push(companyId);
    }
    await pool.query(updateItemsSql, updateItemsParams);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (id, company_id, user_id, user_email, role, action, details) VALUES (UUID(), ?, ?, ?, ?, 'PAYROLL_STATUS_CHANGED', ?)`,
      [companyId, req.user?.id || null, req.user?.email || null, req.user?.role || 'admin', `Updated payroll run ${id} status to ${status}. ${remarks || ''}`]
    );

    res.json({ success: true, message: `Payroll run status updated to '${status}' successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update payroll status.' } });
  }
}
