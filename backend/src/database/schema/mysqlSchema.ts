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
  experienceYears: decimal('experience_years', { precision: 5, scale: 2 }).default('0.00'),
  salary: decimal('salary', { precision: 12, scale: 2 }),
  gender: varchar('gender', { length: 20 }),
  dob: varchar('dob', { length: 20 }),
  address: text('address'),
  residentialAddress: text('residential_address'),
  residentialCity: varchar('residential_city', { length: 100 }),
  residentialState: varchar('residential_state', { length: 100 }),
  residentialPincode: varchar('residential_pincode', { length: 20 }),
  permanentAddress: text('permanent_address'),
  permanentCity: varchar('permanent_city', { length: 100 }),
  permanentState: varchar('permanent_state', { length: 100 }),
  permanentPincode: varchar('permanent_pincode', { length: 20 }),
  permanentAddressSame: boolean('permanent_address_same').default(false),
  emergencyContact: varchar('emergency_contact', { length: 255 }),
  emergencyPhone: varchar('emergency_phone', { length: 50 }),
  managerId: varchar('manager_id', { length: 36 }),
  managerName: varchar('manager_name', { length: 255 }),
  grade: int('grade'),
  dateOfSeparation: varchar('date_of_separation', { length: 20 }),
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
 * Leave Policies Table - Configuration for PL / CL Accruals
 */
export const leavePolicies = mysqlTable('leave_policies', {
  id: varchar('id', { length: 36 }).primaryKey(),
  leaveType: varchar('leave_type', { length: 20 }).notNull(), // 'PL' | 'CL'
  annualQuota: decimal('annual_quota', { precision: 5, scale: 2 }).notNull(), // TODO: confirm with HR policy (14.00 for PL, 7.00 for CL)
  waitingMonthsHigh: int('waiting_months_high').notNull().default(6),
  waitingMonthsLow: int('waiting_months_low').notNull().default(8),
  gradeThreshold: int('grade_threshold').notNull().default(3),
  effectiveFrom: varchar('effective_from', { length: 20 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Leave Entitlements Table - Calculated Output for Audit & Diffing
 */
export const leaveEntitlements = mysqlTable('leave_entitlements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  leaveType: varchar('leave_type', { length: 20 }).notNull(),
  fyStart: varchar('fy_start', { length: 20 }).notNull(),
  fyEnd: varchar('fy_end', { length: 20 }).notNull(),
  eligibleFrom: varchar('eligible_from', { length: 20 }),
  monthsCounted: int('months_counted').notNull().default(0),
  rawDays: decimal('raw_days', { precision: 7, scale: 3 }).notNull().default('0.000'),
  entitledDays: int('entitled_days').notNull().default(0),
  policyId: varchar('policy_id', { length: 36 }),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
});

/**
 * Leave Transactions Table - Immutable Ledger (Credit, Debit, Adjustment, Carry Forward)
 */
export const leaveTransactions = mysqlTable('leave_transactions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  leaveType: varchar('leave_type', { length: 20 }).notNull(),
  fyStart: varchar('fy_start', { length: 20 }).notNull(),
  type: varchar('type', { length: 30 }).notNull(), // 'credit' | 'debit' | 'adjustment' | 'carry_forward'
  days: decimal('days', { precision: 5, scale: 2 }).notNull(),
  fromDate: varchar('from_date', { length: 20 }),
  toDate: varchar('to_date', { length: 20 }),
  reason: text('reason'),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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

/**
 * In-App User Notifications Table
 */
export const inAppNotifications = mysqlTable('in_app_notifications', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  link: varchar('link', { length: 255 }),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Appointment Letter Templates Table - Customizable Corporate HR Branding & Layout Configuration
 */
export const appointmentLetterTemplates = mysqlTable('appointment_letter_templates', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().default('Standard Corporate Template'),
  companyName: varchar('company_name', { length: 255 }).notNull().default('Acme Global Technologies Pvt. Ltd.'),
  companyTagline: text('company_tagline'),
  companyLogo: text('company_logo'),
  companyAddress: text('company_address'),
  companyEmail: varchar('company_email', { length: 255 }),
  companyPhone: varchar('company_phone', { length: 50 }),
  companyWebsite: varchar('company_website', { length: 255 }),
  primaryBrandColor: varchar('primary_brand_color', { length: 20 }).notNull().default('#1E3A5F'),
  secondaryBrandColor: varchar('secondary_brand_color', { length: 20 }).notNull().default('#0F172A'),
  accentColor: varchar('accent_color', { length: 20 }).notNull().default('#3B82F6'),
  fontFamily: varchar('font_family', { length: 100 }).notNull().default('Plus Jakarta Sans'),
  letterTitle: varchar('letter_title', { length: 255 }).notNull().default('APPOINTMENT LETTER'),
  referencePrefix: varchar('reference_prefix', { length: 50 }).notNull().default('APPT/2026/'),
  openingTemplate: text('opening_template'),
  termsAndConditions: text('terms_and_conditions'), // JSON string array of clauses
  signatoryName: varchar('signatory_name', { length: 255 }).notNull().default('Rajesh Sharma'),
  signatoryDesignation: varchar('signatory_designation', { length: 255 }).notNull().default('Head of Human Resources'),
  signatorySignature: text('signatory_signature'),
  acceptanceText: text('acceptance_text'),
  footerText: text('footer_text'),
  sectionsOrder: text('sections_order'), // JSON string array of section ids
  sectionsVisibility: text('sections_visibility'), // JSON string map of section visibilities
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Employee Appointment Letters Table - Generated Versioned Official Documents
 */
export const employeeAppointmentLetters = mysqlTable('employee_appointment_letters', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }),
  templateId: varchar('template_id', { length: 36 }),
  employeeName: varchar('employee_name', { length: 255 }),
  employeeCode: varchar('employee_code', { length: 50 }),
  designation: varchar('designation', { length: 150 }),
  joiningDate: varchar('joining_date', { length: 20 }),
  acceptanceDate: varchar('acceptance_date', { length: 20 }),
  referenceNumber: varchar('reference_number', { length: 100 }).notNull(),
  versionNumber: int('version_number').notNull().default(1),
  generatedDate: varchar('generated_date', { length: 20 }).notNull(),
  annualCtc: decimal('annual_ctc', { precision: 12, scale: 2 }),
  monthlyGross: decimal('monthly_gross', { precision: 12, scale: 2 }),
  basicSalary: decimal('basic_salary', { precision: 12, scale: 2 }),
  allowances: decimal('allowances', { precision: 12, scale: 2 }),
  otherComponents: decimal('other_components', { precision: 12, scale: 2 }),
  salaryDetailsJson: text('salary_details_json'),
  companyDetailsJson: text('company_details_json'),
  hrName: varchar('hr_name', { length: 255 }),
  hrDesignation: varchar('hr_designation', { length: 255 }),
  probationPeriod: varchar('probation_period', { length: 50 }),
  noticePeriod: varchar('notice_period', { length: 50 }),
  workingHours: varchar('working_hours', { length: 100 }),
  weeklyOff: varchar('weekly_off', { length: 50 }),
  workLocation: varchar('work_location', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('GENERATED'), // 'DRAFT' | 'GENERATED' | 'FINAL' | 'CANCELLED'
  pdfPath: text('pdf_path'),
  htmlSnapshot: text('html_snapshot'),
  generatedBy: varchar('generated_by', { length: 36 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Document Categories Table
 */
export const documentCategories = mysqlTable('document_categories', {
  id: varchar('id', { length: 36 }).primaryKey(),
  companyId: varchar('company_id', { length: 36 }),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(true),
  displayOrder: int('display_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Document Types Table
 */
export const documentTypes = mysqlTable('document_types', {
  id: varchar('id', { length: 36 }).primaryKey(),
  companyId: varchar('company_id', { length: 36 }),
  categoryId: varchar('category_id', { length: 36 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),
  requiresApproval: boolean('requires_approval').notNull().default(false),
  requiresSignature: boolean('requires_signature').notNull().default(false),
  requiresEmployeeAccess: boolean('requires_employee_access').notNull().default(true),
  approvalChainJson: text('approval_chain_json'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Document Templates Table
 */
export const documentTemplates = mysqlTable('document_templates', {
  id: varchar('id', { length: 36 }).primaryKey(),
  companyId: varchar('company_id', { length: 36 }),
  documentTypeId: varchar('document_type_id', { length: 36 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  currentVersionId: varchar('current_version_id', { length: 36 }),
  currentVersionNumber: int('current_version_number').notNull().default(1),
  numberingFormat: varchar('numbering_format', { length: 150 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Document Template Versions Table
 */
export const documentTemplateVersions = mysqlTable('document_template_versions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  templateId: varchar('template_id', { length: 36 }).notNull(),
  versionNumber: int('version_number').notNull(),
  content: text('content').notNull(),
  cssStyles: text('css_styles'),
  headerTemplate: text('header_template'),
  footerTemplate: text('footer_template'),
  signatoryName: varchar('signatory_name', { length: 255 }),
  signatoryDesignation: varchar('signatory_designation', { length: 255 }),
  signatorySignatureUrl: text('signatory_signature_url'),
  companyLogoUrl: text('company_logo_url'),
  primaryColor: varchar('primary_color', { length: 20 }),
  secondaryColor: varchar('secondary_color', { length: 20 }),
  changeSummary: text('change_summary'),
  createdBy: varchar('created_by', { length: 36 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Documents Master Table
 */
export const documents = mysqlTable('documents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  employeeId: varchar('employee_id', { length: 36 }).notNull(),
  documentTypeId: varchar('document_type_id', { length: 36 }).notNull(),
  templateId: varchar('template_id', { length: 36 }),
  templateVersionId: varchar('template_version_id', { length: 36 }),
  templateVersionNumber: int('template_version_number').default(1),
  referenceNumber: varchar('reference_number', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
  htmlSnapshot: text('html_snapshot'),
  pdfPath: text('pdf_path'),
  fileSize: varchar('file_size', { length: 50 }),
  documentHash: varchar('document_hash', { length: 64 }), // SHA-256
  metadataJson: text('metadata_json'),
  generatedBy: varchar('generated_by', { length: 36 }),
  approvedAt: timestamp('approved_at'),
  signedAt: timestamp('signed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Document Approvals Table
 */
export const documentApprovals = mysqlTable('document_approvals', {
  id: varchar('id', { length: 36 }).primaryKey(),
  documentId: varchar('document_id', { length: 36 }).notNull(),
  stepOrder: int('step_order').notNull().default(1),
  approverRoleId: varchar('approver_role_id', { length: 50 }),
  approverUserId: varchar('approver_user_id', { length: 36 }),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  comments: text('comments'),
  actionAt: timestamp('action_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Document Signatures Table
 */
export const documentSignatures = mysqlTable('document_signatures', {
  id: varchar('id', { length: 36 }).primaryKey(),
  documentId: varchar('document_id', { length: 36 }).notNull(),
  signatoryType: varchar('signatory_type', { length: 20 }).notNull(), // 'COMPANY' | 'EMPLOYEE' | 'WITNESS'
  signatoryName: varchar('signatory_name', { length: 255 }).notNull(),
  signatoryDesignation: varchar('signatory_designation', { length: 255 }),
  signatureImage: text('signature_image'),
  signedAt: timestamp('signed_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 50 }),
});

/**
 * User MFA Credentials Table
 */
export const userMfaCredentials = mysqlTable('user_mfa_credentials', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().unique(),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaMethod: varchar('mfa_method', { length: 20 }).notNull().default('TOTP'),
  totpSecret: text('totp_secret'),
  backupCodesJson: text('backup_codes_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Active User Sessions Table
 */
export const userSessions = mysqlTable('user_sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  deviceInfo: text('device_info'),
  ipAddress: varchar('ip_address', { length: 50 }),
  expiresAt: timestamp('expires_at').notNull(),
  isRevoked: boolean('is_revoked').notNull().default(false),
  lastActiveAt: timestamp('last_active_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Centralized Security Audit Logs Table
 */
export const securityAuditLogs = mysqlTable('security_audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  companyId: varchar('company_id', { length: 36 }),
  actorUserId: varchar('actor_user_id', { length: 36 }),
  actorUserEmail: varchar('actor_user_email', { length: 255 }),
  actorRole: varchar('actor_role', { length: 20 }),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('SUCCESS'), // 'SUCCESS' | 'FAILURE' | 'DENIED'
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  metadataJson: text('metadata_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Generated HR Documents Table - Multi-Document Centralized System
 */
export const companyLetterheads = mysqlTable('company_letterheads', {
  id: varchar('id', { length: 36 }).primaryKey(),
  companyId: varchar('company_id', { length: 36 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(), // 'pdf' | 'png' | 'jpeg' | 'jpg'
  fileSize: int('file_size'),
  version: int('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  marginsJson: text('margins_json'), // JSON string: { top: 20, bottom: 20, left: 15, right: 15 } in mm
  uploadedBy: varchar('uploaded_by', { length: 36 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Company Letterhead Policy Settings Table
 */
export const companyLetterheadSettings = mysqlTable('company_letterhead_settings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  companyId: varchar('company_id', { length: 36 }).notNull().unique(),
  requireLetterhead: boolean('require_letterhead').notNull().default(false),
  allowHrReplace: boolean('allow_hr_replace').notNull().default(true),
  allowHrEditCompanyDetails: boolean('allow_hr_edit_company_details').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Generated HR Documents Table - Multi-Document Centralized System
 */
export const generatedHrDocuments = mysqlTable('generated_hr_documents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  companyId: varchar('company_id', { length: 36 }),
  letterheadId: varchar('letterhead_id', { length: 36 }),
  letterheadVersion: int('letterhead_version').default(1),
  documentType: varchar('document_type', { length: 100 }).notNull(),
  templateId: varchar('template_id', { length: 36 }),
  templateVersion: int('template_version').notNull().default(1),
  userId: varchar('user_id', { length: 36 }),
  employeeSalutation: varchar('employee_salutation', { length: 10 }),
  employeeName: varchar('employee_name', { length: 255 }).notNull(),
  employeeCode: varchar('employee_code', { length: 50 }).notNull(),
  designation: varchar('designation', { length: 150 }),
  department: varchar('department', { length: 150 }),
  documentDate: varchar('document_date', { length: 20 }),
  joiningDate: varchar('joining_date', { length: 20 }),
  leavingDate: varchar('leaving_date', { length: 20 }),
  relievingDate: varchar('relieving_date', { length: 20 }),
  salaryDetailsJson: text('salary_details_json'),
  documentDataJson: text('document_data_json'),
  companyDetailsJson: text('company_details_json'),
  hrName: varchar('hr_name', { length: 255 }),
  hrDesignation: varchar('hr_designation', { length: 255 }),
  filePath: varchar('file_path', { length: 500 }),
  status: varchar('status', { length: 50 }).notNull().default('GENERATED'),
  generatedBy: varchar('generated_by', { length: 36 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});



