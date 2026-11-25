import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { getTenantId } from '../../middleware/tenantMiddleware.js';
import { isHr, isSelf } from '../../security/accessControl.js';
import { insertInAppNotification } from '../notifications/notificationsController.js';
import { loadPayrollSettings } from '../payroll/payrollSettings.js';
import { classifyEmployeeMonth, loadCompanyMonthData } from '../payroll/payrollEngine.js';
import { ensurePayrollSchema } from '../payroll/payrollSchemaSetup.js';
import { parseDateOnly } from '../leave/leaveDays.js';

const STATUSES = ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_DUTY', 'WORK_FROM_HOME', 'HOLIDAY', 'WEEK_OFF'];
const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ success: false, error: { code, message } });

function parseTime(v: any): string | null {
  const m = String(v || '').trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

function hoursBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return Math.max(0, Math.round(((bh * 60 + bm - (ah * 60 + am)) / 60) * 100) / 100);
}

/** Insert or replace the attendance row of one employee for one day. */
async function writeAttendance(userId: string, companyId: string, workDate: string, status: string, clockIn: string | null, clockOut: string | null, source: 'MANUAL' | 'REGULARIZED', note: string) {
  await ensurePayrollSchema();
  const workHours = hoursBetween(clockIn, clockOut);
  const [existing]: any = await pool.query('SELECT id FROM attendance WHERE user_id = ? AND work_date = ? LIMIT 1', [userId, workDate]);
  if (existing.length) {
    await pool.query(
      `UPDATE attendance SET status = ?, clock_in = ?, clock_out = ?, work_hours = ?, late_minutes = 0, source = ?, notes = ?, company_id = COALESCE(company_id, ?) WHERE id = ?`,
      [status, clockIn, clockOut, workHours, source, note, companyId, existing[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO attendance (id, company_id, user_id, work_date, clock_in, clock_out, work_hours, status, late_minutes, overtime_hours, source, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [uuidv4(), companyId, userId, workDate, clockIn, clockOut, workHours, status, source, note]
    );
  }
}

async function companyEmployee(req: AuthRequest, userId: string) {
  const [rows]: any = await pool.query('SELECT id, full_name, company_id FROM users WHERE (id = ? OR employee_id = ?) AND company_id = ? LIMIT 1', [userId, userId, getTenantId(req)]);
  return rows[0] || null;
}

/** Employee asks HR to correct a day (missed punch, forgot to punch, on duty outside office). */
export async function createRegularization(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensurePayrollSchema();
    const workDate = parseDateOnly(req.body?.workDate);
    const clockIn = parseTime(req.body?.clockIn);
    const clockOut = parseTime(req.body?.clockOut);
    const requestedStatus = String(req.body?.requestedStatus || 'PRESENT').toUpperCase();
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    if (!workDate) return void fail(res, 400, 'VALIDATION_ERROR', 'Choose the date to correct.');
    const today = new Date().toISOString().slice(0, 10);
    if (workDate > today) return void fail(res, 400, 'VALIDATION_ERROR', 'You can only correct days that have already happened.');
    if (!['PRESENT', 'ON_DUTY', 'WORK_FROM_HOME', 'HALF_DAY'].includes(requestedStatus)) return void fail(res, 400, 'VALIDATION_ERROR', 'Choose Present, On duty, Work from home or Half day.');
    if (!clockIn || !clockOut || clockOut <= clockIn) return void fail(res, 400, 'VALIDATION_ERROR', 'Enter your in and out time (out must be after in).');
    if (reason.length < 5) return void fail(res, 400, 'VALIDATION_ERROR', 'Tell HR why the day needs correcting.');

    const [dup]: any = await pool.query(`SELECT id FROM attendance_regularizations WHERE user_id = ? AND work_date = ? AND status = 'PENDING'`, [req.user!.id, workDate]);
    if (dup.length) return void fail(res, 409, 'DUPLICATE', 'You already have a pending correction for this date.');

    const id = uuidv4();
    await pool.query(
      `INSERT INTO attendance_regularizations (id, company_id, user_id, work_date, clock_in, clock_out, requested_status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, getTenantId(req), req.user!.id, workDate, clockIn, clockOut, requestedStatus, reason]
    );
    const [hr]: any = await pool.query(`SELECT id FROM users WHERE company_id = ? AND role IN ('employer', 'admin') AND LOWER(status) = 'active'`, [getTenantId(req)]);
    for (const h of hr) {
      if (h.id === req.user!.id) continue;
      await insertInAppNotification({ userId: h.id, type: 'ATTENDANCE', title: 'Attendance correction to review', message: `${req.user!.fullName} asked to correct ${workDate} (${clockIn}–${clockOut}).`, link: '/attendance' });
    }
    res.status(201).json({ success: true, message: 'Correction sent to HR for approval.', data: { id } });
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Failed to submit correction');
  }
}

export async function listRegularizations(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensurePayrollSchema();
    const status = String(req.query.status || '').toUpperCase();
    let sql = `SELECT r.id, r.user_id AS userId, u.employee_id AS employeeCode, u.full_name AS employeeName, r.work_date AS workDate,
                      r.clock_in AS clockIn, r.clock_out AS clockOut, r.requested_status AS requestedStatus, r.reason, r.status,
                      r.review_note AS reviewNote, r.reviewed_at AS reviewedAt, r.created_at AS createdAt
               FROM attendance_regularizations r JOIN users u ON u.id = r.user_id WHERE u.company_id = ?`;
    const params: any[] = [getTenantId(req)];
    if (!isHr(req)) { sql += ' AND r.user_id = ?'; params.push(req.user!.id); }
    if (['PENDING', 'APPROVED', 'REJECTED'].includes(status)) { sql += ' AND r.status = ?'; params.push(status); }
    sql += ' ORDER BY r.created_at DESC LIMIT 300';
    const [rows]: any = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Failed to load corrections');
  }
}

export async function reviewRegularization(req: AuthRequest, res: Response): Promise<void> {
  try {
    const action = String(req.body?.action || '').toUpperCase();
    if (!['APPROVE', 'REJECT'].includes(action)) return void fail(res, 400, 'VALIDATION_ERROR', 'Action must be APPROVE or REJECT.');
    const [rows]: any = await pool.query(
      `SELECT r.*, u.company_id AS userCompany FROM attendance_regularizations r JOIN users u ON u.id = r.user_id WHERE r.id = ? AND u.company_id = ?`,
      [req.params.id, getTenantId(req)]
    );
    const r = rows[0];
    if (!r) return void fail(res, 404, 'NOT_FOUND', 'Correction request not found.');
    if (r.user_id === req.user!.id) return void fail(res, 403, 'SELF_APPROVAL_FORBIDDEN', 'You cannot approve your own correction.');
    if (r.status !== 'PENDING') return void fail(res, 409, 'ALREADY_DONE', `This request is already ${r.status.toLowerCase()}.`);
    const note = String(req.body?.note || '').trim().slice(0, 500) || null;
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await pool.query(`UPDATE attendance_regularizations SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ? WHERE id = ?`, [newStatus, req.user!.id, note, r.id]);
    if (newStatus === 'APPROVED') {
      await writeAttendance(r.user_id, r.userCompany, r.work_date, r.requested_status, r.clock_in, r.clock_out, 'REGULARIZED', `Regularised by ${req.user!.fullName}: ${r.reason}`);
    }
    await insertInAppNotification({
      userId: r.user_id,
      type: 'ATTENDANCE',
      title: `Attendance correction ${newStatus.toLowerCase()}`,
      message: `Your correction for ${r.work_date} was ${newStatus.toLowerCase()}${note ? `: ${note}` : '.'}`,
      link: '/my-attendance',
    });
    res.json({ success: true, message: `Correction ${newStatus.toLowerCase()}.` });
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Failed to review correction');
  }
}

/** HR sets or corrects any employee's attendance for a day. */
export async function setManualAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const workDate = parseDateOnly(req.body?.workDate);
    const status = String(req.body?.status || '').toUpperCase();
    const clockIn = req.body?.clockIn ? parseTime(req.body.clockIn) : null;
    const clockOut = req.body?.clockOut ? parseTime(req.body.clockOut) : null;
    if (!workDate) return void fail(res, 400, 'VALIDATION_ERROR', 'Choose a valid date.');
    if (!STATUSES.includes(status)) return void fail(res, 400, 'VALIDATION_ERROR', `Status must be one of ${STATUSES.join(', ')}.`);
    if ((req.body?.clockIn && !clockIn) || (req.body?.clockOut && !clockOut) || (clockIn && clockOut && clockOut <= clockIn)) {
      return void fail(res, 400, 'VALIDATION_ERROR', 'Times must be HH:MM and out must be after in.');
    }
    const emp = await companyEmployee(req, String(req.body?.userId || ''));
    if (!emp) return void fail(res, 404, 'NOT_FOUND', 'Employee not found in your company.');
    if (isSelf(req, emp.id)) return void fail(res, 403, 'FORBIDDEN', 'Ask another HR user to correct your own attendance.');
    const note = String(req.body?.note || '').trim().slice(0, 300);
    await writeAttendance(emp.id, emp.company_id, workDate, status, clockIn, clockOut, 'MANUAL', `Set by ${req.user!.fullName}${note ? `: ${note}` : ''}`);
    await pool.query(
      `INSERT INTO audit_logs (id, company_id, user_id, user_email, role, action, details) VALUES (UUID(), ?, ?, ?, ?, 'ATTENDANCE_CORRECTED', ?)`,
      [emp.company_id, req.user!.id, req.user!.email, req.user!.role, `${emp.full_name} ${workDate} -> ${status}${note ? ` (${note})` : ''}`]
    ).catch(() => undefined);
    res.json({ success: true, message: `Attendance for ${emp.full_name} on ${workDate} set to ${status.replace('_', ' ').toLowerCase()}.` });
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Failed to save attendance');
  }
}

/** Day-by-day attendance calendar for one employee and month, using exactly the payroll rules. */
export async function getAttendanceCalendar(req: AuthRequest, res: Response): Promise<void> {
  try {
    const target = String(req.query.userId || req.user!.id);
    if (!isSelf(req, target) && !isHr(req)) return void fail(res, 403, 'FORBIDDEN', 'You can only view your own attendance.');
    const m = String(req.query.month || '').match(/^(\d{4})-(\d{1,2})$/);
    const now = new Date();
    const year = m ? Number(m[1]) : now.getFullYear();
    const month = m ? Number(m[2]) : now.getMonth() + 1;
    const settings = await loadPayrollSettings(getTenantId(req));
    const [u]: any = await pool.query('SELECT id FROM users WHERE (id = ? OR employee_id = ?) AND company_id = ? LIMIT 1', [target, target, getTenantId(req)]);
    if (!u.length) return void fail(res, 404, 'NOT_FOUND', 'Employee not found.');
    const data = await loadCompanyMonthData(getTenantId(req), year, month, settings, { includeEmployeeIds: [u[0].id] });
    const emp = data.employees[0];
    if (!emp) return void res.json({ success: true, data: { year, month, days: [] } });
    const att = data.attendance.get(emp.id);
    const days = classifyEmployeeMonth(data, emp, settings).map((d) => {
      const a: any = att?.get(d.date);
      return { date: d.date, kind: d.kind, code: d.code, detail: d.detail || null, lop: d.lopUnits, clockIn: a?.clockIn || null, clockOut: a?.clockOut || null, workHours: a?.workHours || 0, lateMinutes: a?.lateMinutes || 0, holiday: data.holidayNames.get(d.date) || null };
    });
    res.json({ success: true, data: { year, month, employee: { id: emp.id, name: emp.fullName, code: emp.employeeCode }, days } });
  } catch (err: any) {
    fail(res, 500, 'SERVER_ERROR', err.message || 'Failed to load attendance calendar');
  }
}
