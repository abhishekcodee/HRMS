import { Request, Response } from 'express';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { logger } from '../../utils/logger.js';
import { calculateMonthlyPayroll, daysInMonth } from '../payroll/payrollCalculator.js';
import { loadPayrollSettings } from '../payroll/payrollSettings.js';
import { classifyEmployeeMonth, companyToday, loadCompanyMonthData, monthInputFor } from '../payroll/payrollEngine.js';
import { ensurePayrollSchema } from '../payroll/payrollSchemaSetup.js';
import { getCompanyInfo } from '../payroll/payslipMailer.js';
import { monthName } from '../payroll/payslipPdf.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function resolveMonth(param: any, utcOffset: number): { year: number; month: number } {
  const today = companyToday(utcOffset);
  const p = String(param || 'current').toLowerCase();
  if (p === 'previous' || p === 'last') {
    return today.month === 1 ? { year: today.year - 1, month: 12 } : { year: today.year, month: today.month - 1 };
  }
  const m = p.match(/^(\d{4})-(\d{1,2})$/);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { year: Number(m[1]), month: Number(m[2]) };
  return { year: today.year, month: today.month };
}

export async function buildAttendanceWorkbook(companyId: string, year: number, month: number) {
  const settings = await loadPayrollSettings(companyId);
  const data = await loadCompanyMonthData(companyId, year, month, settings);
  const company = await getCompanyInfo(companyId);
  const total = daysInMonth(year, month);
  const title = `${company.name} – Attendance ${monthName(month)} ${year}`;
  const generated = `Updated ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;

  const summary: any[][] = [[title], [generated], [], [
    'Emp Code', 'Name', 'Department', 'Designation', 'Days in month', 'Present', 'Half days', 'Paid leave',
    'CL', 'PL', 'SL', 'Other leave', 'Absent / LWP', 'Holidays', 'Weekly offs', 'Late marks', 'Late minutes',
    'OT hours', 'LOP days', 'Payable days', 'Not yet joined / left',
  ]];
  const dayHeader = ['Emp Code', 'Name'];
  for (let d = 1; d <= total; d++) {
    const wd = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    dayHeader.push(`${d} ${WEEKDAYS[wd]}`);
  }
  dayHeader.push('P', 'HD', 'Leave', 'A/LWP', 'H', 'WO');
  const daily: any[][] = [[title], [generated], [], dayHeader];
  const punches: any[][] = [[title], [generated], [], ['Date', 'Emp Code', 'Name', 'Status', 'In', 'Out', 'Hours', 'Late (min)', 'OT (h)', 'Counted as']];

  for (const emp of data.employees) {
    const days = classifyEmployeeMonth(data, emp, settings);
    const pay = calculateMonthlyPayroll(
      { monthlyGross: emp.salary || 0, joiningDate: emp.joiningDate, lastWorkingDate: emp.lastWorkingDate },
      monthInputFor(data, emp.id),
      settings
    );
    const t = pay.attendance;
    const lb = t.leaveBreakdown;
    const cl = lb.CL || 0;
    const pl = lb.PL || 0;
    const sl = lb.SL || 0;
    summary.push([
      emp.employeeCode, emp.fullName, emp.department || '', emp.designation || '', t.calendarDays, t.presentDays, t.halfDays,
      t.paidLeaveDays, cl, pl, sl, Math.max(0, t.paidLeaveDays - cl - pl - sl), t.absentDays, t.holidays, t.weeklyOffs,
      t.lateCount, t.lateMinutes, t.overtimeHours, t.lopDays, pay.payableDays, t.notEmployedDays,
    ]);
    const counts = { P: 0, HD: 0, L: 0, A: 0, H: 0, WO: 0 };
    const row: any[] = [emp.employeeCode, emp.fullName];
    for (const d of days) {
      row.push(d.code === '-' ? '' : d.code);
      if (d.kind === 'PRESENT') counts.P++;
      else if (d.kind === 'HALF_DAY') counts.HD++;
      else if (d.kind === 'PAID_LEAVE') counts.L++;
      else if (d.kind === 'LOP') counts.A++;
      else if (d.kind === 'HOLIDAY') counts.H++;
      else if (d.kind === 'WEEK_OFF') counts.WO++;
    }
    row.push(counts.P, counts.HD, counts.L, counts.A, counts.H, counts.WO);
    daily.push(row);

    const att = data.attendance.get(emp.id);
    for (const d of days) {
      const a: any = att?.get(d.date);
      if (!a && d.kind !== 'LOP' && d.kind !== 'PAID_LEAVE') continue;
      punches.push([
        d.date, emp.employeeCode, emp.fullName, a?.status || '', a?.clockIn || '', a?.clockOut || '',
        a?.workHours || '', a?.lateMinutes || '', a?.overtimeHours || '', d.detail ? `${d.kind} (${d.detail})` : d.kind,
      ]);
    }
  }

  const legend: any[][] = [
    ['Code', 'Meaning'],
    ['P', 'Present'], ['P*', 'Future date (assumed present)'], ['HD', 'Half day'], ['CL / PL / SL …', 'Approved paid leave'],
    ['LWP', 'Approved leave without pay'], ['A', 'Absent (no punch and no approved leave)'], ['H', 'Holiday'], ['WO', 'Weekly off'],
    ['(blank)', 'Before joining / after last working day'],
    [],
    ['Payable days policy', settings.payableDaysPolicy],
    ['Weekly offs', settings.weeklyOffs.map((w) => WEEKDAYS[w]).join(', ') + (settings.secondFourthSaturdayOff ? ' + 2nd/4th Saturday' : '')],
    ['Days without any record', settings.missingAttendanceRule === 'ABSENT' ? 'Counted as absent' : 'Counted as present'],
    ['Holidays this month', Array.from(data.holidayNames.entries()).map(([d, n]) => `${d} ${n}`).join('; ') || 'None'],
  ];

  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: any[][], widths: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = widths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name);
    return ws;
  };
  add('Summary', summary, [12, 24, 16, 18, ...new Array(17).fill(10)]);
  add('Daily register', daily, [12, 24, ...new Array(total).fill(6), 5, 5, 6, 6, 5, 5]);
  add('In-Out', punches, [11, 12, 24, 14, 8, 8, 7, 9, 7, 28]);
  add('Legend', legend, [26, 70]);
  return { wb, summary, daily, punches, fileName: `Attendance_${monthName(month)}_${year}.xlsx` };
}

/** Public, token-protected live feed. Works with Excel "Data → From Web", Power Query and Google Sheets IMPORTDATA (csv). */
export async function attendanceFeedHandler(req: Request, res: Response): Promise<void> {
  try {
    await ensurePayrollSchema();
    const raw = String(req.params.token || '');
    const match = raw.match(/^([a-f0-9]{32,64})(?:\.(xlsx|csv))?$/i);
    if (!match) { res.status(404).send('Not found'); return; }
    const token = match[1].toLowerCase();
    const format = String(match[2] || req.query.format || 'xlsx').toLowerCase();
    const [rows]: any = await pool.query('SELECT company_id FROM attendance_feed_tokens WHERE token = ? LIMIT 1', [token]);
    if (!rows.length) { res.status(404).send('This attendance link is invalid or was revoked.'); return; }
    const companyId = rows[0].company_id;
    pool.query('UPDATE attendance_feed_tokens SET last_used_at = NOW() WHERE token = ?', [token]).catch(() => undefined);

    const settings = await loadPayrollSettings(companyId);
    const { year, month } = resolveMonth(req.query.month, settings.automation.utcOffsetMinutes);
    const book = await buildAttendanceWorkbook(companyId, year, month);

    res.setHeader('Cache-Control', 'no-store');
    if (format === 'csv') {
      const sheet = String(req.query.sheet || 'summary').toLowerCase();
      const rowsForCsv = sheet === 'daily' ? book.daily : sheet === 'punches' || sheet === 'in-out' ? book.punches : book.summary;
      const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rowsForCsv.slice(3)));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(csv);
      return;
    }
    const buf = XLSX.write(book.wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `${req.query.download === '0' ? 'inline' : 'attachment'}; filename="${book.fileName}"`);
    res.send(buf);
  } catch (err: any) {
    logger.error(`Attendance feed failed: ${err.message}`);
    res.status(500).send('Could not build the attendance file. Please try again.');
  }
}

export async function getFeedLinkHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensurePayrollSchema();
    const companyId = getTenantId(req);
    const [rows]: any = await pool.query('SELECT token, created_at, last_used_at FROM attendance_feed_tokens WHERE company_id = ? LIMIT 1', [companyId]);
    res.json({ success: true, data: rows[0] ? { token: rows[0].token, createdAt: rows[0].created_at, lastUsedAt: rows[0].last_used_at } : null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
}

export async function createFeedLinkHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensurePayrollSchema();
    const companyId = getTenantId(req);
    if (!companyId) { res.status(400).json({ success: false, error: { code: 'NO_COMPANY', message: 'Select a company first.' } }); return; }
    const token = crypto.randomBytes(24).toString('hex');
    await pool.query(
      `INSERT INTO attendance_feed_tokens (company_id, token, created_by, created_at, last_used_at) VALUES (?, ?, ?, NOW(), NULL)
       ON DUPLICATE KEY UPDATE token = VALUES(token), created_by = VALUES(created_by), created_at = NOW(), last_used_at = NULL`,
      [companyId, token, req.user?.id || null]
    );
    res.json({ success: true, message: 'New attendance link created. Any older link stops working.', data: { token } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
}

export async function revokeFeedLinkHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantId(req);
    await pool.query('DELETE FROM attendance_feed_tokens WHERE company_id = ?', [companyId]);
    res.json({ success: true, message: 'Attendance link turned off.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
}

/** Logged-in download (same workbook) for admins. */
export async function downloadAttendanceWorkbookHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companyId = getTenantId(req);
    if (!companyId) { res.status(400).json({ success: false, error: { code: 'NO_COMPANY', message: 'Select a company first.' } }); return; }
    const settings = await loadPayrollSettings(companyId);
    const { year, month } = resolveMonth(req.query.month, settings.automation.utcOffsetMinutes);
    const book = await buildAttendanceWorkbook(companyId, year, month);
    const buf = XLSX.write(book.wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${book.fileName}"`);
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
}
