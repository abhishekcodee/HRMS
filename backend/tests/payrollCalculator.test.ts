import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POLICY,
  PayrollPolicy,
  amountInWords,
  annualIncomeTax,
  calculateMonthlyPayroll,
  classifyMonth,
  professionalTax,
  summariseDays,
  ymd,
} from '../src/modules/payroll/payrollCalculator.js';

// November 2026: 30 days, Sundays on 1, 8, 15, 22, 29
const Y = 2026;
const M = 11;
const SUNDAYS = [1, 8, 15, 22, 29];

function month(opts: { present?: number[]; absent?: number[]; leaves?: Record<number, string>; holidays?: number[]; late?: number[]; ot?: Record<number, number>; today?: string } = {}) {
  const attendance = new Map<string, any>();
  for (const d of opts.present || []) attendance.set(ymd(Y, M, d), { status: opts.late?.includes(d) ? 'LATE' : 'PRESENT', lateMinutes: opts.late?.includes(d) ? 20 : 0, overtimeHours: opts.ot?.[d] || 0 });
  for (const d of opts.absent || []) attendance.set(ymd(Y, M, d), { status: 'ABSENT' });
  const leaves = new Map<string, any>();
  for (const [d, t] of Object.entries(opts.leaves || {})) leaves.set(ymd(Y, M, Number(d)), { leaveType: t, paid: t !== 'LWP' });
  return {
    year: Y,
    month: M,
    today: opts.today || '2099-01-01',
    holidays: new Set((opts.holidays || []).map((d) => ymd(Y, M, d))),
    attendance,
    leaves,
  };
}

const allWorkingDays = (except: number[] = []) =>
  Array.from({ length: 30 }, (_, i) => i + 1).filter((d) => !SUNDAYS.includes(d) && !except.includes(d));

const policy = (over: Partial<PayrollPolicy> = {}): PayrollPolicy => ({ ...DEFAULT_POLICY, ...over });

describe('payroll calculator', () => {
  it('pays a full month with correct PF, PT and no TDS for ₹30,000', () => {
    const r = calculateMonthlyPayroll({ monthlyGross: 30000 }, month({ present: allWorkingDays() }), policy());
    expect(r.payableDays).toBe(30);
    expect(r.earned.basic).toBe(15000);
    expect(r.earned.hra).toBe(6000);
    expect(r.earned.special).toBe(9000);
    expect(r.grossEarnings).toBe(30000);
    expect(r.pf.employee).toBe(1800);
    expect(r.pf.eps).toBe(1250);
    expect(r.pf.epf).toBe(550);
    expect(r.esic.eligible).toBe(false);
    expect(r.pt.amount).toBe(200);
    expect(r.tds.monthly).toBe(0);
    expect(r.netSalary).toBe(28000);
  });

  it('deducts days without punch or approved leave as loss of pay', () => {
    const r = calculateMonthlyPayroll({ monthlyGross: 30000 }, month({ present: allWorkingDays([3, 4]) }), policy());
    expect(r.attendance.lopDays).toBe(2);
    expect(r.payableDays).toBe(28);
    expect(r.grossEarnings).toBe(28000);
    expect(r.lopDeductionAmount).toBe(2000);
  });

  it('treats approved CL/PL as paid and LWP as unpaid; holidays and Sundays are paid', () => {
    const r = calculateMonthlyPayroll(
      { monthlyGross: 30000 },
      month({ present: allWorkingDays([2, 3, 4, 5]), leaves: { 2: 'CL', 3: 'PL', 4: 'LWP' }, holidays: [5] }),
      policy()
    );
    expect(r.attendance.paidLeaveDays).toBe(2);
    expect(r.attendance.leaveBreakdown).toEqual({ CL: 1, PL: 1 });
    expect(r.attendance.holidays).toBe(1);
    expect(r.attendance.weeklyOffs).toBe(5);
    expect(r.attendance.lopDays).toBe(1);
    expect(r.payableDays).toBe(29);
  });

  it('does not charge a half-day as LOP when a paid leave covers the other half', () => {
    const m = month({ present: allWorkingDays([6, 7]) });
    m.attendance.set(ymd(Y, M, 6), { status: 'HALF_DAY' });
    m.attendance.set(ymd(Y, M, 7), { status: 'HALF_DAY' });
    m.leaves.set(ymd(Y, M, 7), { leaveType: 'CL', paid: true });
    const r = calculateMonthlyPayroll({ monthlyGross: 30000 }, m, policy());
    expect(r.attendance.lopDays).toBe(0.5);
  });

  it('pro-rates a new joiner from the joining date', () => {
    const r = calculateMonthlyPayroll(
      { monthlyGross: 30000, joiningDate: '2026-11-16' },
      month({ present: allWorkingDays().filter((d) => d >= 16) }),
      policy()
    );
    expect(r.attendance.notEmployedDays).toBe(15);
    expect(r.payableDays).toBe(15);
    expect(r.grossEarnings).toBe(15000);
  });

  it('supports the fixed 26-day policy', () => {
    const r = calculateMonthlyPayroll({ monthlyGross: 26000 }, month({ present: allWorkingDays([3]) }), policy({ payableDaysPolicy: 'FIXED_26' }));
    expect(r.payableDays).toBe(25);
    expect(r.grossEarnings).toBe(25000);
  });

  it('applies ESIC when fixed gross is within ₹21,000', () => {
    const r = calculateMonthlyPayroll({ monthlyGross: 18000 }, month({ present: allWorkingDays() }), policy());
    expect(r.esic.eligible).toBe(true);
    expect(r.esic.employee).toBe(135);
    expect(r.esic.employer).toBe(585);
    expect(r.pf.employee).toBe(1080);
  });

  it('adds allowances above 50% back to the PF wage (Labour Code)', () => {
    const r = calculateMonthlyPayroll(
      { monthlyGross: 20000, components: { basic: 6000, hra: 4000, special: 10000 } },
      month({ present: allWorkingDays() }),
      policy({ esic: { ...DEFAULT_POLICY.esic, enabled: false } })
    );
    // exclusions 14000 − 50% of 20000 = 4000 added back → wage 10000
    expect(r.pf.wage).toBe(10000);
    expect(r.pf.employee).toBe(1200);
  });

  it('converts late marks into half-day LOP when configured', () => {
    const r = calculateMonthlyPayroll(
      { monthlyGross: 30000 },
      month({ present: allWorkingDays(), late: [2, 3, 4, 5, 6, 7] }),
      policy({ lateMarksPerHalfDay: 3 })
    );
    expect(r.attendance.lateCount).toBe(6);
    expect(r.attendance.lateLopDays).toBe(1);
    expect(r.payableDays).toBe(29);
  });

  it('pays overtime only when enabled', () => {
    const m = month({ present: allWorkingDays(), ot: { 2: 2, 3: 2 } });
    expect(calculateMonthlyPayroll({ monthlyGross: 24000 }, m, policy()).earned.overtime).toBe(0);
    // basic 12000 / 30 / 8 = 50 per hour × 4 h × 2
    expect(calculateMonthlyPayroll({ monthlyGross: 24000 }, m, policy({ overtimeEnabled: true })).earned.overtime).toBe(400);
  });

  it('counts future days as payable (projected) instead of absent', () => {
    const days = classifyMonth({}, month({ present: [2, 3], today: '2026-11-03' }), policy());
    const t = summariseDays(days);
    expect(t.lopDays).toBe(0);
    expect(t.projectedDays).toBeGreaterThan(0);
  });

  it('caps loan EMI so net pay never goes negative', () => {
    const r = calculateMonthlyPayroll({ monthlyGross: 10000, loanEmi: 50000 }, month({ present: allWorkingDays() }), policy());
    expect(r.netSalary).toBe(0);
    expect(r.loanEmi).toBeLessThan(10000);
  });

  it('spreads income tax over the remaining months of the financial year', () => {
    // ₹1,25,000 a month in November (FY month 8 → 5 months remaining incl. November)
    const r = calculateMonthlyPayroll(
      { monthlyGross: 125000, ytd: { taxableGross: 7 * 125000, tds: 7 * 8125 } },
      month({ present: allWorkingDays() }),
      policy()
    );
    expect(r.tds.projectedAnnualIncome).toBe(1500000);
    expect(r.tds.annualTax).toBe(97500);
    expect(r.tds.monthly).toBe(Math.round((97500 - 56875) / 5));
  });
});

describe('missed punches and half-day leave', () => {
  it('a missed punch costs half a day by default, a full day or nothing depending on the setting', () => {
    const m = month({ present: allWorkingDays([3]) });
    m.attendance.set(ymd(Y, M, 3), { status: 'MISSING_PUNCH' });
    expect(calculateMonthlyPayroll({ monthlyGross: 30000 }, m, policy()).attendance.lopDays).toBe(0.5);
    expect(calculateMonthlyPayroll({ monthlyGross: 30000 }, m, policy({ missedPunchRule: 'ABSENT' })).attendance.lopDays).toBe(1);
    expect(calculateMonthlyPayroll({ monthlyGross: 30000 }, m, policy({ missedPunchRule: 'PRESENT' })).attendance.lopDays).toBe(0);
  });

  it('half a day of paid leave with no punch costs half a day; with a half-day punch it costs nothing', () => {
    const m = month({ present: allWorkingDays([4, 5]) });
    m.leaves.set(ymd(Y, M, 4), { leaveType: 'CL', paid: true, half: true });
    m.leaves.set(ymd(Y, M, 5), { leaveType: 'CL', paid: true, half: true });
    m.attendance.set(ymd(Y, M, 5), { status: 'HALF_DAY' });
    const r = calculateMonthlyPayroll({ monthlyGross: 30000 }, m, policy());
    expect(r.attendance.lopDays).toBe(0.5);
    expect(r.attendance.paidLeaveDays).toBe(1);
  });

  it('half a day of leave without pay plus no punch is a full day of LOP', () => {
    const m = month({ present: allWorkingDays([6]) });
    m.leaves.set(ymd(Y, M, 6), { leaveType: 'LWP', paid: false, half: true });
    expect(calculateMonthlyPayroll({ monthlyGross: 30000 }, m, policy()).attendance.lopDays).toBe(1);
  });
});

describe('income tax when earlier months were paid outside the system', () => {
  it('assumes those months at fixed pay so TDS is spread evenly instead of being zero', () => {
    const r = calculateMonthlyPayroll(
      { monthlyGross: 125000, assumedPriorMonths: 7 },
      month({ present: allWorkingDays() }),
      policy()
    );
    expect(r.tds.projectedAnnualIncome).toBe(1500000);
    expect(r.tds.annualTax).toBe(97500);
    expect(Math.abs(r.tds.monthly - 97500 / 12)).toBeLessThan(2);
  });
});

describe('income tax', () => {
  it('new regime: full rebate up to ₹12 lakh, marginal relief just above', () => {
    expect(annualIncomeTax(1200000, 'NEW')).toBe(0);
    expect(annualIncomeTax(1210000, 'NEW')).toBe(10400);
    expect(annualIncomeTax(1425000, 'NEW')).toBe(97500);
  });
  it('old regime with §87A rebate', () => {
    expect(annualIncomeTax(500000, 'OLD')).toBe(0);
    expect(annualIncomeTax(1000000, 'OLD')).toBe(Math.round((12500 + 100000) * 1.04));
  });
});

describe('professional tax', () => {
  it('Maharashtra slabs, February top-up and women exemption', () => {
    expect(professionalTax('Maharashtra', 9000, 11).amount).toBe(175);
    expect(professionalTax('Maharashtra', 30000, 2).amount).toBe(300);
    expect(professionalTax('Maharashtra', 20000, 11, 'Female').amount).toBe(0);
  });
  it('states without PT and company-configured slabs', () => {
    expect(professionalTax('Delhi', 90000, 11).amount).toBe(0);
    expect(professionalTax('Kerala', 50000, 11, null, [{ minGross: 0, maxGross: 1e9, monthlyTax: 208 }]).amount).toBe(208);
  });
});

describe('amount in words', () => {
  it('uses lakh/crore grouping', () => {
    expect(amountInWords(28000)).toBe('Twenty Eight Thousand Rupees Only');
    expect(amountInWords(1234567)).toBe('Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees Only');
  });
});
