import { Request, Response } from 'express';
import crypto from 'crypto';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { isEmailConfigured } from '../../services/emailService.js';
import { loadPayrollSettings, savePayrollSettings } from './payrollSettings.js';
import { activeCycle, processCompanyPayroll, runPayrollAutomationTick } from './payrollAutomation.js';
import { companyToday } from './payrollEngine.js';
import { ensurePayrollSchema } from './payrollSchemaSetup.js';
import { getCompanyInfo, sendPayslipsForRun } from './payslipMailer.js';
import { renderPayslipPdf, monthName } from './payslipPdf.js';
import { daysInMonth, ymd } from './payrollCalculator.js';

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ success: false, error: { code, message } });

function describeNextRun(settings: any) {
  const a = settings.automation;
  const clock = companyToday(a.utcOffsetMinutes);
  const current = activeCycle(clock.date, settings);
  // Next salary date on or after today
  let year = clock.year;
  let month = clock.month;
  let salaryDate = ymd(year, month, Math.min(a.salaryDay, daysInMonth(year, month)));
  if (salaryDate < clock.date) {
    month = month === 12 ? 1 : month + 1;
    year = month === 1 ? year + 1 : year;
    salaryDate = ymd(year, month, Math.min(a.salaryDay, daysInMonth(year, month)));
  }
  const payMonth = a.payFor === 'PREVIOUS_MONTH' ? (month === 1 ? 12 : month - 1) : month;
  const payYear = a.payFor === 'PREVIOUS_MONTH' && month === 1 ? year - 1 : year;
  return { today: clock.date, inWindow: !!current, nextSalaryDate: salaryDate, nextPayPeriod: `${monthName(payMonth)} ${payYear}` };
}

export async function getPayrollSettingsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantId(req);
    const settings = await loadPayrollSettings(companyId);
    let lastTick: any = null;
    if (companyId) {
      const [rows]: any = await pool.query('SELECT last_tick_at, last_tick_result FROM payroll_settings WHERE company_id = ?', [companyId]);
      if (rows[0]?.last_tick_result) {
        try { lastTick = JSON.parse(rows[0].last_tick_result); } catch { lastTick = null; }
      }
    }
    res.json({
      success: true,
      data: {
        settings,
        emailConfigured: isEmailConfigured(),
        cronKeyConfigured: !!process.env.PAYROLL_CRON_KEY,
        schedule: describeNextRun(settings),
        lastTick,
      },
    });
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Failed to load payroll settings');
  }
}

export async function updatePayrollSettingsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantId(req);
    if (!companyId) return void fail(res, 400, 'NO_COMPANY', 'Select a company first.');
    const settings = await savePayrollSettings(companyId, req.body?.settings ?? req.body, req.user?.id);
    await pool.query(
      `INSERT INTO audit_logs (id, company_id, user_id, user_email, role, action, details) VALUES (UUID(), ?, ?, ?, ?, 'PAYROLL_SETTINGS_UPDATED', ?)`,
      [companyId, req.user?.id || null, req.user?.email || null, req.user?.role || 'admin', `Automation ${settings.automation.enabled ? 'on' : 'off'}, salary day ${settings.automation.salaryDay}`]
    ).catch(() => undefined);
    res.json({ success: true, message: 'Payroll settings saved.', data: { settings, schedule: describeNextRun(settings) } });
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Failed to save payroll settings');
  }
}

export async function sendRunPayslipsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantId(req);
    const { id } = req.params;
    const [runs]: any = await pool.query('SELECT id, status, company_id FROM payroll_runs WHERE id = ? AND company_id = ?', [id, companyId]);
    if (!runs.length) return void fail(res, 404, 'NOT_FOUND', 'Payroll run not found.');
    const status = String(runs[0].status).toUpperCase();
    if (!['APPROVED', 'PROCESSED', 'PAID'].includes(status)) {
      return void fail(res, 409, 'NOT_APPROVED', 'Approve the payroll before e-mailing payslips.');
    }
    const settings = await loadPayrollSettings(companyId);
    const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds.map(String) : undefined;
    const result = await sendPayslipsForRun(id, companyId!, { itemIds, resend: !!req.body?.resend, ccEmail: settings.automation.hrCcEmail || undefined });
    res.json({
      success: true,
      message: result.dryRun
        ? `E-mail is not configured on the server, so nothing was actually sent (${result.sent} payslip(s) prepared). Set MAIL_USERNAME / MAIL_PASSWORD on the backend.`
        : `${result.sent} payslip(s) e-mailed${result.failed ? `, ${result.failed} failed` : ''}${result.skipped ? `, ${result.skipped} already sent` : ''}.`,
      data: result,
    });
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Failed to send payslips');
  }
}

async function loadItemForUser(req: AuthRequest, itemId: string) {
  const companyId = getTenantId(req);
  const isSuperGlobal = req.isSuperAdmin && !req.tenantId;
  let sql = `SELECT pi.*, pr.payroll_month, pr.payroll_year, pr.status AS run_status FROM payroll_items pi
             JOIN payroll_runs pr ON pr.id = pi.payroll_run_id WHERE pi.id = ?`;
  const params: any[] = [itemId];
  if (!isSuperGlobal) { sql += ' AND pi.company_id = ?'; params.push(companyId); }
  const [rows]: any = await pool.query(sql, params);
  const item = rows[0];
  if (!item) return { error: [404, 'NOT_FOUND', 'Payslip not found.'] as const };
  const role = String(req.user?.role || '').toLowerCase();
  const isStaff = ['admin', 'employer', 'hr', 'super_admin', 'superadmin'].includes(role) || req.isSuperAdmin;
  if (!isStaff) {
    if (item.employee_id !== req.user?.id) return { error: [403, 'FORBIDDEN', 'You can only view your own payslips.'] as const };
    if (!['APPROVED', 'PROCESSED', 'PAID'].includes(String(item.run_status).toUpperCase())) {
      return { error: [404, 'NOT_FOUND', 'This payslip has not been released yet.'] as const };
    }
  }
  return { item };
}

export async function downloadPayslipPdfHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { item, error } = await loadItemForUser(req, req.params.itemId);
    if (error) return void fail(res, error[0], error[1], error[2]);
    const company = await getCompanyInfo(item.company_id);
    const pdf = await renderPayslipPdf(item, item, company);
    const name = `Payslip_${monthName(item.payroll_month)}_${item.payroll_year}_${String(item.employee_code || 'employee').replace(/[^\w-]+/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${name}"`);
    res.send(pdf);
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Failed to build payslip PDF');
  }
}

export async function getMyPayslipsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensurePayrollSchema();
    const [rows]: any = await pool.query(
      `SELECT pi.id, pr.payroll_month AS month, pr.payroll_year AS year, pi.net_salary AS netSalary, pi.gross_earnings AS grossEarnings,
              pi.total_deductions AS totalDeductions, pi.payable_days AS payableDays, pi.lop_days AS lopDays, pi.leave_summary_json AS leaveSummaryJson
       FROM payroll_items pi JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
       WHERE pi.employee_id = ? AND UPPER(pr.status) IN ('APPROVED', 'PROCESSED', 'PAID')
       ORDER BY pr.payroll_year DESC, pr.payroll_month DESC LIMIT 36`,
      [req.user?.id]
    );
    res.json({ success: true, data: rows.map((r: any) => ({ ...r, leaveSummary: r.leaveSummaryJson ? JSON.parse(r.leaveSummaryJson) : null, leaveSummaryJson: undefined })) });
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Failed to load payslips');
  }
}

/** Run the salary-day automation for the caller's company right now (same rules as the scheduler). */
export async function runAutomationNowHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantId(req);
    if (!companyId) return void fail(res, 400, 'NO_COMPANY', 'Select a company first.');
    const settings = await loadPayrollSettings(companyId);
    if (!settings.automation.enabled) return void fail(res, 409, 'DISABLED', 'Turn on automatic payroll first.');
    const outcome = await processCompanyPayroll(companyId, settings);
    await pool.query('UPDATE payroll_settings SET last_tick_at = NOW(), last_tick_result = ? WHERE company_id = ?', [
      JSON.stringify({ at: new Date().toISOString(), ...outcome }), companyId,
    ]);
    res.json({ success: true, data: outcome });
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Automation run failed');
  }
}

/**
 * External cron trigger (for hosts that sleep, e.g. Render free tier):
 * GET /api/v1/payroll-cron?key=<PAYROLL_CRON_KEY>
 */
export async function payrollCronHandler(req: Request, res: Response): Promise<void> {
  const expected = process.env.PAYROLL_CRON_KEY || '';
  const given = String(req.query.key || req.headers['x-cron-key'] || '');
  const ok = expected.length >= 16 && given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron key' } });
    return;
  }
  try {
    const outcomes = await runPayrollAutomationTick();
    res.json({ success: true, data: { checked: outcomes.length, outcomes } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
}
