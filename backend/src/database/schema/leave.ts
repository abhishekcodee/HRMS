import { pgTable, uuid, varchar, text, timestamp, date, numeric, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { company } from './organization';
import { employees } from './employees';
import { users } from './auth';

/**
 * Leave Types Entity
 */
export const leaveTypes = pgTable(
  'leave_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => company.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(), // CL, SL, EL, ML
    description: text('description'),
    defaultDays: numeric('default_days', { precision: 5, scale: 2 }),
    isPaid: boolean('is_paid').notNull().default(true),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_leave_type_company_code').on(table.companyId, table.code),
  ]
);

/**
 * Employee Annual Leave Balances
 */
export const leaveBalances = pgTable(
  'leave_balances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    leaveTypeId: uuid('leave_type_id').notNull().references(() => leaveTypes.id, { onDelete: 'restrict' }),
    year: numeric('year', { precision: 4, scale: 0 }).notNull(), // e.g. 2026
    allocatedDays: numeric('allocated_days', { precision: 5, scale: 2 }).notNull().default('0.00'),
    usedDays: numeric('used_days', { precision: 5, scale: 2 }).notNull().default('0.00'),
    pendingDays: numeric('pending_days', { precision: 5, scale: 2 }).notNull().default('0.00'),
    carriedForwardDays: numeric('carried_forward_days', { precision: 5, scale: 2 }).notNull().default('0.00'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_leave_bal_emp_type_year').on(table.employeeId, table.leaveTypeId, table.year),
  ]
);

/**
 * Leave Applications Table
 */
export const leaveRequests = pgTable(
  'leave_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    leaveTypeId: uuid('leave_type_id').notNull().references(() => leaveTypes.id, { onDelete: 'restrict' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    requestedDays: numeric('requested_days', { precision: 5, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    attachmentKey: varchar('attachment_key', { length: 512 }),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'), // PENDING, APPROVED, REJECTED, CANCELLED
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_lvr_emp_status').on(table.employeeId, table.status),
    index('idx_lvr_dates').on(table.startDate, table.endDate),
  ]
);

/**
 * Single-Stage Leave Approval Record (Manager OR HR/Admin decision)
 */
export const leaveApprovals = pgTable(
  'leave_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leaveRequestId: uuid('leave_request_id').notNull().unique().references(() => leaveRequests.id, { onDelete: 'cascade' }),
    approverUserId: uuid('approver_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    approverRole: varchar('approver_role', { length: 30 }).notNull(), // MANAGER, HR, ADMIN
    decision: varchar('decision', { length: 20 }).notNull(), // APPROVED, REJECTED
    comment: text('comment'),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  }
);
