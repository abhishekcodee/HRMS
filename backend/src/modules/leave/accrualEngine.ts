/**
 * Leave Accrual Backend Engine — Pro-rated PL & CL Entitlement Engine
 * 
 * Replaces legacy Excel sheet nested IF formulas with an isolated, unit-testable module.
 */

export interface AccrualPolicyConfig {
  id?: string;
  leaveType: 'PL' | 'CL' | string;
  annualQuota: number;        // Days per full year (decimal, e.g. 14.00 for PL, 7.00 for CL)
  waitingMonthsHigh: number;  // Default 6 (when grade > gradeThreshold)
  waitingMonthsLow: number;   // Default 8 (otherwise)
  gradeThreshold: number;     // Default 3
  effectiveFrom?: string;
}

export interface AccrualCalculationParams {
  dateOfJoining?: string | null;     // YYYY-MM-DD
  grade: number;                      // Non-null integer
  policy: AccrualPolicyConfig;
  fyStart: string;                   // YYYY-MM-DD (e.g., '2026-04-01')
  fyEnd: string;                     // YYYY-MM-DD (e.g., '2027-03-31')
  dateOfSeparation?: string | null;  // YYYY-MM-DD (nullable)
  options?: {
    prorateOnSeparation?: boolean;   // POLICY QUESTION 2: Default false (match Excel)
  };
}

export interface AccrualCalculationResult {
  eligibleFrom: string | null;
  monthsCounted: number | null;
  rawDays: number | null;
  entitledDays: number | null;
}

/**
 * Excel ROUND(val, 0) helper — Rounds half away from zero.
 * 
 * Note on Rounding Policy:
 * Python's built-in round() uses banker's rounding (round(10.5) = 10), which causes silent drift from Excel sheets.
 * Excel's ROUND() function rounds half away from zero (10.5 -> 11, 3.5 -> 4).
 * JavaScript's Math.round() for positive numbers and Math.floor(x + 0.5) match Excel half-up rounding.
 * 
 * Examples:
 *   roundHalfUp(10.5)  => 11  (months = 9 for quota 14 produces raw 10.5 -> 11)
 *   roundHalfUp(3.5)   => 4   (months = 3 for quota 14 produces raw 3.5 -> 4)
 *   roundHalfUp(1.167) => 1
 *   roundHalfUp(7.0)   => 7
 */
export function roundHalfUp(val: number): number {
  if (val >= 0) {
    return Math.floor(val + 0.5);
  } else {
    return Math.ceil(val - 0.5);
  }
}

/**
 * Add Calendar Months helper (clamped to month-end).
 * 31-Aug + 6 months = 28-Feb (or 29-Feb in leap year).
 */
export function addCalendarMonths(startDate: Date, months: number): Date {
  const res = new Date(startDate.getTime());
  const originalDay = res.getDate();
  res.setMonth(res.getMonth() + months);
  if (res.getDate() !== originalDay) {
    res.setDate(0); // Clamp to last day of previous month
  }
  return res;
}

/**
 * Excel DATEDIF(a, b, "m") helper:
 * Counts completed month boundaries between startDate and endDate.
 */
export function excelDatedifMonths(startDate: Date, endDate: Date): number {
  if (startDate > endDate) return 0;
  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();
  let totalMonths = years * 12 + months;
  if (endDate.getDate() < startDate.getDate()) {
    totalMonths -= 1;
  }
  return Math.max(0, totalMonths);
}

/**
 * Core Pro-Rated Leave Accrual Engine
 * 
 * Rules:
 * 1. If employee has no date of joining, return null (not 0 — missing vs 0 entitlement).
 * 2. Pick waiting period: If grade > policy.gradeThreshold (default 3), waiting = waitingMonthsHigh (6). Else waitingMonthsLow (8).
 * 3. eligible_from = date_of_joining + waiting_months.
 * 4. If eligible_from > fy_end, return 0 (not eligible in this FY).
 * 5. accrual_start = max(eligible_from, fy_start).
 * 6. months = whole_months_between(accrual_start, fy_end) + 1 (Excel DATEDIF + 1).
 * 7. entitlement = roundHalfUp(annual_quota / 12 * months).
 */
export function calculateLeaveAccrual(params: AccrualCalculationParams): AccrualCalculationResult {
  const { dateOfJoining, grade, policy, fyStart, fyEnd, dateOfSeparation, options } = params;

  // 1. If no date of joining, return null
  if (!dateOfJoining || String(dateOfJoining).trim() === '') {
    return {
      eligibleFrom: null,
      monthsCounted: null,
      rawDays: null,
      entitledDays: null,
    };
  }

  const doj = new Date(dateOfJoining);
  const fyStartDate = new Date(fyStart);
  const fyEndDate = new Date(fyEnd);

  // 2. Pick waiting period based on grade threshold
  const waitingMonths = grade > policy.gradeThreshold ? policy.waitingMonthsHigh : policy.waitingMonthsLow;

  // 3. Calculate eligible_from = date_of_joining + waiting_months
  const eligibleFromDate = addCalendarMonths(doj, waitingMonths);
  const eligibleFromStr = eligibleFromDate.toISOString().split('T')[0];

  // 4. If eligible_from > fy_end, return 0 (not eligible in this FY)
  if (eligibleFromDate > fyEndDate) {
    return {
      eligibleFrom: eligibleFromStr,
      monthsCounted: 0,
      rawDays: 0,
      entitledDays: 0,
    };
  }

  // 5. accrual_start = max(eligible_from, fy_start)
  const accrualStart = eligibleFromDate > fyStartDate ? eligibleFromDate : fyStartDate;

  // POLICY QUESTION 2: Separated employees. The Excel formula has no concept of leaving.
  // Accrue to fy_end regardless [match Excel]. If prorateOnSeparation flag is true, cap at date_of_separation.
  let effectiveEnd = fyEndDate;
  if (options?.prorateOnSeparation && dateOfSeparation && String(dateOfSeparation).trim() !== '') {
    const sepDate = new Date(dateOfSeparation);
    if (sepDate < fyEndDate) {
      effectiveEnd = sepDate;
    }
  }

  // POLICY QUESTION 1: Mid-month eligibility. Someone eligible from 15-Apr gets 12 months,
  // same as 01-Apr, because DATEDIF returns 11 for both and +1 lifts both to 12 [match Excel].
  // 6. months = whole_months_between(accrual_start, effectiveEnd) + 1
  const monthsCounted = excelDatedifMonths(accrualStart, effectiveEnd) + 1;

  // 7. raw_days = annual_quota / 12 * months
  const rawDays = (policy.annualQuota / 12) * monthsCounted;

  // Round half away from zero
  const entitledDays = roundHalfUp(rawDays);

  return {
    eligibleFrom: eligibleFromStr,
    monthsCounted,
    rawDays: Math.round(rawDays * 1000) / 1000, // Format to 3 decimal places for audit breakdown
    entitledDays,
  };
}

// POLICY QUESTION 3: Carry forward transaction type modeled in leave_transactions table.
// POLICY QUESTION 4: PL and CL managed via separate independent policy rows in leave_policies table.
