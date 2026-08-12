import { pgTable, uuid, varchar, text, timestamp, date, numeric, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { company } from './organization';
import { employees } from './employees';
import { users } from './auth';

/**
 * Monthly Payroll Periods
 */
export const payrollPeriods = pgTable(
  'payroll_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => company.id, { onDelete: 'restrict' }),
    year: integer('year').notNull(),
    month: integer('month').notNull(), // 1 to 12
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('OPEN'), // OPEN, PROCESSING, COMPLETED, FINALIZED, CANCELLED
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_pay_period_company_yr_mth').on(table.companyId, table.year, table.month),
  ]
);

/**
 * Monthly Payroll Processing Runs
 */
export const payrollRuns = pgTable(
  'payroll_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    payrollPeriodId: uuid('payroll_period_id').notNull().references(() => payrollPeriods.id, { onDelete: 'restrict' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    status: varchar('status', { length: 20 }).notNull().default('PROCESSING'), // PROCESSING, COMPLETED, FAILED
    processedBy: uuid('processed_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    remarks: text('remarks'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_pay_run_period').on(table.payrollPeriodId),
  ]
);

/**
 * Per-Employee Payroll Totals
 */
export const payrollItems = pgTable(
  'payroll_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    payrollRunId: uuid('payroll_run_id').notNull().references(() => payrollRuns.id, { onDelete: 'cascade' }),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'restrict' }),
    grossAmount: numeric('gross_amount', { precision: 12, scale: 2 }).notNull(),
    totalDeductions: numeric('total_deductions', { precision: 12, scale: 2 }).notNull(),
    netAmount: numeric('net_amount', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('PROCESSED'), // PROCESSED, PAID, HELD
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_pay_item_emp').on(table.employeeId),
  ]
);

/**
 * Payroll Statutory Deductions (PF, ESI, etc.)
 */
export const payrollDeductions = pgTable(
  'payroll_deductions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    payrollItemId: uuid('payroll_item_id').notNull().references(() => payrollItems.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // PF, ESI, OTHER
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  }
);

/**
 * Payroll Taxes (TDS, Professional Tax)
 */
export const payrollTaxes = pgTable(
  'payroll_taxes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    payrollItemId: uuid('payroll_item_id').notNull().references(() => payrollItems.id, { onDelete: 'cascade' }),
    taxType: varchar('tax_type', { length: 50 }).notNull(), // TDS, PROFESSIONAL_TAX
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  }
);

/**
 * Payslips Record
 */
export const payslips = pgTable(
  'payslips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    payrollItemId: uuid('payroll_item_id').notNull().unique().references(() => payrollItems.id, { onDelete: 'restrict' }),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'restrict' }),
    payrollPeriodId: uuid('payroll_period_id').notNull().references(() => payrollPeriods.id, { onDelete: 'restrict' }),
    payslipNumber: varchar('payslip_number', { length: 100 }).notNull().unique(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    storageKey: varchar('storage_key', { length: 512 }),
    status: varchar('status', { length: 20 }).notNull().default('GENERATED'), // GENERATED, PUBLISHED
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_payslips_emp').on(table.employeeId),
  ]
);
