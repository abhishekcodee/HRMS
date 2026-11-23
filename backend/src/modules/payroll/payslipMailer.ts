import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';
import { getMailFrom, getSmtpTransporter, isEmailConfigured, isValidEmail } from '../../services/emailService.js';
import { monthName, parseJson, payslipLines, renderPayslipPdf } from './payslipPdf.js';
import { amountInWords } from './payrollCalculator.js';

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const inr = (v: any) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;
const n2 = (v: any) => { const x = Number(v) || 0; return Number.isInteger(x) ? String(x) : x.toFixed(1); };

export async function getCompanyInfo(companyId: string): Promise<{ name: string; address: string | null }> {
  try {
    const [rows]: any = await pool.query('SELECT name, address FROM companies WHERE id = ? LIMIT 1', [companyId]);
    if (rows.length > 0) return { name: rows[0].name || 'Company', address: rows[0].address || null };
  } catch { /* fall through */ }
  return { name: process.env.MAIL_FROM_NAME || 'Company', address: null };
}

export function renderPayslipEmailHtml(item: any, run: { payroll_month: number; payroll_year: number }, companyName: string): string {
  const { earnings, deductions, totalEarnings } = payslipLines(item);
  const leave = parseJson<any>(item.leave_summary_json);
  const period = `${monthName(run.payroll_month)} ${run.payroll_year}`;
  const row = (k: string, v: string, bold = false) =>
    `<tr><td style="padding:6px 0;color:#475569;font-size:14px">${esc(k)}</td><td style="padding:6px 0;text-align:right;font-size:14px;${bold ? 'font-weight:700;color:#0f172a' : 'color:#0f172a'}">${v}</td></tr>`;
  const leaveRow = (label: string, l: any) => l ? `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:13px">${label}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px">${n2(l.allocated)}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px">${n2(l.used)}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px">${n2(l.pending)}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:14px;font-weight:700;color:#16a34a">${n2(l.balance)}</td>
    </tr>` : '';

  return `<!doctype html><html><body style="margin:0;padding:16px;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#1e3a8a;padding:20px 24px;color:#fff">
      <div style="font-size:13px;opacity:.8">${esc(companyName)}</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px">Salary slip · ${esc(period)}</div>
    </div>
    <div style="padding:20px 24px">
      <p style="margin:0 0 14px;color:#0f172a;font-size:15px">Hi ${esc(String(item.employee_name || '').split(' ')[0])},</p>
      <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.5">Your salary for <b>${esc(period)}</b> has been processed. Your payslip is attached as a PDF.</p>
      <div style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center;margin-bottom:18px">
        <div style="font-size:12px;color:#1e40af;text-transform:uppercase;letter-spacing:.05em">Net pay</div>
        <div style="font-size:30px;font-weight:800;color:#1d4ed8;margin-top:4px">${inr(item.net_salary)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">${esc(amountInWords(Number(item.net_salary)))}</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${row('Paid days', `${n2(item.payable_days)} of ${n2(item.calendar_days)}`)}
        ${Number(item.lop_days) > 0 ? row('Loss-of-pay days', n2(item.lop_days)) : ''}
        ${row('Total earnings', inr(totalEarnings))}
        ${deductions.map(([k, v]) => row(k, `− ${inr(v)}`)).join('')}
        ${row('Net pay', inr(item.net_salary), true)}
      </table>
      ${leave && (leave.cl || leave.pl) ? `
      <div style="margin-top:22px;font-size:14px;font-weight:700;color:#0f172a">Your leave balance${leave.financialYear ? ` (FY ${esc(leave.financialYear)})` : ''}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <tr style="background:#f8fafc;color:#64748b;font-size:12px">
          <th style="padding:8px;text-align:left">Leave</th><th style="padding:8px">Entitled</th><th style="padding:8px">Availed</th><th style="padding:8px">Pending approval</th><th style="padding:8px">Balance</th>
        </tr>
        ${leaveRow('Casual Leave (CL)', leave.cl)}
        ${leaveRow('Privilege Leave (PL)', leave.pl)}
      </table>` : ''}
      <p style="margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">${earnings.length} earning and ${deductions.length} deduction lines are itemised in the attached PDF. Reply to HR if anything looks wrong.</p>
    </div>
  </div></body></html>`;
}

export interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
  dryRun: boolean;
  errors: { employee: string; error: string }[];
}

/**
 * E-mail payslips for a run. Each item is claimed atomically (email_status) so two servers or a double click
 * never send the same payslip twice. Pass `itemIds` to resend specific employees, `retryFailed` to retry failures.
 */
export async function sendPayslipsForRun(
  runId: string,
  companyId: string,
  opts: { itemIds?: string[]; resend?: boolean; ccEmail?: string } = {}
): Promise<SendResult> {
  const [runs]: any = await pool.query('SELECT * FROM payroll_runs WHERE id = ? AND company_id = ? LIMIT 1', [runId, companyId]);
  if (!runs.length) throw new Error('Payroll run not found');
  const run = runs[0];
  const company = await getCompanyInfo(companyId);
  const dryRun = !isEmailConfigured();
  const transporter = getSmtpTransporter();

  let sql = 'SELECT * FROM payroll_items WHERE payroll_run_id = ? AND company_id = ?';
  const params: any[] = [runId, companyId];
  if (opts.itemIds && opts.itemIds.length) {
    sql += ` AND id IN (${opts.itemIds.map(() => '?').join(',')})`;
    params.push(...opts.itemIds);
  }
  const [items]: any = await pool.query(sql, params);
  const result: SendResult = { sent: 0, failed: 0, skipped: 0, dryRun, errors: [] };

  for (const item of items) {
    const allowed = opts.resend ? "email_status IS NULL OR email_status <> 'SENDING'" : "email_status IS NULL OR email_status IN ('FAILED', 'DRY_RUN')";
    const [claim]: any = await pool.query(
      `UPDATE payroll_items SET email_status = 'SENDING', email_error = NULL WHERE id = ? AND (${allowed})`,
      [item.id]
    );
    if (!claim.affectedRows) { result.skipped++; continue; }

    let email = item.employee_email;
    if (!email) {
      const [u]: any = await pool.query('SELECT email FROM users WHERE id = ? LIMIT 1', [item.employee_id]);
      email = u[0]?.email || null;
    }
    if (!isValidEmail(email)) {
      await pool.query(`UPDATE payroll_items SET email_status = 'FAILED', email_error = ? WHERE id = ?`, ['No valid e-mail address on the employee profile', item.id]);
      result.failed++;
      result.errors.push({ employee: item.employee_name, error: 'No valid e-mail address' });
      continue;
    }

    try {
      const pdf = await renderPayslipPdf(item, run, company);
      const period = `${monthName(run.payroll_month)} ${run.payroll_year}`;
      await transporter.sendMail({
        from: getMailFrom(),
        to: email,
        cc: opts.ccEmail || undefined,
        subject: `Salary slip for ${period} – ${company.name}`,
        html: renderPayslipEmailHtml(item, run, company.name),
        attachments: [{ filename: `Payslip_${period.replace(' ', '_')}_${String(item.employee_code || item.employee_name).replace(/[^\w-]+/g, '_')}.pdf`, content: pdf, contentType: 'application/pdf' }],
      });
      await pool.query(`UPDATE payroll_items SET email_status = ?, emailed_at = NOW(), email_error = NULL WHERE id = ?`, [dryRun ? 'DRY_RUN' : 'SENT', item.id]);
      try {
        await pool.query(
          `INSERT INTO salary_slip_email_logs (id, employee_id, employee_email, salary_month, salary_year, salary_slip_file, email_subject, status, sent_at)
           VALUES (UUID(), ?, ?, ?, ?, 'payroll-run', ?, ?, NOW())`,
          [item.employee_code || item.employee_id, email, monthName(run.payroll_month), String(run.payroll_year), `Salary slip for ${period}`, dryRun ? 'DRY_RUN' : 'SENT']
        );
      } catch { /* log table is optional */ }
      result.sent++;
    } catch (err: any) {
      logger.error(`Payslip e-mail failed for ${item.employee_id}: ${err.message}`);
      await pool.query(`UPDATE payroll_items SET email_status = 'FAILED', email_error = ? WHERE id = ?`, [String(err.message).slice(0, 500), item.id]);
      result.failed++;
      result.errors.push({ employee: item.employee_name, error: err.message });
    }
  }

  if (result.sent > 0 && !dryRun) {
    await pool.query('UPDATE payroll_runs SET emailed_at = COALESCE(emailed_at, NOW()) WHERE id = ?', [runId]);
  }
  return result;
}
