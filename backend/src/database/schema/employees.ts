import { pgTable, uuid, varchar, text, timestamp, date, bigint, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { company, departments, teams } from './organization';
import { users } from './auth';

/**
 * Employee Table - Business/HR Identity
 */
export const employees = pgTable(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => company.id, { onDelete: 'restrict' }),
    userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'set null' }),
    employeeCode: varchar('employee_code', { length: 50 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    middleName: varchar('middle_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    displayName: varchar('display_name', { length: 255 }),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 20 }),
    personalEmail: varchar('personal_email', { length: 255 }),
    workEmail: varchar('work_email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 50 }).notNull(),
    alternatePhone: varchar('alternate_phone', { length: 50 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    pincode: varchar('pincode', { length: 20 }),
    emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
    emergencyContactPhone: varchar('emergency_contact_phone', { length: 50 }),
    joiningDate: date('joining_date').notNull(),
    employmentStatus: varchar('employment_status', { length: 30 }).notNull().default('ACTIVE'), // ACTIVE, PROBATION, NOTICE_PERIOD, TERMINATED, RESIGNED
    employmentType: varchar('employment_type', { length: 30 }).notNull().default('FULL_TIME'), // FULL_TIME, PART_TIME, CONTRACT, INTERN
    departmentId: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'restrict' }),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'restrict' }),
    managerId: uuid('manager_id'), // Self-referential FK
    designation: varchar('designation', { length: 150 }).notNull(),
    dateOfExit: date('date_of_exit'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_emp_company_code').on(table.companyId, table.employeeCode),
    index('idx_emp_company').on(table.companyId),
    index('idx_emp_dept').on(table.departmentId),
    index('idx_emp_team').on(table.teamId),
    index('idx_emp_manager').on(table.managerId),
    index('idx_emp_status').on(table.employmentStatus),
  ]
);

/**
 * Historical Manager Assignment Tracking
 */
export const employeeManagerHistory = pgTable(
  'employee_manager_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    managerId: uuid('manager_id').notNull().references(() => employees.id, { onDelete: 'restrict' }),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_mgr_hist_emp').on(table.employeeId),
  ]
);

/**
 * Historical Team Membership Tracking
 */
export const employeeTeamHistory = pgTable(
  'employee_team_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'restrict' }),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_team_hist_emp').on(table.employeeId),
  ]
);

/**
 * Employee Documents Metadata Table
 */
export const employeeDocuments = pgTable(
  'employee_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    documentType: varchar('document_type', { length: 50 }).notNull(), // IDENTITY_PROOF, CONTRACT, TAX_DOC, OTHER
    documentName: varchar('document_name', { length: 255 }).notNull(),
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
    uploadedBy: uuid('uploaded_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull().default('VERIFIED'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_emp_docs_emp').on(table.employeeId),
  ]
);
