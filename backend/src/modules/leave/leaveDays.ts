import { pool } from '../../database/index.js';
import { isWeeklyOff, ymd } from '../payroll/payrollCalculator.js';
import { loadPayrollSettings } from '../payroll/payrollSettings.js';

/** Leave types an employee can apply for. Balance-checked types have a yearly entitlement. */
export const LEAVE_TYPES: Record<string, { label: string; paid: boolean; balance: boolean }> = {
  CL: { label: 'Casual Leave', paid: true, balance: true },
  PL: { label: 'Privilege Leave', paid: true, balance: true },
  SL: { label: 'Sick Leave', paid: true, balance: true },
  LWP: { label: 'Leave Without Pay', paid: false, balance: false },
};

/** Map anything the UI or older data sends ("Casual Leave", "EL", "Unpaid") to a leave code, or null. */
export function normaliseLeaveCode(input: any): string | null {
  const t = String(input || '').trim().toUpperCase();
  if (!t) return null;
  if (t === 'CL' || t.includes('CASUAL')) return 'CL';
  if (t === 'PL' || t === 'EL' || t.includes('PRIVILEGE') || t.includes('EARNED')) return 'PL';
  if (t === 'SL' || t.includes('SICK') || t.includes('MEDICAL')) return 'SL';
  if (t === 'LWP' || t === 'LOP' || t.includes('WITHOUT PAY') || t.includes('UNPAID')) return 'LWP';
  return null;
}

export function parseDateOnly(v: any): string | null {
  const m = String(v || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export interface LeaveDayCount {
  days: number;
  workingDates: string[];
  skipped: { date: string; reason: string }[];
}

/**
 * Days of leave actually consumed between two dates: weekly offs and company holidays are not counted.
 * A half day is only possible for a single working day.
 */
export async function countLeaveDays(companyId: string | null, start: string, end: string, halfDay: boolean): Promise<LeaveDayCount> {
  const settings = await loadPayrollSettings(companyId);
  const holidays = new Map<string, string>();
  try {
    const [rows]: any = await pool.query(
      `SELECT event_date, title FROM company_events
       WHERE UPPER(event_type) IN ('FESTIVAL', 'HOLIDAY', 'PUBLIC_HOLIDAY') AND (company_id = ? OR company_id IS NULL)
         AND event_date >= ? AND event_date <= ?`,
      [companyId, start, end]
    );
    for (const r of rows) holidays.set(String(r.event_date).slice(0, 10), r.title);
  } catch { /* calendar optional */ }

  const workingDates: string[] = [];
  const skipped: { date: string; reason: string }[] = [];
  const [sy, sm, sd] = start.split('-').map(Number);
  const cursor = new Date(Date.UTC(sy, sm - 1, sd));
  for (let guard = 0; guard < 400; guard++) {
    const date = ymd(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate());
    if (date > end) break;
    if (holidays.has(date)) skipped.push({ date, reason: `Holiday: ${holidays.get(date)}` });
    else if (isWeeklyOff(date, settings)) skipped.push({ date, reason: 'Weekly off' });
    else workingDates.push(date);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const days = halfDay ? (workingDates.length === 1 ? 0.5 : workingDates.length) : workingDates.length;
  return { days, workingDates, skipped };
}
