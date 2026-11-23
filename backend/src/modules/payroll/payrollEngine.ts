import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';
import { ensureBiometricSchema } from '../zkteco/biometricSchema.js';
import { calculateEmployeeLeaveSummary } from '../leave/leaveCalculationService.js';
import {
  AttendanceDay,
  LeaveDay,
  MonthInput,
  PayableDaysPolicy,
  PayrollResult,
  PtSlab,
  calculateMonthlyPayroll,
  classifyMonth,
  daysInMonth,
  isPaidLeaveType,
  ymd,
} from './payrollCalculator.js';
import { PayrollSettings, loadPayrollSettings } from './payrollSettings.js';
import { ensurePayrollSchema } from './payrollSchemaSetup.js';

const APPROVED_LEAVE_SQL = `(UPPER(lr.status) = 'APPROVED' OR UPPER(lr.employer_status) = 'APPROVED' OR UPPER(lr.admin_status) = 'APPROVED')
  AND UPPER(COALESCE(lr.status, '')) NOT IN ('REJECTED', 'CANCELLED', 'WITHDRAWN')
  AND UPPER(COALESCE(lr.employer_status, '')) <> 'REJECTED' AND UPPER(COALESCE(lr.admin_status, '')) <> 'REJECTED'`;

const PRESENT_RANK: Record<string, number> = { PRESENT: 5, LATE: 5, EARLY_LEAVING: 5, ON_DUTY: 5, WORK_FROM_HOME: 5, HALF_DAY: 4, MISSING_PUNCH: 3 };

export interface EmployeeRow {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  status: string;
  department: string | null;
  designation: string | null;
  salary: number;
  joiningDate: string | null;
  lastWorkingDate: string | null;
  gender: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  pan: string | null;
  uan: string | null;
  pfApplicable: number | null;
  taxRegime: string | null;
}

export interface CompanyMonthData {
  companyId: string;
  year: number;
  month: number;
  monthStart: string;
  monthEnd: string;
  today: string;
  holidays: Set<string>;
  holidayNames: Map<string, string>;
  ptSlabs: PtSlab[] | null;
  employees: EmployeeRow[];
  attendance: Map<string, Map<string, AttendanceDay & { clockIn?: string; clockOut?: string; workHours?: number }>>;
  leaves: Map<string, Map<string, LeaveDay>>;
}

export function companyToday(utcOffsetMinutes = 330, now = new Date()): { date: string; hour: number; day: number; month: number; year: number } {
  const local = new Date(now.getTime() + utcOffsetMinutes * 60000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth() + 1;
  const day = local.getUTCDate();
  return { date: ymd(year, month, day), hour: local.getUTCHours(), day, month, year };
}

function dateOnly(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return ymd(v.getFullYear(), v.getMonth() + 1, v.getDate());
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * Load everything needed to compute a month for a company with a handful of queries
 * (used by payroll and by the Excel attendance feed).
 */
export async function loadCompanyMonthData(
  companyId: string,
  year: number,
  month: number,
  settings: PayrollSettings,
  options: { includeEmployeeIds?: string[] } = {}
): Promise<CompanyMonthData> {
  await ensureBiometricSchema().catch(() => undefined);
  await ensurePayrollSchema();
  const monthStart = ymd(year, month, 1);
  const monthEnd = ymd(year, month, daysInMonth(year, month));
  const today = companyToday(settings.automation.utcOffsetMinutes).date;

  const empParams: any[] = [companyId, monthStart];
  let empSql = `
    SELECT u.id, u.employee_id AS employeeCode, u.full_name AS fullName, u.email, u.status,
           ep.department_name AS department, ep.designation, ep.salary, ep.joining_date AS joiningDate,
           ep.last_working_date AS lastWorkingDate, ep.gender, ep.bank_name AS bankName,
           ep.account_number AS accountNumber, ep.ifsc, ep.pan, ep.uan, ep.pf_applicable AS pfApplicable,
           ep.tax_regime AS taxRegime
    FROM users u
    JOIN employee_profiles ep ON ep.user_id = u.id
    WHERE u.company_id = ?
      AND (LOWER(u.status) = 'active' OR (ep.last_working_date IS NOT NULL AND ep.last_working_date >= ?))`;
  if (options.includeEmployeeIds && options.includeEmployeeIds.length > 0) {
    empSql += ` AND u.id IN (${options.includeEmployeeIds.map(() => '?').join(',')})`;
    empParams.push(...options.includeEmployeeIds);
  }
  empSql += ' ORDER BY u.employee_id';
  const [empRows]: any = await pool.query(empSql, empParams);
  const employees: EmployeeRow[] = (empRows || []).map((r: any) => ({ ...r, salary: Number(r.salary) || 0 }));

  const holidays = new Set<string>();
  const holidayNames = new Map<string, string>();
  try {
    const [hol]: any = await pool.query(
      `SELECT event_date, title FROM company_events
       WHERE UPPER(event_type) IN ('FESTIVAL', 'HOLIDAY', 'PUBLIC_HOLIDAY')
         AND (company_id = ? OR company_id IS NULL) AND event_date >= ? AND event_date <= ?`,
      [companyId, monthStart, monthEnd]
    );
    for (const h of hol) {
      const d = dateOnly(h.event_date);
      if (d) { holidays.add(d); holidayNames.set(d, h.title); }
    }
  } catch (err: any) {
    logger.warn(`Holiday lookup failed: ${err.message}`);
  }

  let ptSlabs: PtSlab[] | null = null;
  try {
    const [pt]: any = await pool.query(
      `SELECT min_gross AS minGross, max_gross AS maxGross, monthly_tax AS monthlyTax, february_tax AS februaryTax
       FROM professional_tax_slabs WHERE LOWER(state) = LOWER(?) AND is_active = 1 ORDER BY min_gross`,
      [settings.ptState]
    );
    if (pt && pt.length > 0) ptSlabs = pt.map((s: any) => ({ minGross: Number(s.minGross), maxGross: Number(s.maxGross), monthlyTax: Number(s.monthlyTax), februaryTax: s.februaryTax != null ? Number(s.februaryTax) : null }));
  } catch { /* table optional */ }

  const attendance = new Map<string, Map<string, any>>();
  const leaves = new Map<string, Map<string, LeaveDay>>();
  const ids = employees.map((e) => e.id);
  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    const [attRows]: any = await pool.query(
      `SELECT user_id, work_date, status, overtime_hours, late_minutes, clock_in, clock_out, work_hours
       FROM attendance WHERE user_id IN (${ph}) AND work_date >= ? AND work_date <= ?`,
      [...ids, monthStart, `${monthEnd} 23:59:59`]
    );
    for (const a of attRows) {
      const d = dateOnly(a.work_date);
      if (!d) continue;
      if (!attendance.has(a.user_id)) attendance.set(a.user_id, new Map());
      const byDate = attendance.get(a.user_id)!;
      const status = String(a.status || '').toUpperCase();
      const prev = byDate.get(d);
      if (!prev || (PRESENT_RANK[status] || 0) > (PRESENT_RANK[String(prev.status).toUpperCase()] || 0)) {
        byDate.set(d, {
          status,
          overtimeHours: Number(a.overtime_hours) || 0,
          lateMinutes: Number(a.late_minutes) || 0,
          clockIn: a.clock_in || undefined,
          clockOut: a.clock_out || undefined,
          workHours: Number(a.work_hours) || 0,
        });
      }
    }

    const [leaveRows]: any = await pool.query(
      `SELECT lr.user_id, lr.leave_type, lr.start_date, lr.end_date FROM leave_requests lr
       WHERE lr.user_id IN (${ph}) AND lr.start_date <= ? AND lr.end_date >= ? AND ${APPROVED_LEAVE_SQL}`,
      [...ids, monthEnd, monthStart]
    );
    for (const l of leaveRows) {
      const start = dateOnly(l.start_date);
      const end = dateOnly(l.end_date) || start;
      if (!start || !end) continue;
      if (!leaves.has(l.user_id)) leaves.set(l.user_id, new Map());
      const byDate = leaves.get(l.user_id)!;
      const from = start < monthStart ? monthStart : start;
      const to = end > monthEnd ? monthEnd : end;
      const [fy, fm, fd] = from.split('-').map(Number);
      const lastDay = Number(to.split('-')[2]);
      for (let d = fd; d <= lastDay; d++) {
        const date = ymd(fy, fm, d);
        byDate.set(date, { leaveType: normaliseLeaveType(l.leave_type), paid: isPaidLeaveType(l.leave_type) });
      }
    }
  }

  return { companyId, year, month, monthStart, monthEnd, today, holidays, holidayNames, ptSlabs, employees, attendance, leaves };
}

export function normaliseLeaveType(t: string): string {
  const s = String(t || '').trim().toUpperCase();
  if (s === 'CL' || s.includes('CASUAL')) return 'CL';
  if (s === 'PL' || s.includes('PRIVILEGE')) return 'PL';
  if (s === 'EL' || s.includes('EARNED')) return 'EL';
  if (s === 'SL' || s.includes('SICK')) return 'SL';
  if (s.includes('LWP') || s.includes('UNPAID') || s.includes('WITHOUT PAY') || s === 'LOP') return 'LWP';
  if (s.includes('COMP')) return 'COMP-OFF';
  if (s.includes('MATERN')) return 'ML';
  return s.slice(0, 10) || 'LEAVE';
}

export function monthInputFor(data: CompanyMonthData, employeeId: string): MonthInput {
  return {
    year: data.year,
    month: data.month,
    today: data.today,
    holidays: data.holidays,
    attendance: data.attendance.get(employeeId) || new Map(),
    leaves: data.leaves.get(employeeId) || new Map(),
    ptSlabs: data.ptSlabs,
  };
}

export function classifyEmployeeMonth(data: CompanyMonthData, emp: EmployeeRow, settings: PayrollSettings) {
  return classifyMonth({ joiningDate: emp.joiningDate, lastWorkingDate: emp.lastWorkingDate }, monthInputFor(data, emp.id), settings);
}

export interface GeneratedItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeEmail: string | null;
  result: PayrollResult;
  leaveSummary: any;
}

export interface GenerateOptions {
  actorId?: string | null;
  auto?: boolean;
  payableDaysPolicy?: PayableDaysPolicy;
}

export class PayrollLockedError extends Error {
  constructor(public status: string, message: string) {
    super(message);
  }
}

/**
 * Generate (or regenerate) the payroll run of a company for one month.
 * Runs that are APPROVED / PROCESSED / PAID are locked and never recalculated.
 */
export async function generatePayrollRun(companyId: string, month: number, year: number, opts: GenerateOptions = {}) {
  const baseSettings = await loadPayrollSettings(companyId);
  const settings: PayrollSettings = opts.payableDaysPolicy ? { ...baseSettings, payableDaysPolicy: opts.payableDaysPolicy } : baseSettings;
  const data = await loadCompanyMonthData(companyId, year, month, settings);

  const calendarDays = daysInMonth(year, month);
  const financialYear = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

  const [existing]: any = await pool.query(
    'SELECT id, status FROM payroll_runs WHERE payroll_month = ? AND payroll_year = ? AND company_id = ? LIMIT 1',
    [month, year, companyId]
  );
  let runId: string;
  if (existing.length > 0) {
    const st = String(existing[0].status).toUpperCase();
    if (['APPROVED', 'PROCESSED', 'PAID', 'LOCKED'].includes(st)) {
      throw new PayrollLockedError(st, `Payroll for ${month}/${year} is ${st} and can no longer be recalculated.`);
    }
    runId = existing[0].id;
    await pool.query('DELETE FROM payroll_items WHERE payroll_run_id = ? AND company_id = ?', [runId, companyId]);
  } else {
    runId = uuidv4();
    await pool.query(
      `INSERT INTO payroll_runs (id, company_id, payroll_month, payroll_year, financial_year, pay_period_start, pay_period_end,
         status, payable_days_policy, calculated_by, calculated_at, auto_generated)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CALCULATED', ?, ?, NOW(), ?)`,
      [runId, companyId, month, year, financialYear, data.monthStart, ymd(year, month, calendarDays), settings.payableDaysPolicy, opts.actorId || null, opts.auto ? 1 : 0]
    );
  }

  const ids = data.employees.map((e) => e.id);
  const ytd = new Map<string, { taxableGross: number; tds: number; months: number }>();
  const fyStartYear = month >= 4 ? year : year - 1;
  /** FY months before this one in which the employee was employed (by joining date) */
  const monthsEmployedBefore = (joiningDate: string | null) => {
    let startY = fyStartYear;
    let startM = 4;
    const doj = joiningDate ? String(joiningDate).match(/^(\d{4})-(\d{2})/) : null;
    if (doj) {
      const jy = Number(doj[1]);
      const jm = Number(doj[2]);
      if (jy * 12 + jm > startY * 12 + startM) { startY = jy; startM = jm; }
    }
    return Math.max(0, year * 12 + month - (startY * 12 + startM));
  };
  const loans = new Map<string, number>();
  const reimb = new Map<string, number>();
  const arrears = new Map<string, number>();
  const declarations = new Map<string, any>();
  const structures = new Map<string, any>();
  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    const safe = async (sql: string, params: any[]) => {
      try { const [rows]: any = await pool.query(sql, params); return rows as any[]; } catch (err: any) { logger.warn(`Payroll lookup skipped: ${err.message}`); return []; }
    };
    for (const r of await safe(
      `SELECT pi.employee_id, SUM(pi.gross_earnings) AS g, SUM(pi.tds) AS t, COUNT(DISTINCT pr.id) AS months
       FROM payroll_items pi JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
       WHERE pr.company_id = ? AND pr.financial_year = ? AND (pr.payroll_year * 100 + pr.payroll_month) < ?
         AND UPPER(pr.status) <> 'CANCELLED' AND pi.employee_id IN (${ph})
       GROUP BY pi.employee_id`,
      [companyId, financialYear, year * 100 + month, ...ids]
    )) ytd.set(r.employee_id, { taxableGross: Number(r.g) || 0, tds: Number(r.t) || 0, months: Number(r.months) || 0 });

    for (const r of await safe(
      `SELECT employee_id, SUM(LEAST(monthly_emi, remaining_amount)) AS emi FROM employee_loans_advancements
       WHERE UPPER(status) = 'ACTIVE' AND remaining_amount > 0 AND start_date <= ? AND employee_id IN (${ph}) GROUP BY employee_id`,
      [ymd(year, month, calendarDays), ...ids]
    )) loans.set(r.employee_id, Number(r.emi) || 0);

    for (const r of await safe(
      `SELECT employee_id, SUM(amount) AS amt FROM reimbursements
       WHERE UPPER(status) = 'APPROVED' AND (payroll_run_id IS NULL OR payroll_run_id = ?) AND employee_id IN (${ph}) GROUP BY employee_id`,
      [runId, ...ids]
    )) reimb.set(r.employee_id, Number(r.amt) || 0);

    for (const r of await safe(
      `SELECT employee_id, SUM(gross_difference_total) AS amt FROM salary_arrears
       WHERE UPPER(status) = 'PENDING' AND (paid_in_payroll_run_id IS NULL OR paid_in_payroll_run_id = ?) AND employee_id IN (${ph}) GROUP BY employee_id`,
      [runId, ...ids]
    )) arrears.set(r.employee_id, Number(r.amt) || 0);

    for (const r of await safe(
      `SELECT * FROM employee_tax_declarations WHERE financial_year = ? AND employee_id IN (${ph}) ORDER BY updated_at`,
      [financialYear, ...ids]
    )) declarations.set(r.employee_id, r);

    for (const r of await safe(
      `SELECT employee_id, monthly_gross, structure_snapshot_json FROM employee_salary_structures WHERE is_active = 1 AND employee_id IN (${ph}) ORDER BY effective_from`,
      ids
    )) structures.set(r.employee_id, r);
  }

  const items: GeneratedItem[] = [];
  const runWarnings: string[] = [];
  let totals = { gross: 0, deductions: 0, net: 0, employerCost: 0 };

  for (const emp of data.employees) {
    try {
      const struct = structures.get(emp.id);
      let components: any = null;
      let monthlyGross = emp.salary;
      if (struct) {
        monthlyGross = Number(struct.monthly_gross) || monthlyGross;
        try {
          const snap = struct.structure_snapshot_json ? JSON.parse(struct.structure_snapshot_json) : null;
          if (snap) components = { basic: snap.basic, hra: snap.hra, conveyance: snap.conveyance, medical: snap.medical, special: snap.specialAllowance ?? snap.special };
        } catch { /* ignore malformed snapshot */ }
      }
      if (!monthlyGross || monthlyGross <= 0) {
        runWarnings.push(`${emp.fullName} (${emp.employeeCode}) skipped: monthly salary not set`);
        continue;
      }
      const decl = declarations.get(emp.id);
      const prevEmployer = decl ? { g: Number(decl.previous_employer_income) || 0, t: Number(decl.previous_employer_tds) || 0 } : { g: 0, t: 0 };
      const y = ytd.get(emp.id) || { taxableGross: 0, tds: 0, months: 0 };
      // Months worked this FY that were paid outside this system (no payroll run, no previous-employer declaration)
      const assumedPriorMonths = prevEmployer.g > 0 ? 0 : Math.max(0, monthsEmployedBefore(emp.joiningDate) - y.months);
      const regimeRaw = String(emp.taxRegime || decl?.regime || 'NEW').toUpperCase();

      const result = calculateMonthlyPayroll(
        {
          monthlyGross,
          components,
          joiningDate: emp.joiningDate,
          lastWorkingDate: emp.lastWorkingDate,
          gender: emp.gender,
          pfApplicable: emp.pfApplicable === null || emp.pfApplicable === undefined ? true : Number(emp.pfApplicable) === 1,
          hasPan: !!(emp.pan && String(emp.pan).trim()),
          taxRegime: regimeRaw === 'OLD' ? 'OLD' : 'NEW',
          declarations: decl ? { section80C: Number(decl.declared_80c) || 0, section80D: Number(decl.declared_80d) || 0, hraExemption: Number(decl.declared_hra) || 0, other: Number(decl.other_deductions) || 0 } : undefined,
          ytd: { taxableGross: y.taxableGross + prevEmployer.g, tds: y.tds + prevEmployer.t },
          assumedPriorMonths,
          loanEmi: loans.get(emp.id) || 0,
          reimbursements: reimb.get(emp.id) || 0,
          arrears: arrears.get(emp.id) || 0,
        },
        monthInputFor(data, emp.id),
        settings
      );

      const empAttendance = data.attendance.get(emp.id);
      if (!empAttendance || empAttendance.size === 0) {
        result.warnings.push(settings.missingAttendanceRule === 'ABSENT'
          ? 'No attendance recorded this month: all past working days counted as absent'
          : 'No attendance recorded this month');
      }
      if (!emp.email) result.warnings.push('No e-mail address: payslip cannot be e-mailed');
      if (!emp.accountNumber) result.warnings.push('Bank account missing');

      let leaveSummary: any = null;
      try {
        const s = await calculateEmployeeLeaveSummary(emp.id);
        leaveSummary = {
          financialYear: s.financialYear.fyLabel,
          cl: { allocated: s.cl.allocated, used: s.cl.used, pending: s.cl.pending, balance: s.cl.remaining },
          pl: { allocated: s.pl.allocated, used: s.pl.used, pending: s.pl.pending, balance: s.pl.remaining },
        };
      } catch (err: any) {
        logger.warn(`Leave summary failed for ${emp.id}: ${err.message}`);
      }

      const breakdown = {
        employeeInfo: { id: emp.id, employeeCode: emp.employeeCode, fullName: emp.fullName, department: emp.department, designation: emp.designation, state: settings.ptState },
        attendanceSummary: { ...result.attendance, payableDays: result.payableDays, divisor: result.payableDivisor },
        dayCodes: classifyEmployeeMonth(data, emp, settings).map((d) => d.code),
        formulas: result.formulas,
        fixedComponents: result.fixed,
        earnedComponents: result.earned,
        statutoryDetails: { pf: result.pf, esic: result.esic, pt: result.pt, tds: result.tds },
        policy: { payableDaysPolicy: settings.payableDaysPolicy, basicPercent: settings.basicPercent, hraPercentOfBasic: settings.hraPercentOfBasic, missingAttendanceRule: settings.missingAttendanceRule },
        warnings: result.warnings,
        summary: { grossEarnings: result.grossEarnings, totalDeductions: result.totalDeductions, netSalary: result.netSalary, employerCost: result.employerCost },
      };

      const itemId = uuidv4();
      await pool.query(
        `INSERT INTO payroll_items
         (id, company_id, payroll_run_id, employee_id, employee_code, employee_name, employee_email, department, designation,
          bank_name, account_number, ifsc, pan, uan, calendar_days, working_days, present_days, absent_days,
          paid_leave_days, lop_days, payable_days, overtime_hours, basic_salary, hra, conveyance,
          special_allowance, medical_allowance, other_allowances, overtime_pay, reimbursements_amount, arrears_amount, bonus_incentive,
          lop_deduction_amount, gross_earnings, employee_pf, employee_esic, professional_tax, tds,
          loan_emi_deduction, other_deductions, total_deductions, net_salary, employer_pf, employer_esic,
          gratuity_provision, total_employer_cost, calculation_breakdown_json, leave_summary_json, warnings_json, status)
         VALUES (${new Array(49).fill('?').join(', ')}, 'CALCULATED')`,
        [
          itemId, companyId, runId, emp.id, emp.employeeCode || '', emp.fullName || '', emp.email || null, emp.department || null, emp.designation || null,
          emp.bankName || null, emp.accountNumber || null, emp.ifsc || null, emp.pan || null, emp.uan || null,
          result.attendance.calendarDays, result.attendance.workingDays, result.attendance.presentDays, result.attendance.absentDays,
          result.attendance.paidLeaveDays, result.attendance.lopDays, result.payableDays, result.attendance.overtimeHours,
          result.earned.basic, result.earned.hra, result.earned.conveyance, result.earned.special, result.earned.medical, 0,
          result.earned.overtime, result.reimbursements, result.earned.arrears, result.earned.bonus,
          result.lopDeductionAmount, result.grossEarnings, result.pf.employee, result.esic.employee, result.pt.amount, result.tds.monthly,
          result.loanEmi, result.otherDeductions, result.totalDeductions, result.netSalary, result.pf.employerTotal, result.esic.employer,
          result.gratuityProvision, result.employerCost, JSON.stringify(breakdown), leaveSummary ? JSON.stringify(leaveSummary) : null,
          result.warnings.length ? JSON.stringify(result.warnings) : null,
        ]
      );

      totals.gross += result.grossEarnings;
      totals.deductions += result.totalDeductions;
      totals.net += result.netSalary;
      totals.employerCost += result.employerCost;
      items.push({ id: itemId, employeeId: emp.id, employeeCode: emp.employeeCode, employeeName: emp.fullName, employeeEmail: emp.email, result, leaveSummary });
    } catch (err: any) {
      logger.error(`Payroll calculation failed for ${emp.id}: ${err.message}`);
      runWarnings.push(`${emp.fullName} (${emp.employeeCode}) failed: ${err.message}`);
    }
  }

  await pool.query(
    `UPDATE payroll_runs SET total_employees = ?, total_gross = ?, total_deductions = ?, total_net = ?, total_employer_cost = ?,
       status = 'CALCULATED', payable_days_policy = ?, calculated_at = NOW(), calculated_by = COALESCE(?, calculated_by), warnings_json = ?
     WHERE id = ? AND company_id = ?`,
    [items.length, totals.gross, totals.deductions, totals.net, totals.employerCost, settings.payableDaysPolicy, opts.actorId || null,
     runWarnings.length ? JSON.stringify(runWarnings) : null, runId, companyId]
  );

  return { runId, month, year, financialYear, totals, items, warnings: runWarnings, settings };
}

/**
 * Side effects when a run is approved: mark reimbursements / arrears as paid and post loan EMIs.
 * Guarded so it only happens once per run.
 */
export async function finaliseApprovedRun(runId: string, companyId: string): Promise<void> {
  const [items]: any = await pool.query('SELECT employee_id, loan_emi_deduction, reimbursements_amount, arrears_amount FROM payroll_items WHERE payroll_run_id = ? AND company_id = ?', [runId, companyId]);
  for (const it of items) {
    try {
      if (Number(it.reimbursements_amount) > 0) {
        await pool.query(`UPDATE reimbursements SET status = 'PAID', payroll_run_id = ? WHERE employee_id = ? AND UPPER(status) = 'APPROVED' AND (payroll_run_id IS NULL OR payroll_run_id = ?)`, [runId, it.employee_id, runId]);
      }
      if (Number(it.arrears_amount) > 0) {
        await pool.query(`UPDATE salary_arrears SET status = 'PAID', paid_in_payroll_run_id = ? WHERE employee_id = ? AND UPPER(status) = 'PENDING'`, [runId, it.employee_id]);
      }
      let emi = Number(it.loan_emi_deduction) || 0;
      if (emi > 0) {
        const [loans]: any = await pool.query(`SELECT id, monthly_emi, remaining_amount, paid_amount FROM employee_loans_advancements WHERE employee_id = ? AND UPPER(status) = 'ACTIVE' AND remaining_amount > 0 ORDER BY start_date`, [it.employee_id]);
        for (const loan of loans) {
          if (emi <= 0) break;
          const pay = Math.min(emi, Number(loan.monthly_emi), Number(loan.remaining_amount));
          const remaining = Math.max(0, Number(loan.remaining_amount) - pay);
          await pool.query(`UPDATE employee_loans_advancements SET paid_amount = paid_amount + ?, remaining_amount = ?, status = ? WHERE id = ?`, [pay, remaining, remaining <= 0 ? 'CLOSED' : 'ACTIVE', loan.id]);
          emi -= pay;
        }
      }
    } catch (err: any) {
      logger.warn(`Finalising payroll item for ${it.employee_id} skipped: ${err.message}`);
    }
  }
}
