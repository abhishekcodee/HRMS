import { pgTable, uuid, varchar, text, timestamp, numeric, integer, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Single-Company Identity Entity
 */
export const company = pgTable('company', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  legalName: varchar('legal_name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  pincode: varchar('pincode', { length: 20 }).notNull(),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Kolkata'),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Departments Entity (Belongs to Company)
 */
export const departments = pgTable(
  'departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => company.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_dept_company_code').on(table.companyId, table.code),
  ]
);

/**
 * Teams Entity (Belongs to Department)
 */
export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    departmentId: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_team_dept_code').on(table.departmentId, table.code),
  ]
);

/**
 * Company Settings Configuration
 */
export const companySettings = pgTable('company_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().unique().references(() => company.id, { onDelete: 'restrict' }),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Kolkata'),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  dateFormat: varchar('date_format', { length: 30 }).notNull().default('YYYY-MM-DD'),
  shiftStartTime: varchar('shift_start_time', { length: 10 }).notNull().default('09:00'),
  lateGraceMinutes: integer('late_grace_minutes').notNull().default(15),
  fullDayWorkingMinutes: integer('full_day_working_minutes').notNull().default(480),
  halfDayWorkingMinutes: integer('half_day_working_minutes').notNull().default(240),
  defaultCasualLeaveDays: numeric('default_casual_leave_days', { precision: 5, scale: 2 }).notNull().default('12.00'),
  defaultSickLeaveDays: numeric('default_sick_leave_days', { precision: 5, scale: 2 }).notNull().default('7.00'),
  defaultEarnedLeaveDays: numeric('default_earned_leave_days', { precision: 5, scale: 2 }).notNull().default('15.00'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
