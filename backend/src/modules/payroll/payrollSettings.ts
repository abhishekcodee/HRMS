import { pool } from '../../database/index.js';
import { DEFAULT_POLICY, PayrollPolicy } from './payrollCalculator.js';
import { ensurePayrollSchema } from './payrollSchemaSetup.js';

export interface PayrollAutomation {
  /** Generate payroll and e-mail payslips automatically on salary day */
  enabled: boolean;
  /** Day of month salary is paid (1-31; clamped to month end) */
  salaryDay: number;
  /** Which month the salary day pays for */
  payFor: 'PREVIOUS_MONTH' | 'CURRENT_MONTH';
  /** Draft payroll is generated this many days before salary day so HR can review it */
  generateDaysBefore: number;
  /** Hour of the day (company time zone) the payslips are e-mailed */
  sendHour: number;
  /** If true, payslips are only e-mailed after someone approves the run */
  requireApproval: boolean;
  /** Minutes east of UTC (India = 330) */
  utcOffsetMinutes: number;
  /** Extra address copied on every payslip e-mail (optional) */
  hrCcEmail: string;
}

export interface PayrollSettings extends PayrollPolicy {
  automation: PayrollAutomation;
}

export const DEFAULT_AUTOMATION: PayrollAutomation = {
  enabled: false,
  salaryDay: 1,
  payFor: 'PREVIOUS_MONTH',
  generateDaysBefore: 2,
  sendHour: 10,
  requireApproval: false,
  utcOffsetMinutes: 330,
  hrCcEmail: '',
};

export const DEFAULT_SETTINGS: PayrollSettings = { ...DEFAULT_POLICY, automation: { ...DEFAULT_AUTOMATION } };

const num = (v: any, def: number, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
};
const bool = (v: any, def: boolean) => (typeof v === 'boolean' ? v : v === 1 || v === '1' || v === 'true' ? true : v === 0 || v === '0' || v === 'false' ? false : def);

/** Validate and fill defaults; anything unknown is dropped. */
export function sanitizeSettings(raw: any): PayrollSettings {
  const s = raw && typeof raw === 'object' ? raw : {};
  const d = DEFAULT_SETTINGS;
  const policies = ['CALENDAR_DAYS', 'FIXED_30', 'FIXED_26', 'WORKING_DAYS'];
  const weeklyOffs = Array.isArray(s.weeklyOffs)
    ? Array.from(new Set(s.weeklyOffs.map(Number).filter((x: number) => Number.isInteger(x) && x >= 0 && x <= 6))) as number[]
    : d.weeklyOffs;
  const a = s.automation && typeof s.automation === 'object' ? s.automation : {};
  const pf = s.pf && typeof s.pf === 'object' ? s.pf : {};
  const esic = s.esic && typeof s.esic === 'object' ? s.esic : {};
  return {
    payableDaysPolicy: policies.includes(s.payableDaysPolicy) ? s.payableDaysPolicy : d.payableDaysPolicy,
    weeklyOffs,
    secondFourthSaturdayOff: bool(s.secondFourthSaturdayOff, d.secondFourthSaturdayOff),
    missingAttendanceRule: s.missingAttendanceRule === 'PRESENT' ? 'PRESENT' : 'ABSENT',
    missedPunchRule: ['PRESENT', 'ABSENT'].includes(s.missedPunchRule) ? s.missedPunchRule : 'HALF_DAY',
    basicPercent: num(s.basicPercent, d.basicPercent, 10, 100),
    hraPercentOfBasic: num(s.hraPercentOfBasic, d.hraPercentOfBasic, 0, 100),
    overtimeEnabled: bool(s.overtimeEnabled, d.overtimeEnabled),
    overtimeMultiplier: num(s.overtimeMultiplier, d.overtimeMultiplier, 1, 5),
    lateMarksPerHalfDay: Math.round(num(s.lateMarksPerHalfDay, d.lateMarksPerHalfDay, 0, 31)),
    ptState: typeof s.ptState === 'string' && s.ptState.trim() ? s.ptState.trim().slice(0, 60) : d.ptState,
    pf: {
      enabled: bool(pf.enabled, d.pf.enabled),
      employeeRate: num(pf.employeeRate, d.pf.employeeRate, 0, 20),
      epsRate: num(pf.epsRate, d.pf.epsRate, 0, 12),
      ceiling: num(pf.ceiling, d.pf.ceiling, 0, 10000000),
      restrictToCeiling: bool(pf.restrictToCeiling, d.pf.restrictToCeiling),
      edliRate: num(pf.edliRate, d.pf.edliRate, 0, 5),
      adminRate: num(pf.adminRate, d.pf.adminRate, 0, 5),
    },
    esic: {
      enabled: bool(esic.enabled, d.esic.enabled),
      threshold: num(esic.threshold, d.esic.threshold, 0, 10000000),
      employeeRate: num(esic.employeeRate, d.esic.employeeRate, 0, 10),
      employerRate: num(esic.employerRate, d.esic.employerRate, 0, 10),
    },
    automation: {
      enabled: bool(a.enabled, d.automation.enabled),
      salaryDay: Math.round(num(a.salaryDay, d.automation.salaryDay, 1, 31)),
      payFor: a.payFor === 'CURRENT_MONTH' ? 'CURRENT_MONTH' : 'PREVIOUS_MONTH',
      generateDaysBefore: Math.round(num(a.generateDaysBefore, d.automation.generateDaysBefore, 0, 10)),
      sendHour: Math.round(num(a.sendHour, d.automation.sendHour, 0, 23)),
      requireApproval: bool(a.requireApproval, d.automation.requireApproval),
      utcOffsetMinutes: Math.round(num(a.utcOffsetMinutes, d.automation.utcOffsetMinutes, -720, 840)),
      hrCcEmail: typeof a.hrCcEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.hrCcEmail.trim()) ? a.hrCcEmail.trim() : '',
    },
  };
}

export async function loadPayrollSettings(companyId: string | null | undefined): Promise<PayrollSettings> {
  await ensurePayrollSchema();
  if (!companyId) return sanitizeSettings({});
  const [rows]: any = await pool.query('SELECT settings_json FROM payroll_settings WHERE company_id = ? LIMIT 1', [companyId]);
  if (!rows || rows.length === 0) return sanitizeSettings({});
  try {
    return sanitizeSettings(JSON.parse(rows[0].settings_json));
  } catch {
    return sanitizeSettings({});
  }
}

export async function savePayrollSettings(companyId: string, raw: any, userId?: string | null): Promise<PayrollSettings> {
  await ensurePayrollSchema();
  const settings = sanitizeSettings(raw);
  await pool.query(
    `INSERT INTO payroll_settings (company_id, settings_json, updated_by) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json), updated_by = VALUES(updated_by)`,
    [companyId, JSON.stringify(settings), userId || null]
  );
  return settings;
}
