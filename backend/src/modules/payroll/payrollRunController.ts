import { Response } from 'express';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { PayrollLockedError, finaliseApprovedRun, generatePayrollRun } from './payrollEngine.js';
import { ensurePayrollSchema } from './payrollSchemaSetup.js';

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
    await ensurePayrollSchema();

    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')} 23:59:59`;
    let query = `
      SELECT u.id, u.employee_id as employeeCode, u.full_name as fullName, u.email,
             ep.salary, ep.bank_name as bankName, ep.account_number as accountNumber,
             ep.pan, ep.uan, ep.department_name as department,
             (SELECT COUNT(*) FROM attendance a WHERE a.user_id = u.id AND a.work_date >= ? AND a.work_date <= ?) AS attendanceDays
      FROM users u
      JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE LOWER(u.status) = 'active'
    `;
    const params: any[] = [monthStart, monthEnd];
    if (!isSuperGlobal) {
      query += ' AND u.company_id = ?';
      params.push(companyId);
    }

    const [employees]: any = await pool.query(query, params);

    const validationReport = employees.map((emp: any) => {
      const warnings: string[] = [];
      const errors: string[] = [];

      if (!emp.salary || Number(emp.salary) <= 0) {
        errors.push('Monthly salary is not set');
      }
      if (!emp.email) {
        warnings.push('No e-mail (payslip cannot be sent)');
      }
      if (!emp.accountNumber || !emp.bankName) {
        warnings.push('Bank details missing');
      }
      if (!emp.pan) {
        warnings.push('PAN missing (TDS at 20% if taxable)');
      }
      if (!Number(emp.attendanceDays)) {
        warnings.push('No attendance this month');
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
        warningCount: validationReport.filter((r: any) => r.warnings.length > 0).length,
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

    if (!m || !y || m < 1 || m > 12) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Month and Year are required.' } });
      return;
    }
    if (!companyId) {
      res.status(400).json({ success: false, error: { code: 'NO_COMPANY', message: 'Select a company before generating payroll.' } });
      return;
    }

    const allowedPolicies = ['CALENDAR_DAYS', 'FIXED_30', 'FIXED_26', 'WORKING_DAYS'];
    const gen = await generatePayrollRun(companyId, m, y, {
      actorId: req.user?.id || null,
      payableDaysPolicy: allowedPolicies.includes(payableDaysPolicy) ? payableDaysPolicy : undefined,
    });

    await pool.query(
      `INSERT INTO audit_logs (id, company_id, user_id, user_email, role, action, details) VALUES (UUID(), ?, ?, ?, ?, 'PAYROLL_CALCULATED', ?)`,
      [companyId, req.user?.id || null, req.user?.email || null, req.user?.role || 'admin', `Generated payroll for ${m}/${y}: ${gen.items.length} employees.`]
    ).catch(() => undefined);

    res.json({
      success: true,
      message: `Payroll for ${m}/${y} generated for ${gen.items.length} employee(s).`,
      data: {
        runId: gen.runId,
        payrollMonth: m,
        payrollYear: y,
        status: 'CALCULATED',
        totalEmployees: gen.items.length,
        totalGross: gen.totals.gross,
        totalDeductions: gen.totals.deductions,
        totalNet: gen.totals.net,
        totalEmployerCost: gen.totals.employerCost,
        warnings: gen.warnings,
      },
    });
  } catch (error: any) {
    if (error instanceof PayrollLockedError) {
      res.status(409).json({ success: false, error: { code: 'LOCKED', message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to calculate payroll.' } });
  }
}

/**
 * Get Payroll Runs History (Strictly Isolated by Company)
 */
export async function getPayrollRuns(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensurePayrollSchema();
    const companyId = getTenantId(req);
    const isSuperGlobal = req.isSuperAdmin && !req.tenantId;

    let query = `
      SELECT r.id, r.company_id as companyId, r.payroll_month as payrollMonth, r.payroll_year as payrollYear,
             r.financial_year as financialYear, r.status, r.payable_days_policy as payableDaysPolicy,
             r.total_employees as totalEmployees, r.total_gross as totalGross,
             r.total_deductions as totalDeductions, r.total_net as totalNet,
             r.total_employer_cost as totalEmployerCost, r.created_at as createdAt,
             r.approved_at as approvedAt, r.locked_at as lockedAt, r.calculated_at as calculatedAt,
             r.emailed_at as emailedAt, r.auto_generated as autoGenerated, r.warnings_json as warningsJson
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
    await ensurePayrollSchema();
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
    let checkSql = `SELECT id, status, company_id FROM payroll_runs WHERE id = ?`;
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
    const previous = String(existing[0].status || '').toUpperCase();
    const order = ['DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSED', 'PAID'];
    if (status !== 'CANCELLED' && order.indexOf(status) < order.indexOf(previous)) {
      res.status(409).json({ success: false, error: { code: 'INVALID_TRANSITION', message: `A ${previous} payroll cannot be moved back to ${status}.` } });
      return;
    }
    if (status === 'CANCELLED' && ['PROCESSED', 'PAID'].includes(previous)) {
      res.status(409).json({ success: false, error: { code: 'INVALID_TRANSITION', message: `A ${previous} payroll cannot be cancelled.` } });
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

    if (status === 'APPROVED' && !['APPROVED', 'PROCESSED', 'PAID'].includes(previous)) {
      await finaliseApprovedRun(id, existing[0].company_id);
    }

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
