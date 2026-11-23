import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';
import { isEmailConfigured } from '../../services/emailService.js';
import { insertInAppNotification } from '../notifications/notificationsController.js';
import { daysInMonth, ymd } from './payrollCalculator.js';
import { PayrollSettings, sanitizeSettings } from './payrollSettings.js';
import { companyToday, finaliseApprovedRun, generatePayrollRun } from './payrollEngine.js';
import { sendPayslipsForRun } from './payslipMailer.js';
import { ensurePayrollSchema } from './payrollSchemaSetup.js';
import { monthName } from './payslipPdf.js';

export interface PayCycle {
  payMonth: number;
  payYear: number;
  salaryDate: string;
  generateDate: string;
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function cycleForSalaryMonth(year: number, month: number, s: PayrollSettings): PayCycle {
  const salaryDate = ymd(year, month, Math.min(s.automation.salaryDay, daysInMonth(year, month)));
  let payMonth = month;
  let payYear = year;
  if (s.automation.payFor === 'PREVIOUS_MONTH') {
    payMonth = month === 1 ? 12 : month - 1;
    payYear = month === 1 ? year - 1 : year;
  }
  return { payMonth, payYear, salaryDate, generateDate: addDays(salaryDate, -s.automation.generateDaysBefore) };
}

/** The pay cycle "today" belongs to: from its generate date until 7 days after salary day. */
export function activeCycle(today: string, s: PayrollSettings): PayCycle | null {
  const [y, m] = today.split('-').map(Number);
  const candidates = [
    cycleForSalaryMonth(y, m, s),
    cycleForSalaryMonth(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, s),
  ];
  return candidates.find((c) => today >= c.generateDate && today <= addDays(c.salaryDate, 7)) || null;
}

async function notifyAdmins(companyId: string, title: string, message: string) {
  try {
    const [admins]: any = await pool.query(
      `SELECT id FROM users WHERE company_id = ? AND LOWER(role) IN ('admin', 'employer', 'hr') AND LOWER(status) = 'active'`,
      [companyId]
    );
    for (const a of admins) {
      await insertInAppNotification({ userId: a.id, type: 'PAYROLL', title, message, link: '/payroll/processing' });
    }
  } catch (err: any) {
    logger.warn(`Payroll notification failed: ${err.message}`);
  }
}

export interface TickOutcome {
  companyId: string;
  action: string;
  detail?: string;
}

/** Process one company. Safe to call repeatedly: every step checks the stored state first. */
export async function processCompanyPayroll(companyId: string, settings: PayrollSettings, now = new Date()): Promise<TickOutcome> {
  const a = settings.automation;
  const clock = companyToday(a.utcOffsetMinutes, now);
  const cycle = activeCycle(clock.date, settings);
  if (!cycle) return { companyId, action: 'idle', detail: 'Outside the payroll window' };

  const label = `${monthName(cycle.payMonth)} ${cycle.payYear}`;
  const [runs]: any = await pool.query(
    'SELECT * FROM payroll_runs WHERE company_id = ? AND payroll_month = ? AND payroll_year = ? LIMIT 1',
    [companyId, cycle.payMonth, cycle.payYear]
  );
  let run = runs[0];

  // 1. Draft generation
  if (!run) {
    const gen = await generatePayrollRun(companyId, cycle.payMonth, cycle.payYear, { auto: true });
    await notifyAdmins(companyId, `Payroll for ${label} is ready for review`,
      `${gen.items.length} employees, net pay ₹${Math.round(gen.totals.net).toLocaleString('en-IN')}. ` +
      (a.requireApproval ? `Approve it before ${cycle.salaryDate} so payslips go out on salary day.` : `Payslips will be e-mailed automatically on ${cycle.salaryDate}.`));
    const [fresh]: any = await pool.query('SELECT * FROM payroll_runs WHERE id = ?', [gen.runId]);
    run = fresh[0];
    if (clock.date < cycle.salaryDate) return { companyId, action: 'generated', detail: label };
  }

  // 2. Salary day
  if (clock.date < cycle.salaryDate || (clock.date === cycle.salaryDate && clock.hour < a.sendHour)) {
    return { companyId, action: 'waiting', detail: `Payslips for ${label} go out on ${cycle.salaryDate} at ${a.sendHour}:00` };
  }

  const status = String(run.status).toUpperCase();
  if (status === 'CANCELLED') return { companyId, action: 'skipped', detail: `${label} run is cancelled` };

  if (status === 'CALCULATED' || status === 'DRAFT' || status === 'UNDER_REVIEW') {
    if (a.requireApproval) {
      const [prev]: any = await pool.query('SELECT last_tick_result FROM payroll_settings WHERE company_id = ?', [companyId]);
      const marker = `awaiting-approval:${run.id}:${clock.date}`;
      if (!String(prev[0]?.last_tick_result || '').includes(marker)) {
        await notifyAdmins(companyId, `Payroll for ${label} needs approval`, 'Salary day has arrived. Approve the payroll run to e-mail payslips.');
      }
      return { companyId, action: 'awaiting-approval', detail: marker };
    }
    // Auto mode: refresh the draft with the final attendance, then approve it
    if (Number(run.auto_generated) === 1) {
      await generatePayrollRun(companyId, cycle.payMonth, cycle.payYear, { auto: true });
    }
    await pool.query(
      `UPDATE payroll_runs SET status = 'APPROVED', approved_at = NOW(), locked_at = NOW() WHERE id = ? AND status IN ('CALCULATED', 'DRAFT', 'UNDER_REVIEW')`,
      [run.id]
    );
    await pool.query(`UPDATE payroll_items SET status = 'APPROVED' WHERE payroll_run_id = ?`, [run.id]);
    await finaliseApprovedRun(run.id, companyId);
  }

  if (!isEmailConfigured()) {
    return { companyId, action: 'approved-no-smtp', detail: 'Payroll approved, but e-mail (SMTP) is not configured on the server, so payslips were not sent' };
  }
  const sent = await sendPayslipsForRun(run.id, companyId, { ccEmail: a.hrCcEmail || undefined });
  if (sent.sent > 0 || sent.failed > 0) {
    await notifyAdmins(companyId, `Payslips for ${label} e-mailed`, `${sent.sent} sent${sent.failed ? `, ${sent.failed} failed (see Payroll)` : ''}.`);
  }
  return { companyId, action: 'emailed', detail: `${sent.sent} sent, ${sent.failed} failed, ${sent.skipped} already sent` };
}

let running = false;

/** Check every company with automation switched on. Each company is claimed so parallel servers don't overlap. */
export async function runPayrollAutomationTick(now = new Date()): Promise<TickOutcome[]> {
  if (running) return [];
  running = true;
  const outcomes: TickOutcome[] = [];
  try {
    await ensurePayrollSchema();
    const [rows]: any = await pool.query('SELECT company_id, settings_json FROM payroll_settings');
    for (const row of rows) {
      let settings: PayrollSettings;
      try { settings = sanitizeSettings(JSON.parse(row.settings_json)); } catch { continue; }
      if (!settings.automation.enabled) continue;
      const [claim]: any = await pool.query(
        `UPDATE payroll_settings SET last_tick_at = NOW() WHERE company_id = ? AND (last_tick_at IS NULL OR last_tick_at < (NOW() - INTERVAL 5 MINUTE))`,
        [row.company_id]
      );
      if (!claim.affectedRows) continue;
      let outcome: TickOutcome;
      try {
        outcome = await processCompanyPayroll(row.company_id, settings, now);
      } catch (err: any) {
        logger.error(`Payroll automation failed for ${row.company_id}: ${err.message}`);
        outcome = { companyId: row.company_id, action: 'error', detail: err.message };
      }
      await pool.query('UPDATE payroll_settings SET last_tick_result = ? WHERE company_id = ?', [
        JSON.stringify({ at: new Date().toISOString(), ...outcome }), row.company_id,
      ]);
      outcomes.push(outcome);
    }
  } finally {
    running = false;
  }
  return outcomes;
}

let timer: NodeJS.Timeout | null = null;

export function startPayrollScheduler(): void {
  if (timer || process.env.PAYROLL_SCHEDULER === 'off' || process.env.NODE_ENV === 'test') return;
  const tick = () => runPayrollAutomationTick().catch((err) => logger.error(`Payroll scheduler tick failed: ${err.message}`));
  setTimeout(tick, 60 * 1000);
  timer = setInterval(tick, 15 * 60 * 1000);
  timer.unref?.();
  logger.info('Payroll automation scheduler started (checks every 15 minutes).');
}
