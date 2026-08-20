import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';

export interface FinancialYearInfo {
  fyLabel: string;        // e.g. "2026-2027"
  fyStartDate: string;    // "2026-04-01"
  fyEndDate: string;      // "2027-03-31"
  fyStartYear: number;
  fyEndYear: number;
}

export interface LeaveTypeBalance {
  leaveType: 'CL' | 'PL';
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface EmployeeLeaveSummary {
  userId: string;
  employeeId: string;
  fullName: string;
  joiningDate: string;
  financialYear: FinancialYearInfo;
  cl: LeaveTypeBalance & {
    joiningFinancialMonth: number;
    remainingMonths: number;
    monthlyCL: number;
    annualCL: number;
  };
  pl: LeaveTypeBalance;
}

/**
 * Determine Financial Year based on configuration (Default: April 1 to March 31)
 */
export function getFinancialYear(targetDate?: Date): FinancialYearInfo {
  const d = targetDate || new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed (Jan=1, Apr=4, Dec=12)

  let fyStartYear: number;
  let fyEndYear: number;

  if (month >= 4) {
    fyStartYear = year;
    fyEndYear = year + 1;
  } else {
    fyStartYear = year - 1;
    fyEndYear = year;
  }

  return {
    fyLabel: `${fyStartYear}-${fyEndYear}`,
    fyStartDate: `${fyStartYear}-04-01`,
    fyEndDate: `${fyEndYear}-03-31`,
    fyStartYear,
    fyEndYear,
  };
}

/**
 * Convert Date of Joining into Financial Year Month Number (April = 1 ... March = 12)
 * April = 1, May = 2, June = 3, July = 4, August = 5, September = 6,
 * October = 7, November = 8, December = 9, January = 10, February = 11, March = 12
 */
export function getFinancialYearMonthNumber(joiningDateStr: string): number {
  if (!joiningDateStr) return 1;
  const joinDate = new Date(joiningDateStr);
  const calendarMonth = joinDate.getMonth() + 1; // 1..12 (Jan=1, Apr=4, Dec=12)

  if (calendarMonth >= 4) {
    return calendarMonth - 3;
  } else {
    return calendarMonth + 9;
  }
}

/**
 * Rounding Policy Helper (Centralized 2 decimal places)
 */
export function roundLeave(value: number): number {
  return calculateCLPLDuration(value);
}

/**
 * CL & PL Leave Duration Calculation Rule (Always Integer Output):
 * - Apply ONLY to CL (Casual Leave) and PL (Privilege Leave)
 * - Decimal/fractional part <= 0.5 -> round DOWN to lower integer
 * - Decimal/fractional part > 0.5  -> round UP to next integer
 * Example:
 *   0.5 -> 0
 *   0.51 -> 1
 *   1.5 -> 1
 *   1.51 -> 2
 *   2.5 -> 2
 *   2.51 -> 3
 */
export function calculateCLPLDuration(rawDays: number, leaveType?: string): number {
  const norm = leaveType ? String(leaveType).trim().toUpperCase() : '';
  const isCLorPL = !leaveType || norm === 'CL' || norm === 'PL' || norm.includes('CASUAL') || norm.includes('PRIVILEGE') || norm.includes('EARNED');

  const value = Number(rawDays);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (!isCLorPL) {
    return Math.round(value);
  }

  const wholePart = Math.floor(value);
  const decimalPart = Number((value - wholePart).toFixed(6));

  if (decimalPart <= 0.5) {
    return wholePart;
  }

  return wholePart + 1;
}

/**
 * Calculate CL Entitlement using exact HRMS Business Rule:
 * Formula:
 *   Monthly CL = Annual CL / 12 (10 / 12 = 0.8333333333)
 *   Remaining Months = 12 - Joining Financial Year Month
 *   CL Entitlement = (Annual CL / 12) * (12 - Joining Financial Year Month)
 */
export function calculateCLEntitlement(joiningDateStr: string, fy: FinancialYearInfo, annualCL: number = 10.0): {
  joiningFinancialMonth: number;
  remainingMonths: number;
  monthlyCL: number;
  annualCL: number;
  clEntitlement: number;
} {
  const monthlyCL = annualCL / 12;

  if (!joiningDateStr) {
    return {
      joiningFinancialMonth: 1,
      remainingMonths: 12,
      monthlyCL,
      annualCL,
      clEntitlement: roundLeave(annualCL),
    };
  }

  const joinDate = new Date(joiningDateStr);
  const fyStart = new Date(fy.fyStartDate);
  const fyEnd = new Date(fy.fyEndDate);

  // Joined before or at the start of current FY -> Full year entitlement
  if (joinDate <= fyStart) {
    return {
      joiningFinancialMonth: 1,
      remainingMonths: 12,
      monthlyCL,
      annualCL,
      clEntitlement: roundLeave(annualCL),
    };
  }

  // Joined after current FY -> 0 days in current FY
  if (joinDate > fyEnd) {
    return {
      joiningFinancialMonth: 0,
      remainingMonths: 0,
      monthlyCL,
      annualCL,
      clEntitlement: 0.0,
    };
  }

  // Joined during current Financial Year
  const joiningFinancialMonth = getFinancialYearMonthNumber(joiningDateStr);
  // Exact Business Rule Formula: Remaining Months = 12 - Joining Financial Month
  const remainingMonths = Math.max(0, 12 - joiningFinancialMonth);
  const rawEntitlement = monthlyCL * remainingMonths;

  return {
    joiningFinancialMonth,
    remainingMonths,
    monthlyCL,
    annualCL,
    clEntitlement: roundLeave(rawEntitlement),
  };
}

/**
 * Calculate PL (Privilege Leave) Entitlement using exact HRMS Business Rule:
 * 1. Annual PL = 14 Days
 * 2. Financial Year = April -> March (12 months)
 * 3. Experience-based Probation: If experience >= 4 years -> probationMonths = 6, else 0
 * 4. Financial-Year Joining Month: April=1 ... March=12
 * 5. Output 1 = Financial-Year Joining Month + probationMonths
 * 6. Output 2 = 12 - Output 1
 * 7. PL = (14 / 12) * Output 2
 */
export function calculatePLEntitlement(
  joiningDateStr: string,
  totalExperienceYears: number = 0,
  fy: FinancialYearInfo,
  annualPL: number = 14.0
): {
  joiningFinancialMonth: number;
  probationMonths: number;
  output1: number;
  output2: number;
  annualPL: number;
  plEntitlement: number;
} {
  const defaultAnnual = annualPL > 0 ? annualPL : 14.0;
  // Exact 4-year experience probation condition: >= 4 -> 6 months, < 4 -> 8 months
  const probationMonths = totalExperienceYears >= 4 ? 6 : 8;

  if (!joiningDateStr) {
    const joiningFinancialMonth = 1;
    const output1 = joiningFinancialMonth + probationMonths;
    const output2 = 12 - output1;
    const rawPl = (defaultAnnual / 12) * output2;
    return {
      joiningFinancialMonth,
      probationMonths,
      output1,
      output2,
      annualPL: defaultAnnual,
      plEntitlement: roundLeave(rawPl),
    };
  }

  const joinDate = new Date(joiningDateStr);
  const fyStart = new Date(fy.fyStartDate);
  const fyEnd = new Date(fy.fyEndDate);

  // Joined after current FY -> 0 entitlement in current FY
  if (joinDate > fyEnd) {
    return {
      joiningFinancialMonth: 0,
      probationMonths,
      output1: 0,
      output2: 0,
      annualPL: defaultAnnual,
      plEntitlement: 0,
    };
  }

  const joiningFinancialMonth = joinDate <= fyStart ? 1 : getFinancialYearMonthNumber(joiningDateStr);
  const output1 = joiningFinancialMonth + probationMonths;
  const output2 = 12 - output1;
  const rawPl = (defaultAnnual / 12) * output2;

  return {
    joiningFinancialMonth,
    probationMonths,
    output1,
    output2,
    annualPL: defaultAnnual,
    plEntitlement: roundLeave(rawPl),
  };
}

/**
 * Centralized Backend API Function: calculatePL(employeeId, financialYear)
 */
export async function calculatePL(userId: string, targetFYDate?: Date) {
  const conn = await pool.getConnection();
  try {
    const [userRows]: any = await conn.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.created_at as createdAt,
              ep.joining_date as joiningDate, ep.experience_years as experienceYears
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.id = ? OR u.employee_id = ?`,
      [userId, userId]
    );

    if (userRows.length === 0) {
      throw new Error(`Employee with ID or Employee Code ${userId} not found.`);
    }

    const emp = userRows[0];
    const joiningDate = emp.joiningDate || (emp.createdAt ? new Date(emp.createdAt).toISOString().split('T')[0] : '2026-04-01');
    const fy = getFinancialYear(targetFYDate);

    // Stored experience in years
    const totalExperienceYears = parseFloat(emp.experienceYears) || 0.00;

    const [settingRows]: any = await conn.query(
      `SELECT setting_value FROM system_settings WHERE setting_key IN ('earnedLeave', 'privilegeLeave')`
    );

    let annualPL = 14.0;
    if (settingRows.length > 0) {
      const parsed = parseFloat(settingRows[0].setting_value);
      if (!isNaN(parsed) && parsed > 0) annualPL = parsed;
    }

    const plResult = calculatePLEntitlement(joiningDate, totalExperienceYears, fy, annualPL);

    return {
      userId: emp.id,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      joiningDate,
      totalExperienceYears: Math.round(totalExperienceYears * 10) / 10,
      financialYear: fy,
      ...plResult,
    };
  } finally {
    conn.release();
  }
}

/**
 * Centralized Backend API Function: calculateCL(employeeId, financialYear)
 */
export async function calculateCL(userId: string, targetFYDate?: Date) {
  const conn = await pool.getConnection();
  try {
    const [userRows]: any = await conn.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.created_at as createdAt,
              ep.joining_date as joiningDate
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.id = ? OR u.employee_id = ?`,
      [userId, userId]
    );

    if (userRows.length === 0) {
      throw new Error(`Employee with ID or Employee Code ${userId} not found.`);
    }

    const emp = userRows[0];
    const joiningDate = emp.joiningDate || (emp.createdAt ? new Date(emp.createdAt).toISOString().split('T')[0] : '2026-04-01');
    const fy = getFinancialYear(targetFYDate);

    // Fetch Annual CL policy setting (default 10)
    const [settingRows]: any = await conn.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'casualLeave'`
    );

    let annualCL = 10.0;
    if (settingRows.length > 0) {
      const parsed = parseFloat(settingRows[0].setting_value);
      if (!isNaN(parsed) && parsed > 0) annualCL = parsed;
    }

    const clResult = calculateCLEntitlement(joiningDate, fy, annualCL);

    return {
      userId: emp.id,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      joiningDate,
      financialYear: fy,
      ...clResult,
    };
  } finally {
    conn.release();
  }
}

/**
 * Calculate Server-side Dynamic CL & PL Entitlements & Balances for an Employee
 */
export async function calculateEmployeeLeaveSummary(userId: string): Promise<EmployeeLeaveSummary> {
  const conn = await pool.getConnection();
  try {
    // 1. Fetch Employee Record & Date of Joining & Stored Experience
    const [userRows]: any = await conn.query(
      `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.created_at as createdAt,
              ep.joining_date as joiningDate, ep.experience_years as experienceYears
       FROM users u
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error(`Employee with ID ${userId} not found.`);
    }

    const emp = userRows[0];
    const joiningDate = emp.joiningDate || (emp.createdAt ? new Date(emp.createdAt).toISOString().split('T')[0] : '2026-04-01');
    const totalExperienceYears = parseFloat(emp.experienceYears) || 0.00;
    const fy = getFinancialYear();

    // 2. Fetch Annual Leave Policies from system_settings or default
    const [settingRows]: any = await conn.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('casualLeave', 'earnedLeave', 'privilegeLeave')`
    );

    let annualCL = 10.0; // Default 10 days for CL
    let annualPL = 14.0; // Default 14 days for PL per financial year

    for (const s of settingRows) {
      const parsed = parseFloat(s.setting_value);
      if (!isNaN(parsed) && parsed > 0) {
        if (s.setting_key === 'casualLeave') annualCL = parsed;
        if (s.setting_key === 'earnedLeave' || s.setting_key === 'privilegeLeave') annualPL = parsed;
      }
    }

    // 3. Compute Exact Prorated Allocations for CL & PL
    const clCalc = calculateCLEntitlement(joiningDate, fy, annualCL);
    const clAllocated = clCalc.clEntitlement;

    const plCalc = calculatePLEntitlement(joiningDate, totalExperienceYears, fy, annualPL);
    const plAllocated = plCalc.plEntitlement;

    // 4. Fetch Used & Pending Leave Requests for Current Financial Year
    const [reqRows]: any = await conn.query(
      `SELECT leave_type as leaveType, status, employer_status as employerStatus, admin_status as adminStatus,
              days_count as daysCount
       FROM leave_requests
       WHERE user_id = ?
         AND start_date >= ?
         AND start_date <= ?
         AND status NOT IN ('CANCELLED', 'WITHDRAWN')`,
      [userId, fy.fyStartDate, fy.fyEndDate]
    );

    let clUsed = 0;
    let clPending = 0;
    let plUsed = 0;
    let plPending = 0;

    for (const req of reqRows) {
      const type = String(req.leaveType).toUpperCase();
      const isCL = type === 'CL' || type.includes('CASUAL');
      const isPL = type === 'PL' || type.includes('PRIVILEGE') || type.includes('EARNED');

      const isApproved = req.status === 'APPROVED' || req.employerStatus === 'APPROVED' || req.adminStatus === 'APPROVED';
      const isRejected = req.status === 'REJECTED' || req.employerStatus === 'REJECTED' || req.adminStatus === 'REJECTED';
      const isPending = !isApproved && !isRejected;

      const rawDays = parseFloat(req.daysCount) || 0;
      const days = calculateCLPLDuration(rawDays, req.leaveType);

      if (isCL) {
        if (isApproved) clUsed += days;
        else if (isPending) clPending += days;
      } else if (isPL) {
        if (isApproved) plUsed += days;
        else if (isPending) plPending += days;
      }
    }

    clUsed = roundLeave(clUsed);
    clPending = roundLeave(clPending);
    plUsed = roundLeave(plUsed);
    plPending = roundLeave(plPending);

    const clRemaining = roundLeave(Math.max(0, clAllocated - clUsed - clPending));
    const plRemaining = roundLeave(Math.max(0, plAllocated - plUsed - plPending));

    // 5. Update/Sync leave_balances Table in Database
    await conn.query(
      `INSERT INTO leave_balances (id, user_id, leave_type, allocated_days, used_days)
       VALUES (UUID(), ?, 'CL', ?, ?)
       ON DUPLICATE KEY UPDATE allocated_days = VALUES(allocated_days), used_days = VALUES(used_days)`,
      [userId, clAllocated, clUsed]
    );

    await conn.query(
      `INSERT INTO leave_balances (id, user_id, leave_type, allocated_days, used_days)
       VALUES (UUID(), ?, 'PL', ?, ?)
       ON DUPLICATE KEY UPDATE allocated_days = VALUES(allocated_days), used_days = VALUES(used_days)`,
      [userId, plAllocated, plUsed]
    );

    // 6. Ensure Leave Ledger initial allocation transaction exists
    const [ledgerCheck]: any = await conn.query(
      `SELECT id FROM leave_ledger WHERE user_id = ? AND transaction_type IN ('ANNUAL_ALLOCATION', 'JOINING_ELIGIBILITY') LIMIT 1`,
      [userId]
    );

    if (ledgerCheck.length === 0) {
      const transType = clCalc.remainingMonths < 12 ? 'JOINING_ELIGIBILITY' : 'ANNUAL_ALLOCATION';
      const remarks = `CL Entitlement for FY ${fy.fyLabel} (DOJ: ${joiningDate}, FY Month: ${clCalc.joiningFinancialMonth}, Remaining Months: ${clCalc.remainingMonths})`;

      await conn.query(
        `INSERT INTO leave_ledger (id, user_id, leave_type, transaction_date, transaction_type, credit, debit, balance, remarks)
         VALUES
         (UUID(), ?, 'CL', ?, ?, ?, 0.00, ?, ?),
         (UUID(), ?, 'PL', ?, ?, ?, 0.00, ?, ?)`,
        [
          userId, joiningDate, transType, clAllocated, clAllocated, remarks,
          userId, joiningDate, transType, plAllocated, plAllocated, `PL Entitlement for FY ${fy.fyLabel}`
        ]
      );
    }

    return {
      userId,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      joiningDate,
      financialYear: fy,
      cl: {
        leaveType: 'CL',
        allocated: clAllocated,
        used: clUsed,
        pending: clPending,
        remaining: clRemaining,
        joiningFinancialMonth: clCalc.joiningFinancialMonth,
        remainingMonths: clCalc.remainingMonths,
        monthlyCL: clCalc.monthlyCL,
        annualCL: clCalc.annualCL,
      },
      pl: {
        leaveType: 'PL',
        allocated: plAllocated,
        used: plUsed,
        pending: plPending,
        remaining: plRemaining,
      },
    };
  } finally {
    conn.release();
  }
}
