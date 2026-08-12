CREATE TABLE "attendance_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_record_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"original_check_in_at" timestamp with time zone,
	"original_check_out_at" timestamp with time zone,
	"corrected_check_in_at" timestamp with time zone,
	"corrected_check_out_at" timestamp with time zone,
	"original_status" varchar(30),
	"corrected_status" varchar(30),
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"check_in_at" timestamp with time zone,
	"check_out_at" timestamp with time zone,
	"working_minutes" integer,
	"late_minutes" integer DEFAULT 0 NOT NULL,
	"early_exit_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"status" varchar(30) DEFAULT 'PRESENT' NOT NULL,
	"source" varchar(30) DEFAULT 'BIOMETRIC' NOT NULL,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"old_values_json" text,
	"new_values_json" text,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"data_reference" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"module" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "attendance_raw_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"biometric_user_id" varchar(50) NOT NULL,
	"punch_time" timestamp with time zone NOT NULL,
	"punch_type" varchar(20),
	"raw_event_id" varchar(100),
	"raw_payload" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" varchar(50) DEFAULT 'ZKTECO_PUSH' NOT NULL,
	"processing_status" varchar(20) DEFAULT 'UNPROCESSED' NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biometric_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"device_code" varchar(50) NOT NULL,
	"serial_number" varchar(100) NOT NULL,
	"ip_address" varchar(50),
	"port" integer,
	"location" varchar(255),
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "biometric_devices_device_code_unique" UNIQUE("device_code"),
	CONSTRAINT "biometric_devices_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "employee_biometric_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"biometric_user_id" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'VERIFIED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_manager_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_team_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid,
	"employee_code" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"last_name" varchar(100) NOT NULL,
	"display_name" varchar(255),
	"date_of_birth" date,
	"gender" varchar(20),
	"personal_email" varchar(255),
	"work_email" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"alternate_phone" varchar(50),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"pincode" varchar(20),
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(50),
	"joining_date" date NOT NULL,
	"employment_status" varchar(30) DEFAULT 'ACTIVE' NOT NULL,
	"employment_type" varchar(30) DEFAULT 'FULL_TIME' NOT NULL,
	"department_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"manager_id" uuid,
	"designation" varchar(150) NOT NULL,
	"date_of_exit" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employees_work_email_unique" UNIQUE("work_email")
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"country" varchar(100) NOT NULL,
	"pincode" varchar(20) NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"date_format" varchar(30) DEFAULT 'YYYY-MM-DD' NOT NULL,
	"shift_start_time" varchar(10) DEFAULT '09:00' NOT NULL,
	"late_grace_minutes" integer DEFAULT 15 NOT NULL,
	"full_day_working_minutes" integer DEFAULT 480 NOT NULL,
	"half_day_working_minutes" integer DEFAULT 240 NOT NULL,
	"default_casual_leave_days" numeric(5, 2) DEFAULT '12.00' NOT NULL,
	"default_sick_leave_days" numeric(5, 2) DEFAULT '7.00' NOT NULL,
	"default_earned_leave_days" numeric(5, 2) DEFAULT '15.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_settings_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leave_request_id" uuid NOT NULL,
	"approver_user_id" uuid NOT NULL,
	"approver_role" varchar(30) NOT NULL,
	"decision" varchar(20) NOT NULL,
	"comment" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_approvals_leave_request_id_unique" UNIQUE("leave_request_id")
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"year" numeric(4, 0) NOT NULL,
	"allocated_days" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"used_days" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"pending_days" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"carried_forward_days" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"requested_days" numeric(5, 2) NOT NULL,
	"reason" text NOT NULL,
	"attachment_key" varchar(512),
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"default_days" numeric(5, 2),
	"is_paid" boolean DEFAULT true NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_item_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"gross_amount" numeric(12, 2) NOT NULL,
	"total_deductions" numeric(12, 2) NOT NULL,
	"net_amount" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'PROCESSED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_period_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'PROCESSING' NOT NULL,
	"processed_by" uuid NOT NULL,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_taxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_item_id" uuid NOT NULL,
	"tax_type" varchar(50) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_item_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"payroll_period_id" uuid NOT NULL,
	"payslip_number" varchar(100) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"storage_key" varchar(512),
	"status" varchar(20) DEFAULT 'GENERATED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payslips_payroll_item_id_unique" UNIQUE("payroll_item_id"),
	CONSTRAINT "payslips_payslip_number_unique" UNIQUE("payslip_number")
);
--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_raw_logs" ADD CONSTRAINT "attendance_raw_logs_device_id_biometric_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."biometric_devices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biometric_devices" ADD CONSTRAINT "biometric_devices_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_biometric_mappings" ADD CONSTRAINT "employee_biometric_mappings_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_biometric_mappings" ADD CONSTRAINT "employee_biometric_mappings_device_id_biometric_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."biometric_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_manager_history" ADD CONSTRAINT "employee_manager_history_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_manager_history" ADD CONSTRAINT "employee_manager_history_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_team_history" ADD CONSTRAINT "employee_team_history_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_team_history" ADD CONSTRAINT "employee_team_history_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_leave_request_id_leave_requests_id_fk" FOREIGN KEY ("leave_request_id") REFERENCES "public"."leave_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_payroll_item_id_payroll_items_id_fk" FOREIGN KEY ("payroll_item_id") REFERENCES "public"."payroll_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_payroll_period_id_payroll_periods_id_fk" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_taxes" ADD CONSTRAINT "payroll_taxes_payroll_item_id_payroll_items_id_fk" FOREIGN KEY ("payroll_item_id") REFERENCES "public"."payroll_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_item_id_payroll_items_id_fk" FOREIGN KEY ("payroll_item_id") REFERENCES "public"."payroll_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_period_id_payroll_periods_id_fk" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_att_corr_record" ON "attendance_corrections" USING btree ("attendance_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_att_emp_date" ON "attendance_records" USING btree ("employee_id","attendance_date");--> statement-breakpoint
CREATE INDEX "idx_att_date" ON "attendance_records" USING btree ("attendance_date");--> statement-breakpoint
CREATE INDEX "idx_att_status" ON "attendance_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notif_user_read" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_raw_log_dev_user_punch" ON "attendance_raw_logs" USING btree ("device_id","biometric_user_id","punch_time");--> statement-breakpoint
CREATE INDEX "idx_raw_log_proc_status" ON "attendance_raw_logs" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "idx_raw_log_punch_time" ON "attendance_raw_logs" USING btree ("punch_time");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bio_map_dev_user" ON "employee_biometric_mappings" USING btree ("device_id","biometric_user_id");--> statement-breakpoint
CREATE INDEX "idx_emp_docs_emp" ON "employee_documents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_mgr_hist_emp" ON "employee_manager_history" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_team_hist_emp" ON "employee_team_history" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_emp_company_code" ON "employees" USING btree ("company_id","employee_code");--> statement-breakpoint
CREATE INDEX "idx_emp_company" ON "employees" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_emp_dept" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_emp_team" ON "employees" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_emp_manager" ON "employees" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "idx_emp_status" ON "employees" USING btree ("employment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_dept_company_code" ON "departments" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_team_dept_code" ON "teams" USING btree ("department_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_leave_bal_emp_type_year" ON "leave_balances" USING btree ("employee_id","leave_type_id","year");--> statement-breakpoint
CREATE INDEX "idx_lvr_emp_status" ON "leave_requests" USING btree ("employee_id","status");--> statement-breakpoint
CREATE INDEX "idx_lvr_dates" ON "leave_requests" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_leave_type_company_code" ON "leave_types" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "idx_pay_item_emp" ON "payroll_items" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pay_period_company_yr_mth" ON "payroll_periods" USING btree ("company_id","year","month");--> statement-breakpoint
CREATE INDEX "idx_pay_run_period" ON "payroll_runs" USING btree ("payroll_period_id");--> statement-breakpoint
CREATE INDEX "idx_payslips_emp" ON "payslips" USING btree ("employee_id");