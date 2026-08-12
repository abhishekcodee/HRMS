import { mysqlTable, varchar, text, timestamp, decimal, boolean, int } from 'drizzle-orm/mysql-core';

/**
 * Users Table - HRMS Core Authentication & Identity
 */
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 50 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'admin' | 'employer' | 'employee'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'inactive' | 'suspended'
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  passwordChangedAt: timestamp('password_changed_at'),
  profilePhoto: text('profile_photo'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Employee Profiles Table
 */
export const employeeProfiles = mysqlTable('employee_profiles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  departmentName: varchar('department_name', { length: 100 }),
  designation: varchar('designation', { length: 100 }),
  joiningDate: varchar('joining_date', { length: 20 }),
  salary: decimal('salary', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Employer Profiles Table
 */
export const employerProfiles = mysqlTable('employer_profiles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  taxId: varchar('tax_id', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Attendance Records Table - User Isolated
 */
export const attendance = mysqlTable('attendance', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  workDate: varchar('work_date', { length: 20 }).notNull(),
  clockIn: varchar('clock_in', { length: 20 }),
  clockOut: varchar('clock_out', { length: 20 }),
  workHours: decimal('work_hours', { precision: 5, scale: 2 }),
  status: varchar('status', { length: 20 }).notNull(), // 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'ON_LEAVE'
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Leave Requests Table - User Isolated
 */
export const leaveRequests = mysqlTable('leave_requests', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  leaveType: varchar('leave_type', { length: 50 }).notNull(), // 'Casual Leave' | 'Sick Leave' | 'Earned Leave'
  startDate: varchar('start_date', { length: 20 }).notNull(),
  endDate: varchar('end_date', { length: 20 }).notNull(),
  daysCount: int('days_count').notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Payroll Records Table - User Isolated & Sensitive
 */
export const payrollRecords = mysqlTable('payroll_records', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  payPeriod: varchar('pay_period', { length: 50 }).notNull(), // e.g. "July 2026"
  basicSalary: decimal('basic_salary', { precision: 12, scale: 2 }).notNull(),
  allowances: decimal('allowances', { precision: 12, scale: 2 }).notNull(),
  deductions: decimal('deductions', { precision: 12, scale: 2 }).notNull(),
  netSalary: decimal('net_salary', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('DISBURSED'),
  disbursedAt: timestamp('disbursed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Employee Documents Table - User Isolated
 */
export const employeeDocuments = mysqlTable('employee_documents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  documentType: varchar('document_type', { length: 100 }).notNull(),
  fileUrl: text('file_url'),
  fileSize: varchar('file_size', { length: 50 }),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

/**
 * Password Reset Tokens Table
 */
export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Audit Logs Table
 */
export const auditLogs = mysqlTable('audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }),
  userEmail: varchar('user_email', { length: 255 }),
  role: varchar('role', { length: 20 }),
  action: varchar('action', { length: 100 }).notNull(),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
