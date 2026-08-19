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
 * Master Departments Table
 */
export const masterDepartments = mysqlTable('master_departments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Master Designations Table
 */
export const masterDesignations = mysqlTable('master_designations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  departmentId: varchar('department_id', { length: 36 }),
  departmentName: varchar('department_name', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Master Branches / Locations Table
 */
export const masterBranches = mysqlTable('master_branches', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).default('India'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Master Shifts Table
 */
export const masterShifts = mysqlTable('master_shifts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  startTime: varchar('start_time', { length: 20 }).notNull(),
  endTime: varchar('end_time', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Master Employment Types Table
 */
export const masterEmploymentTypes = mysqlTable('master_employment_types', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Employee Profiles Table - Extended Database First Metadata
 */
export const employeeProfiles = mysqlTable('employee_profiles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  departmentName: varchar('department_name', { length: 100 }),
  designation: varchar('designation', { length: 100 }),
  branchName: varchar('branch_name', { length: 100 }),
  shiftName: varchar('shift_name', { length: 100 }),
  employmentType: varchar('employment_type', { length: 50 }),
  joiningDate: varchar('joining_date', { length: 20 }),
  salary: decimal('salary', { precision: 12, scale: 2 }),
  gender: varchar('gender', { length: 20 }),
  dob: varchar('dob', { length: 20 }),
  address: text('address'),
  emergencyContact: varchar('emergency_contact', { length: 255 }),
  emergencyPhone: varchar('emergency_phone', { length: 50 }),
  managerId: varchar('manager_id', { length: 36 }),
  managerName: varchar('manager_name', { length: 255 }),
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
 * Leave Requests Table - Dual Approval Workflow
 */
export const leaveRequests = mysqlTable('leave_requests', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  leaveType: varchar('leave_type', { length: 50 }).notNull(), // 'Casual Leave' | 'Sick Leave' | 'Earned Leave'
  startDate: varchar('start_date', { length: 20 }).notNull(),
  endDate: varchar('end_date', { length: 20 }).notNull(),
  daysCount: int('days_count').notNull(),
  reason: text('reason'),
  attachment: text('attachment'),
  employerId: varchar('employer_id', { length: 36 }),
  employerStatus: varchar('employer_status', { length: 20 }).notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED'
  employerActionBy: varchar('employer_action_by', { length: 255 }),
  employerActionAt: timestamp('employer_action_at'),
  employerRejectionReason: text('employer_rejection_reason'),
  adminId: varchar('admin_id', { length: 36 }),
  adminStatus: varchar('admin_status', { length: 20 }).notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED'
  adminActionBy: varchar('admin_action_by', { length: 255 }),
  adminActionAt: timestamp('admin_action_at'),
  adminRejectionReason: text('admin_rejection_reason'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // Overall Status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  rejectionRemarks: text('rejection_remarks'),
  reviewedBy: varchar('reviewed_by', { length: 36 }),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Employee Leave Balances Table
 */
export const leaveBalances = mysqlTable('leave_balances', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  leaveType: varchar('leave_type', { length: 50 }).notNull(),
  allocatedDays: decimal('allocated_days', { precision: 5, scale: 2 }).notNull().default('12.00'),
  usedDays: decimal('used_days', { precision: 5, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Email Notifications Log Table
 */
export const emailNotifications = mysqlTable('email_notifications', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }),
  leaveRequestId: varchar('leave_request_id', { length: 36 }),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  emailType: varchar('email_type', { length: 50 }).notNull(), // 'LEAVE_APPLIED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'SALARY_SLIP'
  subject: varchar('subject', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // 'PENDING' | 'SENT' | 'FAILED'
  sentAt: timestamp('sent_at'),
  errorMessage: text('error_message'),
  retryCount: int('retry_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Salary Slip Email Logs Table (Duplicate Protection)
 */
export const salarySlipEmailLogs = mysqlTable('salary_slip_email_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  employeeEmail: varchar('employee_email', { length: 255 }).notNull(),
  salaryMonth: varchar('salary_month', { length: 20 }).notNull(),
  salaryYear: varchar('salary_year', { length: 10 }).notNull(),
  salarySlipFile: varchar('salary_slip_file', { length: 555 }),
  emailSubject: varchar('email_subject', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // 'PENDING' | 'SENT' | 'FAILED'
  sentAt: timestamp('sent_at'),
  errorMessage: text('error_message'),
  retryCount: int('retry_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Leave Audit Trail Table
 */
export const leaveAuditTrail = mysqlTable('leave_audit_trail', {
  id: varchar('id', { length: 36 }).primaryKey(),
  leaveRequestId: varchar('leave_request_id', { length: 36 }).notNull(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'LEAVE_APPLIED' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'LEAVE_CANCELLED'
  previousStatus: varchar('previous_status', { length: 20 }),
  newStatus: varchar('new_status', { length: 20 }).notNull(),
  actionBy: varchar('action_by', { length: 255 }).notNull(),
  actionDate: timestamp('action_date').notNull().defaultNow(),
  remarks: text('remarks'),
  ipAddress: varchar('ip_address', { length: 50 }),
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

/**
 * eSSL / ZKTeco Biometric Devices Table
 */
export const biometricDevices = mysqlTable('biometric_devices', {
  id: varchar('id', { length: 36 }).primaryKey(),
  deviceSn: varchar('device_sn', { length: 100 }).notNull().unique(),
  deviceName: varchar('device_name', { length: 150 }).notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  port: int('port').default(4370),
  location: varchar('location', { length: 150 }),
  status: varchar('status', { length: 20 }).notNull().default('OFFLINE'), // 'ONLINE' | 'OFFLINE'
  lastPingAt: timestamp('last_ping_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Raw eSSL / ZKTeco Biometric Punch Logs Table
 */
export const biometricPunchLogs = mysqlTable('biometric_punch_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  deviceSn: varchar('device_sn', { length: 100 }).notNull(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  punchTime: timestamp('punch_time').notNull(),
  verifyType: varchar('verify_type', { length: 50 }).default('Fingerprint'), // 'Fingerprint' | 'Face' | 'Card' | 'Pin'
  punchState: varchar('punch_state', { length: 20 }).default('0'), // '0'=In, '1'=Out
  rawPayload: text('raw_payload'),
  processed: boolean('processed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

