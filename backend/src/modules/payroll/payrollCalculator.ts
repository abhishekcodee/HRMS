/**
 * Pure payroll calculation (no database access) so every rule is unit-testable.
 *
 * Indian payroll rules implemented:
 *  - Day-by-day attendance classification (present / paid leave / LOP / holiday / weekly off / not employed)
 *  - Payable-days policies: calendar days, fixed 30, fixed 26, working days
 *  - Wage split (Basic %, HRA % of Basic, Special = balance) or an explicit salary structure
 *  - Labour Code "wages" rule: allowances above 50% of pay are added back to the PF wage
 *  - EPF 12% (ceiling ₹15,000 by default), EPS 8.33%, EDLI 0.5%, admin 0.5%
 *  - ESIC 0.75% / 3.25% when fixed gross ≤ ₹21,000
 *  - State professional tax slabs (incl. February top-up and Maharashtra women's exemption)
 *  - TDS by projecting the financial-year income (new regime FY 2025-26 slabs with §87A rebate &
 *    marginal relief, or old regime with declarations), spreading the balance over the remaining months
 *  - Overtime, late-mark deductions, loans, reimbursements, arrears, gratuity provision
 */

export type PayableDaysPolicy = 'CALENDAR_DAYS' | 'FIXED_30' | 'FIXED_26' | 'WORKING_DAYS';
export type DayKind = 'PRESENT' | 'HALF_DAY' | 'PAID_LEAVE' | 'LOP' | 'HOLIDAY' | 'WEEK_OFF' | 'NOT_EMPLOYED' | 'PROJECTED';

export interface PayrollPolicy {
  payableDaysPolicy: PayableDaysPolicy;
  /** Weekly off weekdays, 0 = Sunday … 6 = Saturday */
  weeklyOffs: number[];
  /** Also treat the 2nd and 4th Saturday as off */
  secondFourthSaturdayOff: boolean;
  /** What a past working day with no punch and no approved leave counts as */
  missingAttendanceRule: 'ABSENT' | 'PRESENT';
  /** A day with a single punch (no regularisation yet) counts as: half day (default), present or absent */
  missedPunchRule: 'HALF_DAY' | 'PRESENT' | 'ABSENT';
  basicPercent: number;
  hraPercentOfBasic: number;
  overtimeEnabled: boolean;
  overtimeMultiplier: number;
  /** Every N late marks = half a day of LOP (0 = off) */
  lateMarksPerHalfDay: number;
  ptState: string;
  pf: { enabled: boolean; employeeRate: number; epsRate: number; ceiling: number; restrictToCeiling: boolean; edliRate: number; adminRate: number };
  esic: { enabled: boolean; threshold: number; employeeRate: number; employerRate: number };
}

export const DEFAULT_POLICY: PayrollPolicy = {
  payableDaysPolicy: 'CALENDAR_DAYS',
  weeklyOffs: [0],
  secondFourthSaturdayOff: false,
  missingAttendanceRule: 'ABSENT',
  missedPunchRule: 'HALF_DAY',
  basicPercent: 50,
  hraPercentOfBasic: 40,
  overtimeEnabled: false,
  overtimeMultiplier: 2,
  lateMarksPerHalfDay: 0,
  ptState: 'Maharashtra',
  pf: { enabled: true, employeeRate: 12, epsRate: 8.33, ceiling: 15000, restrictToCeiling: true, edliRate: 0.5, adminRate: 0.5 },
  esic: { enabled: true, threshold: 21000, employeeRate: 0.75, employerRate: 3.25 },
};

export interface AttendanceDay {
  status: string;
  overtimeHours?: number;
  lateMinutes?: number;
}

export interface LeaveDay {
  leaveType: string;
  paid: boolean;
  /** Half-day leave: only half of the day is covered by this leave */
  half?: boolean;
}

export interface SalaryComponents {
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  special: number;
}

export interface PtSlab {
  minGross: number;
  maxGross: number;
  monthlyTax: number;
  februaryTax?: number | null;
}

export interface EmployeePayrollInput {
  monthlyGross: number;
  components?: Partial<SalaryComponents> | null;
  joiningDate?: string | null;
  lastWorkingDate?: string | null;
  gender?: string | null;
  pfApplicable?: boolean;
  hasPan?: boolean;
  taxRegime?: 'NEW' | 'OLD';
  declarations?: { section80C?: number; section80D?: number; hraExemption?: number; other?: number };
  /** Earlier months of this financial year (already-paid payroll) */
  ytd?: { taxableGross: number; tds: number };
  /**
   * Earlier months of this FY in which the employee worked but which are not in the system (e.g. HRMS went live
   * mid-year). They are assumed paid at the fixed salary with TDS deducted evenly.
   */
  assumedPriorMonths?: number;
  loanEmi?: number;
  reimbursements?: number;
  arrears?: number;
  bonus?: number;
  otherDeductions?: number;
}

export interface MonthInput {
  year: number;
  month: number; // 1-12
  /** YYYY-MM-DD; days after this are counted as payable (projected) */
  today: string;
  holidays: Set<string>;
  attendance: Map<string, AttendanceDay>;
  leaves: Map<string, LeaveDay>;
  ptSlabs?: PtSlab[] | null;
}

const PRESENT_STATUSES = new Set(['PRESENT', 'LATE', 'EARLY_LEAVING', 'ON_DUTY', 'WORK_FROM_HOME', 'WFH', 'OTHER']);
const PAID_LEAVE_STATUSES = new Set(['PAID_LEAVE', 'COMP_OFF', 'LEAVE', 'CL', 'PL', 'SL', 'EL']);
const LOP_STATUSES = new Set(['ABSENT', 'UNPAID_LEAVE', 'LWP', 'LOP']);
const UNPAID_LEAVE_TYPES = ['LWP', 'LOP', 'UNPAID', 'WITHOUT PAY'];

export function isPaidLeaveType(leaveType: string): boolean {
  const t = String(leaveType || '').toUpperCase();
  return !UNPAID_LEAVE_TYPES.some((u) => t.includes(u));
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const rupee = (n: number) => Math.round(n);
const pad = (n: number) => String(n).padStart(2, '0');

export function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function normaliseDate(value?: string | null): string | null {
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function isWeeklyOff(date: string, policy: Pick<PayrollPolicy, 'weeklyOffs' | 'secondFourthSaturdayOff'>): boolean {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (policy.weeklyOffs.includes(weekday)) return true;
  if (policy.secondFourthSaturdayOff && weekday === 6) {
    const nth = Math.ceil(d / 7);
    if (nth === 2 || nth === 4) return true;
  }
  return false;
}

export interface ClassifiedDay {
  date: string;
  kind: DayKind;
  /** Short code for registers: P, HD, L, LOP, A, H, WO, -, P* */
  code: string;
  detail?: string;
  lopUnits: number;
  overtimeHours: number;
  lateMinutes: number;
  isLate: boolean;
}

/**
 * Classify every day of the month for one employee. This is shared by payroll and the Excel
 * attendance feed so both always agree.
 */
export function classifyMonth(
  employee: Pick<EmployeePayrollInput, 'joiningDate' | 'lastWorkingDate'>,
  month: Pick<MonthInput, 'year' | 'month' | 'today' | 'holidays' | 'attendance' | 'leaves'>,
  policy: Pick<PayrollPolicy, 'weeklyOffs' | 'secondFourthSaturdayOff' | 'missingAttendanceRule'> & Partial<Pick<PayrollPolicy, 'missedPunchRule'>>
): ClassifiedDay[] {
  const total = daysInMonth(month.year, month.month);
  const doj = normaliseDate(employee.joiningDate);
  const lwd = normaliseDate(employee.lastWorkingDate);
  const out: ClassifiedDay[] = [];

  for (let d = 1; d <= total; d++) {
    const date = ymd(month.year, month.month, d);
    const att = month.attendance.get(date);
    const leave = month.leaves.get(date);
    const status = String(att?.status || '').toUpperCase();
    const ot = Number(att?.overtimeHours) || 0;
    const late = Number(att?.lateMinutes) || 0;
    const base = { date, overtimeHours: ot, lateMinutes: late, isLate: status === 'LATE' || late > 0 };

    if ((doj && date < doj) || (lwd && date > lwd)) {
      out.push({ ...base, kind: 'NOT_EMPLOYED', code: '-', lopUnits: 0, overtimeHours: 0, lateMinutes: 0, isLate: false });
      continue;
    }

    // Worked days win over everything else (an approved leave on a day the person actually worked is not a loss of pay)
    if (PRESENT_STATUSES.has(status)) {
      out.push({ ...base, kind: 'PRESENT', code: 'P', lopUnits: 0 });
      continue;
    }
    if (status === 'MISSING_PUNCH') {
      const rule = policy.missedPunchRule || 'HALF_DAY';
      if (rule === 'PRESENT') out.push({ ...base, kind: 'PRESENT', code: 'P', detail: 'Missed punch (paid)', lopUnits: 0 });
      else if (rule === 'ABSENT' && !(leave && leave.paid)) out.push({ ...base, kind: 'LOP', code: 'MP', detail: 'Missed punch, not regularised', lopUnits: 1 });
      else {
        const covered = leave && leave.paid;
        out.push({ ...base, kind: 'HALF_DAY', code: 'MP', detail: covered ? `½ ${leave!.leaveType}` : 'Missed punch, not regularised', lopUnits: covered ? 0 : 0.5 });
      }
      continue;
    }
    if (status === 'HALF_DAY') {
      // The other half is covered by a paid leave if one was approved for that day
      const coveredByLeave = leave && leave.paid;
      out.push({ ...base, kind: 'HALF_DAY', code: 'HD', detail: coveredByLeave ? `½ ${leave!.leaveType}` : undefined, lopUnits: coveredByLeave ? 0 : 0.5 });
      continue;
    }

    if (month.holidays.has(date)) {
      out.push({ ...base, kind: 'HOLIDAY', code: 'H', lopUnits: 0 });
      continue;
    }
    if (isWeeklyOff(date, policy) || status === 'WEEK_OFF' || status === 'WEEKLY_OFF') {
      out.push({ ...base, kind: 'WEEK_OFF', code: 'WO', lopUnits: 0 });
      continue;
    }
    if (status === 'HOLIDAY') {
      out.push({ ...base, kind: 'HOLIDAY', code: 'H', lopUnits: 0 });
      continue;
    }

    if (leave && leave.half) {
      // Half the day is leave; the other half is worked only if there is a punch (handled above), so it is
      // absent in the past (unless the company treats days without a record as present) and assumed worked in the future
      const otherHalfLop = date > month.today || policy.missingAttendanceRule === 'PRESENT' ? 0 : 0.5;
      out.push({
        ...base,
        kind: 'HALF_DAY',
        code: 'HD',
        detail: `½ ${leave.leaveType}${leave.paid ? '' : ' (unpaid)'}`,
        lopUnits: (leave.paid ? 0 : 0.5) + otherHalfLop,
      });
      continue;
    }
    if (leave) {
      if (leave.paid) out.push({ ...base, kind: 'PAID_LEAVE', code: String(leave.leaveType).toUpperCase().slice(0, 4), detail: leave.leaveType, lopUnits: 0 });
      else out.push({ ...base, kind: 'LOP', code: 'LWP', detail: leave.leaveType, lopUnits: 1 });
      continue;
    }

    if (PAID_LEAVE_STATUSES.has(status)) {
      out.push({ ...base, kind: 'PAID_LEAVE', code: 'L', detail: status, lopUnits: 0 });
      continue;
    }
    if (LOP_STATUSES.has(status)) {
      out.push({ ...base, kind: 'LOP', code: 'A', detail: status, lopUnits: 1 });
      continue;
    }

    if (date > month.today) {
      out.push({ ...base, kind: 'PROJECTED', code: 'P*', detail: 'Future date', lopUnits: 0 });
      continue;
    }

    if (policy.missingAttendanceRule === 'PRESENT') {
      out.push({ ...base, kind: 'PRESENT', code: 'P', detail: 'No record (treated as present)', lopUnits: 0 });
    } else {
      out.push({ ...base, kind: 'LOP', code: 'A', detail: 'No punch / no approved leave', lopUnits: 1 });
    }
  }
  return out;
}

export interface AttendanceTotals {
  calendarDays: number;
  workingDays: number;
  presentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  holidays: number;
  weeklyOffs: number;
  absentDays: number;
  lopDays: number;
  lateLopDays: number;
  notEmployedDays: number;
  projectedDays: number;
  lateCount: number;
  lateMinutes: number;
  overtimeHours: number;
  leaveBreakdown: Record<string, number>;
}

export function summariseDays(days: ClassifiedDay[], lateMarksPerHalfDay = 0): AttendanceTotals {
  const t: AttendanceTotals = {
    calendarDays: days.length, workingDays: 0, presentDays: 0, halfDays: 0, paidLeaveDays: 0, holidays: 0,
    weeklyOffs: 0, absentDays: 0, lopDays: 0, lateLopDays: 0, notEmployedDays: 0,
    projectedDays: 0, lateCount: 0, lateMinutes: 0, overtimeHours: 0, leaveBreakdown: {},
  };
  for (const d of days) {
    switch (d.kind) {
      case 'PRESENT': t.presentDays += 1; t.workingDays += 1; break;
      case 'HALF_DAY':
        t.presentDays += 0.5; t.halfDays += 1; t.workingDays += 1;
        if (d.detail && d.detail.startsWith('½ ') && !d.detail.includes('unpaid')) {
          t.paidLeaveDays += 0.5;
          const k = d.detail.replace('½ ', '').toUpperCase();
          t.leaveBreakdown[k] = (t.leaveBreakdown[k] || 0) + 0.5;
        }
        break;
      case 'PAID_LEAVE': {
        t.paidLeaveDays += 1; t.workingDays += 1;
        const k = String(d.detail || d.code).toUpperCase();
        t.leaveBreakdown[k] = (t.leaveBreakdown[k] || 0) + 1;
        break;
      }
      case 'LOP': t.absentDays += 1; t.workingDays += 1; break;
      case 'HOLIDAY': t.holidays += 1; break;
      case 'WEEK_OFF': t.weeklyOffs += 1; break;
      case 'NOT_EMPLOYED': t.notEmployedDays += 1; break;
      case 'PROJECTED': t.projectedDays += 1; t.workingDays += 1; break;
    }
    t.lopDays += d.lopUnits;
    if (d.isLate && (d.kind === 'PRESENT' || d.kind === 'HALF_DAY')) {
      t.lateCount += 1;
      t.lateMinutes += d.lateMinutes;
    }
    t.overtimeHours += d.overtimeHours;
  }
  if (lateMarksPerHalfDay > 0) {
    t.lateLopDays = Math.floor(t.lateCount / lateMarksPerHalfDay) * 0.5;
    t.lopDays += t.lateLopDays;
  }
  t.lopDays = r2(t.lopDays);
  t.overtimeHours = r2(t.overtimeHours);
  return t;
}

// ---------------------------------------------------------------------------------------------
// Professional tax
// ---------------------------------------------------------------------------------------------

interface BuiltInPt { slabs: PtSlab[]; womenExemptUpTo?: number }

const BUILT_IN_PT: Record<string, BuiltInPt> = {
  maharashtra: {
    slabs: [
      { minGross: 0, maxGross: 7500, monthlyTax: 0 },
      { minGross: 7500.01, maxGross: 10000, monthlyTax: 175 },
      { minGross: 10000.01, maxGross: Infinity, monthlyTax: 200, februaryTax: 300 },
    ],
    womenExemptUpTo: 25000,
  },
  karnataka: { slabs: [{ minGross: 0, maxGross: 24999.99, monthlyTax: 0 }, { minGross: 25000, maxGross: Infinity, monthlyTax: 200, februaryTax: 300 }] },
  'west bengal': {
    slabs: [
      { minGross: 0, maxGross: 10000, monthlyTax: 0 },
      { minGross: 10000.01, maxGross: 15000, monthlyTax: 110 },
      { minGross: 15000.01, maxGross: 25000, monthlyTax: 130 },
      { minGross: 25000.01, maxGross: 40000, monthlyTax: 150 },
      { minGross: 40000.01, maxGross: Infinity, monthlyTax: 200 },
    ],
  },
  gujarat: { slabs: [{ minGross: 0, maxGross: 11999.99, monthlyTax: 0 }, { minGross: 12000, maxGross: Infinity, monthlyTax: 200 }] },
  telangana: { slabs: [{ minGross: 0, maxGross: 15000, monthlyTax: 0 }, { minGross: 15000.01, maxGross: 20000, monthlyTax: 150 }, { minGross: 20000.01, maxGross: Infinity, monthlyTax: 200 }] },
  'andhra pradesh': { slabs: [{ minGross: 0, maxGross: 15000, monthlyTax: 0 }, { minGross: 15000.01, maxGross: 20000, monthlyTax: 150 }, { minGross: 20000.01, maxGross: Infinity, monthlyTax: 200 }] },
  assam: { slabs: [{ minGross: 0, maxGross: 15000, monthlyTax: 0 }, { minGross: 15000.01, maxGross: 25000, monthlyTax: 180 }, { minGross: 25000.01, maxGross: Infinity, monthlyTax: 208 }] },
  'madhya pradesh': {
    slabs: [
      { minGross: 0, maxGross: 18750, monthlyTax: 0 },
      { minGross: 18750.01, maxGross: 25000, monthlyTax: 125 },
      { minGross: 25000.01, maxGross: 33333.33, monthlyTax: 167 },
      { minGross: 33333.34, maxGross: Infinity, monthlyTax: 208, februaryTax: 212 },
    ],
  },
  goa: { slabs: [{ minGross: 0, maxGross: 15000, monthlyTax: 0 }, { minGross: 15000.01, maxGross: Infinity, monthlyTax: 200 }] },
};

/** States/UTs with no professional tax on salaries */
const NO_PT_STATES = new Set([
  'delhi', 'new delhi', 'haryana', 'uttar pradesh', 'rajasthan', 'uttarakhand', 'himachal pradesh', 'jammu and kashmir',
  'chandigarh', 'arunachal pradesh', 'andaman and nicobar islands', 'dadra and nagar haveli', 'daman and diu', 'ladakh', 'lakshadweep',
]);

export function professionalTax(
  state: string,
  monthlyGross: number,
  month: number,
  gender?: string | null,
  customSlabs?: PtSlab[] | null
): { amount: number; note: string } {
  if (monthlyGross <= 0) return { amount: 0, note: 'No earnings' };
  const key = String(state || '').trim().toLowerCase();
  const pick = (slabs: PtSlab[]) => slabs.find((s) => monthlyGross >= Number(s.minGross) && monthlyGross <= Number(s.maxGross));
  if (customSlabs && customSlabs.length > 0) {
    const slab = pick(customSlabs);
    const amount = slab ? (month === 2 && slab.februaryTax ? Number(slab.februaryTax) : Number(slab.monthlyTax)) : 0;
    return { amount, note: `${state} slab (company configured)` };
  }
  if (NO_PT_STATES.has(key)) return { amount: 0, note: `${state} levies no professional tax` };
  const builtIn = BUILT_IN_PT[key];
  if (!builtIn) return { amount: 0, note: `No PT slabs configured for "${state || 'unknown state'}". Add them under Payroll → Statutory.` };
  const isWoman = String(gender || '').toLowerCase().startsWith('f');
  if (isWoman && builtIn.womenExemptUpTo && monthlyGross <= builtIn.womenExemptUpTo) {
    return { amount: 0, note: `${state}: women earning up to ₹${builtIn.womenExemptUpTo.toLocaleString('en-IN')} are exempt` };
  }
  const slab = pick(builtIn.slabs);
  const amount = slab ? (month === 2 && slab.februaryTax ? slab.februaryTax : slab.monthlyTax) : 0;
  return { amount, note: `${state} statutory slab` };
}

// ---------------------------------------------------------------------------------------------
// Income tax
// ---------------------------------------------------------------------------------------------

function slabTax(income: number, slabs: Array<[number, number]>): number {
  // slabs: [upperLimit, rate%] in ascending order; last upper = Infinity
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of slabs) {
    if (income <= lower) break;
    tax += (Math.min(income, upper) - lower) * (rate / 100);
    lower = upper;
  }
  return tax;
}

export function annualIncomeTax(taxableIncome: number, regime: 'NEW' | 'OLD'): number {
  const income = Math.max(0, Math.floor(taxableIncome));
  let tax: number;
  if (regime === 'OLD') {
    tax = slabTax(income, [[250000, 0], [500000, 5], [1000000, 20], [Infinity, 30]]);
    if (income <= 500000) tax = 0; // §87A rebate
  } else {
    // New regime, FY 2025-26 onwards
    tax = slabTax(income, [[400000, 0], [800000, 5], [1200000, 10], [1600000, 15], [2000000, 20], [2400000, 25], [Infinity, 30]]);
    if (income <= 1200000) tax = 0; // §87A rebate
    else tax = Math.min(tax, income - 1200000); // marginal relief just above ₹12 lakh
  }
  let surchargeRate = 0;
  if (income > 50000000 && regime === 'OLD') surchargeRate = 37;
  else if (income > 20000000) surchargeRate = 25;
  else if (income > 10000000) surchargeRate = 15;
  else if (income > 5000000) surchargeRate = 10;
  tax += tax * (surchargeRate / 100);
  return Math.round(tax * 1.04); // 4% health & education cess
}

/** 1 for April … 12 for March */
export function financialYearMonthIndex(month: number): number {
  return month >= 4 ? month - 3 : month + 9;
}

// ---------------------------------------------------------------------------------------------
// Monthly payroll
// ---------------------------------------------------------------------------------------------

export interface PayrollResult {
  attendance: AttendanceTotals;
  payableDivisor: number;
  payableDays: number;
  fixed: SalaryComponents & { gross: number };
  earned: SalaryComponents & { overtime: number; bonus: number; arrears: number };
  grossEarnings: number;
  reimbursements: number;
  lopDeductionAmount: number;
  pf: { wage: number; employee: number; eps: number; epf: number; edli: number; admin: number; employerTotal: number };
  esic: { eligible: boolean; wage: number; employee: number; employer: number };
  pt: { amount: number; note: string };
  tds: { regime: 'NEW' | 'OLD'; projectedAnnualIncome: number; taxableIncome: number; annualTax: number; ytdTds: number; monthsRemaining: number; monthly: number };
  loanEmi: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  gratuityProvision: number;
  employerCost: number;
  warnings: string[];
  formulas: Record<string, string>;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function resolveComponents(monthlyGross: number, policy: Pick<PayrollPolicy, 'basicPercent' | 'hraPercentOfBasic'>, explicit?: Partial<SalaryComponents> | null): SalaryComponents {
  if (explicit && Number(explicit.basic) > 0) {
    const basic = Number(explicit.basic) || 0;
    const hra = Number(explicit.hra) || 0;
    const conveyance = Number(explicit.conveyance) || 0;
    const medical = Number(explicit.medical) || 0;
    const special = explicit.special != null && Number(explicit.special) > 0
      ? Number(explicit.special)
      : Math.max(0, monthlyGross - basic - hra - conveyance - medical);
    return { basic, hra, conveyance, medical, special };
  }
  const basic = rupee((monthlyGross * policy.basicPercent) / 100);
  const hra = rupee((basic * policy.hraPercentOfBasic) / 100);
  return { basic, hra, conveyance: 0, medical: 0, special: Math.max(0, rupee(monthlyGross - basic - hra)) };
}

export function calculateMonthlyPayroll(emp: EmployeePayrollInput, month: MonthInput, policy: PayrollPolicy = DEFAULT_POLICY): PayrollResult {
  const warnings: string[] = [];
  const days = classifyMonth(emp, month, policy);
  const att = summariseDays(days, policy.lateMarksPerHalfDay);

  // 1. Payable days
  let divisor: number;
  let notEmployedEquivalent: number;
  switch (policy.payableDaysPolicy) {
    case 'FIXED_30': divisor = 30; notEmployedEquivalent = (att.notEmployedDays * 30) / att.calendarDays; break;
    case 'FIXED_26': divisor = 26; notEmployedEquivalent = (att.notEmployedDays * 26) / att.calendarDays; break;
    case 'WORKING_DAYS': {
      const working = days.filter((d) => !month.holidays.has(d.date) && !isWeeklyOff(d.date, policy)).length;
      divisor = Math.max(1, working);
      const notEmployedWorking = days.filter((d) => d.kind === 'NOT_EMPLOYED' && !month.holidays.has(d.date) && !isWeeklyOff(d.date, policy)).length;
      notEmployedEquivalent = notEmployedWorking;
      break;
    }
    default: divisor = att.calendarDays; notEmployedEquivalent = att.notEmployedDays;
  }
  const payableDays = r2(Math.min(divisor, Math.max(0, divisor - att.lopDays - notEmployedEquivalent)));
  const ratio = divisor > 0 ? payableDays / divisor : 0;

  // 2. Fixed and earned components
  const monthlyGross = Math.max(0, Number(emp.monthlyGross) || 0);
  if (monthlyGross <= 0) warnings.push('Monthly gross salary is not set');
  const fixed = resolveComponents(monthlyGross, policy, emp.components);
  const fixedGross = fixed.basic + fixed.hra + fixed.conveyance + fixed.medical + fixed.special;
  const earnedBasic = rupee(fixed.basic * ratio);
  const earnedHra = rupee(fixed.hra * ratio);
  const earnedConv = rupee(fixed.conveyance * ratio);
  const earnedMed = rupee(fixed.medical * ratio);
  const earnedSpecial = rupee(fixed.special * ratio);
  const earnedBase = earnedBasic + earnedHra + earnedConv + earnedMed + earnedSpecial;
  const lopDeductionAmount = Math.max(0, rupee(fixedGross - earnedBase));

  const hourlyRate = divisor > 0 ? fixed.basic / divisor / 8 : 0;
  const overtime = policy.overtimeEnabled ? rupee(att.overtimeHours * hourlyRate * policy.overtimeMultiplier) : 0;
  const bonus = rupee(Number(emp.bonus) || 0);
  const arrears = rupee(Number(emp.arrears) || 0);
  const reimbursements = rupee(Number(emp.reimbursements) || 0);
  const grossEarnings = earnedBase + overtime + bonus + arrears;

  // 3. PF (Labour Code wage definition: exclusions above 50% are added back to wages)
  let pf = { wage: 0, employee: 0, eps: 0, epf: 0, edli: 0, admin: 0, employerTotal: 0 };
  if (policy.pf.enabled && emp.pfApplicable !== false && earnedBase > 0) {
    const exclusions = earnedBase - earnedBasic;
    const addBack = Math.max(0, exclusions - earnedBase * 0.5);
    const wage = earnedBasic + addBack;
    const cappedWage = policy.pf.restrictToCeiling ? Math.min(wage, policy.pf.ceiling) : wage;
    const pensionWage = Math.min(wage, policy.pf.ceiling);
    const employee = rupee((cappedWage * policy.pf.employeeRate) / 100);
    const employerShare = rupee((cappedWage * policy.pf.employeeRate) / 100);
    const eps = rupee((pensionWage * policy.pf.epsRate) / 100);
    const epf = Math.max(0, employerShare - eps);
    const edli = rupee((pensionWage * policy.pf.edliRate) / 100);
    const admin = rupee((cappedWage * policy.pf.adminRate) / 100);
    pf = { wage: rupee(cappedWage), employee, eps, epf, edli, admin, employerTotal: eps + epf + edli + admin };
  }

  // 4. ESIC (eligibility on fixed monthly wages; contribution on wages earned incl. overtime)
  let esic = { eligible: false, wage: 0, employee: 0, employer: 0 };
  if (policy.esic.enabled && fixedGross > 0 && fixedGross <= policy.esic.threshold) {
    const wage = earnedBase + overtime + arrears;
    esic = {
      eligible: true,
      wage,
      employee: Math.ceil((wage * policy.esic.employeeRate) / 100),
      employer: Math.ceil((wage * policy.esic.employerRate) / 100),
    };
  }

  // 5. Professional tax
  const pt = professionalTax(policy.ptState, grossEarnings, month.month, emp.gender, month.ptSlabs);

  // 6. TDS — project the full financial year, subtract tax already deducted, spread over remaining months
  const regime = emp.taxRegime === 'OLD' ? 'OLD' : 'NEW';
  const fyIndex = financialYearMonthIndex(month.month);
  const monthsRemaining = 12 - fyIndex + 1;
  const priorAssumed = Math.max(0, Math.min(fyIndex - 1, Math.floor(Number(emp.assumedPriorMonths) || 0)));
  const ytdTaxable = (Number(emp.ytd?.taxableGross) || 0) + priorAssumed * fixedGross;
  const regularMonthly = fixedGross; // future months assumed at full fixed pay
  const projectedAnnualIncome = ytdTaxable + grossEarnings + regularMonthly * (monthsRemaining - 1);
  let taxableIncome: number;
  if (regime === 'OLD') {
    const d = emp.declarations || {};
    const annualPf = pf.employee * 12;
    const sec80C = Math.min(150000, (Number(d.section80C) || 0) + annualPf);
    taxableIncome = projectedAnnualIncome - 50000 - pt.amount * 12 - sec80C - (Number(d.section80D) || 0) - (Number(d.hraExemption) || 0) - (Number(d.other) || 0);
  } else {
    taxableIncome = projectedAnnualIncome - 75000;
  }
  taxableIncome = Math.max(0, rupee(taxableIncome));
  const annualTax = annualIncomeTax(taxableIncome, regime);
  const ytdTds = (Number(emp.ytd?.tds) || 0) + Math.round((annualTax / 12) * priorAssumed);
  let monthlyTds = Math.max(0, rupee((annualTax - ytdTds) / monthsRemaining));
  if (annualTax > 0 && emp.hasPan === false) {
    // §206AA: without PAN, deduct at the higher of the computed rate or 20%
    const avgRate = taxableIncome > 0 ? annualTax / projectedAnnualIncome : 0;
    if (avgRate < 0.2) {
      monthlyTds = Math.max(monthlyTds, rupee(grossEarnings * 0.2));
      warnings.push('PAN missing: TDS deducted at 20% (section 206AA)');
    }
  }

  // 7. Other deductions and net pay (deductions never push net pay below zero)
  const statutory = pf.employee + esic.employee + pt.amount + monthlyTds;
  const available = Math.max(0, grossEarnings - statutory);
  const loanEmi = Math.min(rupee(Number(emp.loanEmi) || 0), available);
  const otherDeductions = Math.min(rupee(Number(emp.otherDeductions) || 0), Math.max(0, available - loanEmi));
  const totalDeductions = statutory + loanEmi + otherDeductions;
  const netSalary = Math.max(0, grossEarnings - totalDeductions) + reimbursements;

  const gratuityProvision = rupee(earnedBasic * 0.0481);
  const employerCost = grossEarnings + reimbursements + pf.employerTotal + esic.employer + gratuityProvision;

  if (att.projectedDays > 0) warnings.push(`${att.projectedDays} future day(s) counted as payable`);

  const formulas: Record<string, string> = {
    payableDaysFormula: `Payable days = ${divisor} (${policy.payableDaysPolicy.replace('_', ' ').toLowerCase()}) − LOP ${att.lopDays}${att.lateLopDays ? ` (incl. ${att.lateLopDays} for ${att.lateCount} late marks)` : ''}${notEmployedEquivalent ? ` − not employed ${r2(notEmployedEquivalent)}` : ''} = ${payableDays}`,
    lopDeductionFormula: `LOP deduction = ${inr(fixedGross)} − ${inr(fixedGross)} × ${payableDays}/${divisor} = ${inr(lopDeductionAmount)}`,
    pfFormula: pf.employee
      ? `PF wage ${inr(pf.wage)}${policy.pf.restrictToCeiling ? ` (capped at ${inr(policy.pf.ceiling)})` : ''} × ${policy.pf.employeeRate}% = ${inr(pf.employee)}; employer EPS ${inr(pf.eps)} + EPF ${inr(pf.epf)}`
      : 'PF not applicable',
    esicFormula: esic.eligible
      ? `ESIC wage ${inr(esic.wage)} × ${policy.esic.employeeRate}% = ${inr(esic.employee)} (employer ${policy.esic.employerRate}% = ${inr(esic.employer)})`
      : `ESIC not applicable (fixed gross ${inr(fixedGross)} > ${inr(policy.esic.threshold)} or disabled)`,
    ptFormula: `${pt.note}: ${inr(pt.amount)}`,
    tdsFormula: `${regime} regime: projected FY income ${inr(projectedAnnualIncome)}${priorAssumed ? ` (incl. ${priorAssumed} earlier month(s) assumed at ${inr(fixedGross)})` : ''} → taxable ${inr(taxableIncome)} → annual tax ${inr(annualTax)}; (tax − already deducted ${inr(ytdTds)}) ÷ ${monthsRemaining} months = ${inr(monthlyTds)}`,
    otFormula: policy.overtimeEnabled
      ? `OT ${att.overtimeHours} h × ${inr(hourlyRate)}/h × ${policy.overtimeMultiplier} = ${inr(overtime)}`
      : 'Overtime pay disabled in payroll settings',
  };

  return {
    attendance: att,
    payableDivisor: divisor,
    payableDays,
    fixed: { ...fixed, gross: fixedGross },
    earned: { basic: earnedBasic, hra: earnedHra, conveyance: earnedConv, medical: earnedMed, special: earnedSpecial, overtime, bonus, arrears },
    grossEarnings,
    reimbursements,
    lopDeductionAmount,
    pf,
    esic,
    pt,
    tds: { regime, projectedAnnualIncome, taxableIncome, annualTax, ytdTds, monthsRemaining, monthly: monthlyTds },
    loanEmi,
    otherDeductions,
    totalDeductions,
    netSalary,
    gratuityProvision,
    employerCost,
    warnings,
    formulas,
  };
}

/** Indian-style amount in words for payslips */
export function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ' ' + ones[x % 10] : ''}`);
  const three = (x: number) => (x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? ' ' + two(x % 100) : ''}` : two(x));
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));
  return `${parts.join(' ')} Rupees Only`;
}
