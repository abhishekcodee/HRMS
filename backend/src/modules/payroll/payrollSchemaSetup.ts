import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Idempotent schema for payroll, payroll automation and the Excel attendance feed.
 * Safe to run on every start: CREATE TABLE IF NOT EXISTS + ADD COLUMN (duplicate errors ignored).
 */
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS payroll_runs (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NULL,
    payroll_month INT NOT NULL,
    payroll_year INT NOT NULL,
    financial_year VARCHAR(20) NOT NULL,
    pay_period_start VARCHAR(20) NOT NULL,
    pay_period_end VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    payable_days_policy VARCHAR(30) NOT NULL DEFAULT 'CALENDAR_DAYS',
    total_employees INT NOT NULL DEFAULT 0,
    total_gross DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_net DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_employer_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    calculated_by VARCHAR(36) NULL,
    calculated_at DATETIME NULL,
    approved_by VARCHAR(36) NULL,
    approved_at DATETIME NULL,
    locked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS payroll_items (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NULL,
    payroll_run_id VARCHAR(36) NOT NULL,
    employee_id VARCHAR(36) NOT NULL,
    employee_code VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    department VARCHAR(100), designation VARCHAR(100), bank_name VARCHAR(100), account_number VARCHAR(100),
    ifsc VARCHAR(50), pan VARCHAR(50), uan VARCHAR(50),
    calendar_days INT NOT NULL DEFAULT 30, working_days INT NOT NULL DEFAULT 30,
    present_days DECIMAL(5,2) NOT NULL DEFAULT 0, absent_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    paid_leave_days DECIMAL(5,2) NOT NULL DEFAULT 0, lop_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    payable_days DECIMAL(5,2) NOT NULL DEFAULT 30, overtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
    basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0, hra DECIMAL(12,2) NOT NULL DEFAULT 0,
    conveyance DECIMAL(12,2) NOT NULL DEFAULT 0, special_allowance DECIMAL(12,2) NOT NULL DEFAULT 0,
    medical_allowance DECIMAL(12,2) NOT NULL DEFAULT 0, other_allowances DECIMAL(12,2) NOT NULL DEFAULT 0,
    overtime_pay DECIMAL(12,2) NOT NULL DEFAULT 0, reimbursements_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    arrears_amount DECIMAL(12,2) NOT NULL DEFAULT 0, bonus_incentive DECIMAL(12,2) NOT NULL DEFAULT 0,
    lop_deduction_amount DECIMAL(12,2) NOT NULL DEFAULT 0, gross_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
    employee_pf DECIMAL(12,2) NOT NULL DEFAULT 0, employee_esic DECIMAL(12,2) NOT NULL DEFAULT 0,
    professional_tax DECIMAL(12,2) NOT NULL DEFAULT 0, tds DECIMAL(12,2) NOT NULL DEFAULT 0,
    loan_emi_deduction DECIMAL(12,2) NOT NULL DEFAULT 0, other_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0, net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    employer_pf DECIMAL(12,2) NOT NULL DEFAULT 0, employer_esic DECIMAL(12,2) NOT NULL DEFAULT 0,
    gratuity_provision DECIMAL(12,2) NOT NULL DEFAULT 0, total_employer_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    calculation_breakdown_json MEDIUMTEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'CALCULATED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payroll_items_run (payroll_run_id),
    INDEX idx_payroll_items_emp (employee_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS employee_salary_structures (
    id VARCHAR(36) PRIMARY KEY, employee_id VARCHAR(36) NOT NULL, structure_id VARCHAR(36) NOT NULL,
    ctc DECIMAL(12,2) NOT NULL, monthly_gross DECIMAL(12,2) NOT NULL, effective_from VARCHAR(20) NOT NULL,
    effective_to VARCHAR(20), is_active TINYINT(1) NOT NULL DEFAULT 1, structure_snapshot_json TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS professional_tax_slabs (
    id VARCHAR(36) PRIMARY KEY, state VARCHAR(100) NOT NULL, min_gross DECIMAL(12,2) NOT NULL,
    max_gross DECIMAL(12,2) NOT NULL, monthly_tax DECIMAL(12,2) NOT NULL, february_tax DECIMAL(12,2),
    effective_from VARCHAR(20) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS employee_loans_advancements (
    id VARCHAR(36) PRIMARY KEY, employee_id VARCHAR(36) NOT NULL, type VARCHAR(20) NOT NULL,
    principal_amount DECIMAL(12,2) NOT NULL, paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(12,2) NOT NULL, monthly_emi DECIMAL(12,2) NOT NULL, start_date VARCHAR(20) NOT NULL,
    end_date VARCHAR(20), status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', notes TEXT, created_by VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS employee_tax_declarations (
    id VARCHAR(36) PRIMARY KEY, employee_id VARCHAR(36) NOT NULL, financial_year VARCHAR(20) NOT NULL,
    regime VARCHAR(20) NOT NULL DEFAULT 'NEW', declared_80c DECIMAL(12,2) DEFAULT 0, declared_80d DECIMAL(12,2) DEFAULT 0,
    declared_hra DECIMAL(12,2) DEFAULT 0, other_deductions DECIMAL(12,2) DEFAULT 0,
    previous_employer_income DECIMAL(12,2) DEFAULT 0, previous_employer_tds DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS reimbursements (
    id VARCHAR(36) PRIMARY KEY, employee_id VARCHAR(36) NOT NULL, category VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL, claim_date VARCHAR(20) NOT NULL, description TEXT, receipt_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', approved_by VARCHAR(36), payroll_run_id VARCHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS salary_arrears (
    id VARCHAR(36) PRIMARY KEY, employee_id VARCHAR(36) NOT NULL, effective_from_month INT NOT NULL,
    effective_from_year INT NOT NULL, effective_to_month INT NOT NULL, effective_to_year INT NOT NULL,
    basic_difference_total DECIMAL(12,2) NOT NULL, gross_difference_total DECIMAL(12,2) NOT NULL,
    paid_in_payroll_run_id VARCHAR(36), status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS payroll_settings (
    company_id VARCHAR(36) PRIMARY KEY,
    settings_json TEXT NOT NULL,
    last_tick_at DATETIME NULL,
    last_tick_result TEXT NULL,
    updated_by VARCHAR(36) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS attendance_feed_tokens (
    company_id VARCHAR(36) PRIMARY KEY,
    token VARCHAR(64) NOT NULL,
    created_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME NULL,
    UNIQUE KEY uq_attendance_feed_token (token)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Columns added to existing tables
  'ALTER TABLE payroll_runs ADD COLUMN company_id VARCHAR(36) NULL',
  'ALTER TABLE payroll_runs ADD COLUMN auto_generated TINYINT(1) NOT NULL DEFAULT 0',
  'ALTER TABLE payroll_runs ADD COLUMN emailed_at DATETIME NULL',
  'ALTER TABLE payroll_runs ADD COLUMN warnings_json TEXT NULL',
  'ALTER TABLE payroll_items ADD COLUMN company_id VARCHAR(36) NULL',
  'ALTER TABLE payroll_items ADD COLUMN reimbursements_amount DECIMAL(12,2) NOT NULL DEFAULT 0',
  'ALTER TABLE payroll_items ADD COLUMN arrears_amount DECIMAL(12,2) NOT NULL DEFAULT 0',
  'ALTER TABLE payroll_items ADD COLUMN employee_email VARCHAR(255) NULL',
  'ALTER TABLE payroll_items ADD COLUMN leave_summary_json TEXT NULL',
  'ALTER TABLE payroll_items ADD COLUMN warnings_json TEXT NULL',
  'ALTER TABLE payroll_items ADD COLUMN email_status VARCHAR(20) NULL',
  'ALTER TABLE payroll_items ADD COLUMN emailed_at DATETIME NULL',
  'ALTER TABLE payroll_items ADD COLUMN email_error TEXT NULL',
  'ALTER TABLE payroll_items MODIFY calculation_breakdown_json MEDIUMTEXT',
  'ALTER TABLE payroll_items MODIFY overtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0',
  'ALTER TABLE employee_profiles ADD COLUMN experience_years DECIMAL(5,2) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN confirmation_date VARCHAR(20) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN resignation_date VARCHAR(20) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN last_working_date VARCHAR(20) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN pan VARCHAR(20) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN aadhaar VARCHAR(20) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN uan VARCHAR(30) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN pf_number VARCHAR(50) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN esic_number VARCHAR(50) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN bank_name VARCHAR(100) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN account_number VARCHAR(50) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN ifsc VARCHAR(20) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN grade_id VARCHAR(36) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN cost_center_id VARCHAR(36) NULL',
  'ALTER TABLE employee_profiles ADD COLUMN pf_applicable TINYINT(1) NOT NULL DEFAULT 1',
  'ALTER TABLE employee_profiles ADD COLUMN tax_regime VARCHAR(10) NULL',
  'ALTER TABLE company_events ADD COLUMN company_id VARCHAR(36) NULL',
  'ALTER TABLE employee_salary_structures ADD COLUMN company_id VARCHAR(36) NULL',
  'ALTER TABLE employee_loans_advancements ADD COLUMN company_id VARCHAR(36) NULL',
  'ALTER TABLE reimbursements ADD COLUMN company_id VARCHAR(36) NULL',
  'ALTER TABLE salary_arrears ADD COLUMN company_id VARCHAR(36) NULL',
  'CREATE INDEX idx_payroll_runs_company_period ON payroll_runs (company_id, payroll_year, payroll_month)',
  'CREATE INDEX idx_attendance_user_date ON attendance (user_id, work_date)',
];

const IGNORABLE = new Set([1050, 1060, 1061, 1068, 1146]);

export async function runPayrollSchemaUpgrade(): Promise<void> {
  for (const sql of STATEMENTS) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      if (!IGNORABLE.has(err?.errno)) {
        logger.warn(`Payroll schema statement skipped (${err?.code || err?.errno}): ${sql.slice(0, 80)}`);
      }
    }
  }
}

let ensured: Promise<void> | null = null;
export function ensurePayrollSchema(): Promise<void> {
  if (!ensured) {
    ensured = runPayrollSchemaUpgrade().catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}
