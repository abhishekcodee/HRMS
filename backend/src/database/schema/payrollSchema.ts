import { mysqlTable, varchar, text, timestamp, decimal, boolean, int } from 'drizzle-orm/mysql-core';

/**
 * Master Grades Table
 */
export const masterGrades = mysqlTable('master_grades', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  level: int('level').notNull().default(1),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Master Cost Centers Table
 */
export const masterCostCenters = mysqlTable('master_cost_centers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Salary Components Master Table
 */
export const salaryComponents = mysqlTable('salary_components', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull(), // 'earning' | 'deduction' | 'statutory'
  calculationType: varchar('calculation_type', { length: 20 }).notNull().default('fixed'), // 'fixed' | 'percentage'
  percentageBasisComponentCode: varchar('percentage_basis_component_code', { length: 50 }),
  percentageValue: decimal('percentage_value', { precision: 5, scale: 2 }).default('0.00'),
  isTaxable: boolean('is_taxable').notNull().default(true),
  isPfApplicable: boolean('is_pf_applicable').notNull().default(true),
  isEsicApplicable: boolean('is_esic_applicable').notNull().default(true),
  isLopDeductible: boolean('is_lop_deductible').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Salary Structure Templates Table
 */
export const salaryStructures = mysqlTable('salary_structures', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Salary Structure Items Mapping Table
 */
export const salaryStructureComponents = mysqlTable('salary_structure_components', {
  id: varchar('id', { length: 36 }).primaryKey(),
  structureId: varchar('structure_id', { length: 36 }).notNull(),
  componentId: varchar('component_id', { length: 36 }).notNull(),
  componentCode: varchar('component_code', { length: 50 }).notNull(),
  amountType: varchar('amount_type', { length: 20 }).notNull().default('fixed'),
  defaultValue: decimal('default_value', { precision: 12, scale: 2 }).notNull().default('0.00'),
  percentageOf: varchar('percentage_of', { length: 50 }),
  displayOrder: int('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Employee Assigned Salary Structures Table
 */
export const employeeSalaryStructures = mysqlTable('employee_salary_structures', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  structureId: varchar('structure_id', { length: 36 }).notNull(),
  ctc: decimal('ctc', { precision: 12, scale: 2 }).notNull(),
  monthlyGross: decimal('monthly_gross', { precision: 12, scale: 2 }).notNull(),
  effectiveFrom: varchar('effective_from', { length: 20 }).notNull(),
  effectiveTo: varchar('effective_to', { length: 20 }),
  isActive: boolean('is_active').notNull().default(true),
  structureSnapshotJson: text('structure_snapshot_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Salary Revisions History Table
 */
export const salaryRevisions = mysqlTable('salary_revisions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  previousCtc: decimal('previous_ctc', { precision: 12, scale: 2 }).notNull(),
  newCtc: decimal('new_ctc', { precision: 12, scale: 2 }).notNull(),
  effectiveDate: varchar('effective_date', { length: 20 }).notNull(),
  reason: text('reason'),
  approvedBy: varchar('approved_by', { length: 36 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * EPF Statutory Rules Configuration Table
 */
export const statutoryPfConfigs = mysqlTable('statutory_pf_configs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  enabled: boolean('enabled').notNull().default(true),
  employeeRate: decimal('employee_rate', { precision: 5, scale: 2 }).notNull().default('12.00'),
  employerRate: decimal('employer_rate', { precision: 5, scale: 2 }).notNull().default('12.00'),
  epsRate: decimal('eps_rate', { precision: 5, scale: 2 }).notNull().default('8.33'),
  epfEmployerRate: decimal('epf_employer_rate', { precision: 5, scale: 2 }).notNull().default('3.67'),
  wageCeiling: decimal('wage_ceiling', { precision: 12, scale: 2 }).notNull().default('15000.00'),
  restrictToCeiling: boolean('restrict_to_ceiling').notNull().default(true),
  allowVpf: boolean('allow_vpf').notNull().default(false),
  wageComponentsJson: text('wage_components_json'),
  effectiveFrom: varchar('effective_from', { length: 20 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * ESIC Statutory Rules Configuration Table
 */
export const statutoryEsicConfigs = mysqlTable('statutory_esic_configs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  enabled: boolean('enabled').notNull().default(true),
  eligibilityThreshold: decimal('eligibility_threshold', { precision: 12, scale: 2 }).notNull().default('21000.00'),
  employeeRate: decimal('employee_rate', { precision: 5, scale: 2 }).notNull().default('0.75'),
  employerRate: decimal('employer_rate', { precision: 5, scale: 2 }).notNull().default('3.25'),
  wageComponentsJson: text('wage_components_json'),
  effectiveFrom: varchar('effective_from', { length: 20 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Professional Tax Slabs Configuration Table
 */
export const professionalTaxSlabs = mysqlTable('professional_tax_slabs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  state: varchar('state', { length: 100 }).notNull(),
  minGross: decimal('min_gross', { precision: 12, scale: 2 }).notNull(),
  maxGross: decimal('max_gross', { precision: 12, scale: 2 }).notNull(),
  monthlyTax: decimal('monthly_tax', { precision: 12, scale: 2 }).notNull(),
  februaryTax: decimal('february_tax', { precision: 12, scale: 2 }),
  effectiveFrom: varchar('effective_from', { length: 20 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * TDS Tax Slabs Configuration Table
 */
export const tdsTaxSlabs = mysqlTable('tds_tax_slabs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  financialYear: varchar('financial_year', { length: 20 }).notNull(),
  regime: varchar('regime', { length: 20 }).notNull(),
  minIncome: decimal('min_income', { precision: 12, scale: 2 }).notNull(),
  maxIncome: decimal('max_income', { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull(),
  standardDeduction: decimal('standard_deduction', { precision: 12, scale: 2 }).notNull().default('75000.00'),
  cessRate: decimal('cess_rate', { precision: 5, scale: 2 }).notNull().default('4.00'),
  rebateLimit: decimal('rebate_limit', { precision: 12, scale: 2 }).default('700000.00'),
  effectiveFrom: varchar('effective_from', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Employee Tax Declarations Table
 */
export const employeeTaxDeclarations = mysqlTable('employee_tax_declarations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  financialYear: varchar('financial_year', { length: 20 }).notNull(),
  regime: varchar('regime', { length: 20 }).notNull().default('NEW'),
  declared80C: decimal('declared_80c', { precision: 12, scale: 2 }).default('0.00'),
  declared80D: decimal('declared_80d', { precision: 12, scale: 2 }).default('0.00'),
  declaredHra: decimal('declared_hra', { precision: 12, scale: 2 }).default('0.00'),
  otherDeductions: decimal('other_deductions', { precision: 12, scale: 2 }).default('0.00'),
  previousEmployerIncome: decimal('previous_employer_income', { precision: 12, scale: 2 }).default('0.00'),
  previousEmployerTds: decimal('previous_employer_tds', { precision: 12, scale: 2 }).default('0.00'),
  status: varchar('status', { length: 20 }).notNull().default('SUBMITTED'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Overtime Policies Configuration Table
 */
export const overtimePolicies = mysqlTable('overtime_policies', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  rateType: varchar('rate_type', { length: 50 }).notNull().default('BASIC_MULTIPLIER'),
  fixedHourlyRate: decimal('fixed_hourly_rate', { precision: 10, scale: 2 }).default('0.00'),
  multiplier: decimal('multiplier', { precision: 5, scale: 2 }).notNull().default('1.50'),
  weeklyOffMultiplier: decimal('weekly_off_multiplier', { precision: 5, scale: 2 }).default('2.00'),
  holidayMultiplier: decimal('holiday_multiplier', { precision: 5, scale: 2 }).default('2.00'),
  maxOtHoursPerMonth: decimal('max_ot_hours_per_month', { precision: 5, scale: 2 }).default('48.00'),
  approvalRequired: boolean('approval_required').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Employee Loans & Advances Table
 */
export const employeeLoansAdvancements = mysqlTable('employee_loans_advancements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  principalAmount: decimal('principal_amount', { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  remainingAmount: decimal('remaining_amount', { precision: 12, scale: 2 }).notNull(),
  monthlyEmi: decimal('monthly_emi', { precision: 12, scale: 2 }).notNull(),
  startDate: varchar('start_date', { length: 20 }).notNull(),
  endDate: varchar('end_date', { length: 20 }),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  notes: text('notes'),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Employee Reimbursements & Expense Claims Table
 */
export const reimbursements = mysqlTable('reimbursements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'TRAVEL' | 'FUEL' | 'TELEPHONE' | 'MEALS' | 'OTHER'
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  claimDate: varchar('claim_date', { length: 20 }).notNull(),
  description: text('description'),
  receiptUrl: text('receipt_url'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'
  approvedBy: varchar('approved_by', { length: 36 }),
  payrollRunId: varchar('payroll_run_id', { length: 36 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Flexible Benefit Plans (FBP) Component Selections Table
 */
export const flexibleBenefitPlans = mysqlTable('flexible_benefit_plans', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  financialYear: varchar('financial_year', { length: 20 }).notNull(),
  ltaAmount: decimal('lta_amount', { precision: 12, scale: 2 }).default('0.00'),
  fuelAllowanceAmount: decimal('fuel_allowance_amount', { precision: 12, scale: 2 }).default('0.00'),
  telephoneAllowanceAmount: decimal('telephone_allowance_amount', { precision: 12, scale: 2 }).default('0.00'),
  foodCouponsAmount: decimal('food_coupons_amount', { precision: 12, scale: 2 }).default('0.00'),
  totalFbpSelected: decimal('total_fbp_selected', { precision: 12, scale: 2 }).default('0.00'),
  status: varchar('status', { length: 20 }).notNull().default('SUBMITTED'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Salary Arrears & Retroactive Adjustments Table
 */
export const salaryArrears = mysqlTable('salary_arrears', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  effectiveFromMonth: int('effective_from_month').notNull(),
  effectiveFromYear: int('effective_from_year').notNull(),
  effectiveToMonth: int('effective_to_month').notNull(),
  effectiveToYear: int('effective_to_year').notNull(),
  basicDifferenceTotal: decimal('basic_difference_total', { precision: 12, scale: 2 }).notNull(),
  grossDifferenceTotal: decimal('gross_difference_total', { precision: 12, scale: 2 }).notNull(),
  paidInPayrollRunId: varchar('paid_in_payroll_run_id', { length: 36 }),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // 'PENDING' | 'PAID'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Monthly Payroll Processing Runs Table
 */
export const payrollRuns = mysqlTable('payroll_runs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  payrollMonth: int('payroll_month').notNull(),
  payrollYear: int('payroll_year').notNull(),
  financialYear: varchar('financial_year', { length: 20 }).notNull(),
  payPeriodStart: varchar('pay_period_start', { length: 20 }).notNull(),
  payPeriodEnd: varchar('pay_period_end', { length: 20 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('DRAFT'),
  payableDaysPolicy: varchar('payable_days_policy', { length: 30 }).notNull().default('CALENDAR_DAYS'),
  totalEmployees: int('total_employees').notNull().default(0),
  totalGross: decimal('total_gross', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalDeductions: decimal('total_deductions', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalNet: decimal('total_net', { precision: 15, scale: 2 }).notNull().default('0.00'),
  totalEmployerCost: decimal('total_employer_cost', { precision: 15, scale: 2 }).notNull().default('0.00'),
  calculatedBy: varchar('calculated_by', { length: 36 }),
  calculatedAt: timestamp('calculated_at'),
  approvedBy: varchar('approved_by', { length: 36 }),
  approvedAt: timestamp('approved_at'),
  lockedAt: timestamp('locked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Individual Employee Payroll Calculated Items Table
 */
export const payrollItems = mysqlTable('payroll_items', {
  id: varchar('id', { length: 36 }).primaryKey(),
  payrollRunId: varchar('payroll_run_id', { length: 36 }).notNull(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  employeeCode: varchar('employee_code', { length: 50 }).notNull(),
  employeeName: varchar('employee_name', { length: 255 }).notNull(),
  department: varchar('department', { length: 100 }),
  designation: varchar('designation', { length: 100 }),
  bankName: varchar('bank_name', { length: 100 }),
  accountNumber: varchar('account_number', { length: 100 }),
  ifsc: varchar('ifsc', { length: 50 }),
  pan: varchar('pan', { length: 50 }),
  uan: varchar('uan', { length: 50 }),
  
  calendarDays: int('calendar_days').notNull().default(30),
  workingDays: int('working_days').notNull().default(30),
  presentDays: decimal('present_days', { precision: 5, scale: 2 }).notNull().default('0.00'),
  absentDays: decimal('absent_days', { precision: 5, scale: 2 }).notNull().default('0.00'),
  paidLeaveDays: decimal('paid_leave_days', { precision: 5, scale: 2 }).notNull().default('0.00'),
  lopDays: decimal('lop_days', { precision: 5, scale: 2 }).notNull().default('0.00'),
  payableDays: decimal('payable_days', { precision: 5, scale: 2 }).notNull().default('30.00'),
  overtimeHours: decimal('overtime_hours', { precision: 5, scale: 2 }).notNull().default('0.00'),

  basicSalary: decimal('basic_salary', { precision: 12, scale: 2 }).notNull().default('0.00'),
  hra: decimal('hra', { precision: 12, scale: 2 }).notNull().default('0.00'),
  conveyance: decimal('conveyance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  specialAllowance: decimal('special_allowance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  medicalAllowance: decimal('medical_allowance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  otherAllowances: decimal('other_allowances', { precision: 12, scale: 2 }).notNull().default('0.00'),
  overtimePay: decimal('overtime_pay', { precision: 12, scale: 2 }).notNull().default('0.00'),
  reimbursementsAmount: decimal('reimbursements_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  arrearsAmount: decimal('arrears_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  bonusIncentive: decimal('bonus_incentive', { precision: 12, scale: 2 }).notNull().default('0.00'),
  lopDeductionAmount: decimal('lop_deduction_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  grossEarnings: decimal('gross_earnings', { precision: 12, scale: 2 }).notNull().default('0.00'),

  employeePf: decimal('employee_pf', { precision: 12, scale: 2 }).notNull().default('0.00'),
  employeeEsic: decimal('employee_esic', { precision: 12, scale: 2 }).notNull().default('0.00'),
  professionalTax: decimal('professional_tax', { precision: 12, scale: 2 }).notNull().default('0.00'),
  tds: decimal('tds', { precision: 12, scale: 2 }).notNull().default('0.00'),
  loanEmiDeduction: decimal('loan_emi_deduction', { precision: 12, scale: 2 }).notNull().default('0.00'),
  otherDeductions: decimal('other_deductions', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalDeductions: decimal('total_deductions', { precision: 12, scale: 2 }).notNull().default('0.00'),

  netSalary: decimal('net_salary', { precision: 12, scale: 2 }).notNull().default('0.00'),

  employerPf: decimal('employer_pf', { precision: 12, scale: 2 }).notNull().default('0.00'),
  employerEsic: decimal('employer_esic', { precision: 12, scale: 2 }).notNull().default('0.00'),
  gratuityProvision: decimal('gratuity_provision', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalEmployerCost: decimal('total_employer_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),

  calculationBreakdownJson: text('calculation_breakdown_json'),
  status: varchar('status', { length: 20 }).notNull().default('CALCULATED'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Generated Payslips Table
 */
export const payslips = mysqlTable('payslips', {
  id: varchar('id', { length: 36 }).primaryKey(),
  payrollItemId: varchar('payroll_item_id', { length: 36 }).notNull(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  payslipNumber: varchar('payslip_number', { length: 100 }).notNull().unique(),
  payrollMonth: int('payroll_month').notNull(),
  payrollYear: int('payroll_year').notNull(),
  pdfPath: text('pdf_path'),
  sentEmail: boolean('sent_email').notNull().default(false),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
});

/**
 * Bank Payments Batch Table
 */
export const bankPayments = mysqlTable('bank_payments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  payrollRunId: varchar('payroll_run_id', { length: 36 }).notNull(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  employeeCode: varchar('employee_code', { length: 50 }).notNull(),
  employeeName: varchar('employee_name', { length: 255 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }),
  accountNumber: varchar('account_number', { length: 100 }).notNull(),
  ifsc: varchar('ifsc', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('PENDING'),
  transactionRef: varchar('transaction_ref', { length: 100 }),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Full & Final Settlements Table
 */
export const ffSettlements = mysqlTable('ff_settlements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  employeeCode: varchar('employee_code', { length: 50 }).notNull(),
  employeeName: varchar('employee_name', { length: 255 }).notNull(),
  joiningDate: varchar('joining_date', { length: 20 }).notNull(),
  resignationDate: varchar('resignation_date', { length: 20 }),
  lastWorkingDate: varchar('last_working_date', { length: 20 }).notNull(),
  
  pendingSalaryDays: decimal('pending_salary_days', { precision: 5, scale: 2 }).default('0.00'),
  pendingSalaryAmount: decimal('pending_salary_amount', { precision: 12, scale: 2 }).default('0.00'),
  
  leaveEncashmentDays: decimal('leave_encashment_days', { precision: 5, scale: 2 }).default('0.00'),
  leaveEncashmentAmount: decimal('leave_encashment_amount', { precision: 12, scale: 2 }).default('0.00'),
  
  gratuityYears: decimal('gratuity_years', { precision: 5, scale: 2 }).default('0.00'),
  gratuityAmount: decimal('gratuity_amount', { precision: 12, scale: 2 }).default('0.00'),
  
  bonusAmount: decimal('bonus_amount', { precision: 12, scale: 2 }).default('0.00'),
  noticePeriodRecoveryAmount: decimal('notice_period_recovery_amount', { precision: 12, scale: 2 }).default('0.00'),
  loanBalanceRecoveryAmount: decimal('loan_balance_recovery_amount', { precision: 12, scale: 2 }).default('0.00'),
  otherRecoveriesAmount: decimal('other_recoveries_amount', { precision: 12, scale: 2 }).default('0.00'),
  
  totalEarnings: decimal('total_earnings', { precision: 12, scale: 2 }).notNull(),
  totalRecoveries: decimal('total_recoveries', { precision: 12, scale: 2 }).notNull(),
  netSettlementAmount: decimal('net_settlement_amount', { precision: 12, scale: 2 }).notNull(),
  
  settlementStatus: varchar('settlement_status', { length: 20 }).notNull().default('DRAFT'),
  calculationJson: text('calculation_json'),
  pdfPath: text('pdf_path'),
  createdBy: varchar('created_by', { length: 36 }),
  approvedBy: varchar('approved_by', { length: 36 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});
