import { pgTable, uuid, varchar, text, timestamp, date, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { employees } from './employees';
import { users } from './auth';

/**
 * Processed Daily Attendance Records
 */
export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    attendanceDate: date('attendance_date').notNull(),
    checkInAt: timestamp('check_in_at', { withTimezone: true }),
    checkOutAt: timestamp('check_out_at', { withTimezone: true }),
    workingMinutes: integer('working_minutes'),
    lateMinutes: integer('late_minutes').notNull().default(0),
    earlyExitMinutes: integer('early_exit_minutes').notNull().default(0),
    overtimeMinutes: integer('overtime_minutes').notNull().default(0),
    status: varchar('status', { length: 30 }).notNull().default('PRESENT'), // PRESENT, ABSENT, LATE, HALF_DAY, LEAVE, HOLIDAY, WEEK_OFF, MISSING_PUNCH, OTHER
    source: varchar('source', { length: 30 }).notNull().default('BIOMETRIC'),
    remarks: text('remarks'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_att_emp_date').on(table.employeeId, table.attendanceDate),
    index('idx_att_date').on(table.attendanceDate),
    index('idx_att_status').on(table.status),
  ]
);

/**
 * Auditable Attendance Correction Requests
 */
export const attendanceCorrections = pgTable(
  'attendance_corrections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attendanceRecordId: uuid('attendance_record_id').notNull().references(() => attendanceRecords.id, { onDelete: 'cascade' }),
    requestedBy: uuid('requested_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'restrict' }),
    originalCheckInAt: timestamp('original_check_in_at', { withTimezone: true }),
    originalCheckOutAt: timestamp('original_check_out_at', { withTimezone: true }),
    correctedCheckInAt: timestamp('corrected_check_in_at', { withTimezone: true }),
    correctedCheckOutAt: timestamp('corrected_check_out_at', { withTimezone: true }),
    originalStatus: varchar('original_status', { length: 30 }),
    correctedStatus: varchar('corrected_status', { length: 30 }),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_att_corr_record').on(table.attendanceRecordId),
  ]
);
