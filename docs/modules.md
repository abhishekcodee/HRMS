# HRMS Backend Module Specifications

This document defines the domain scope, boundaries, and responsibilities for all 15 backend modules in the HRMS modular monolith architecture.

---

## 1. Module Boundaries Overview

```
backend/src/modules/
├── auth/                 # Authentication, Session & Token Issuance
├── users/                # User Credentials & Basic Profile Metadata
├── roles/                # System Roles (Admin, HR, Manager, Employee)
├── permissions/          # Fine-grained Permission Policies
├── organization/         # Organization Hierarchy Structure
├── employees/            # Employee Master Directory & Profiles
├── attendance/           # Processed Work Hours & Shift Calculations
├── zkteco/               # Raw Biometric Punch Logs & Device Ingestion
├── leave/                # Leave Requests & Single-Stage Approvals
├── payroll/              # Monthly India Payroll, PF, ESI, TDS, Payslips
├── documents/            # Document Storage & Compliance Files
├── notifications/        # Multi-Channel Notifications (In-App, Email)
├── reports/              # Analytics & Export Summaries
└── audit/                # First-Class Security Audit Logs
```

---

## 2. Module Specifications & Responsibilities

### 2.1 `auth`
- **Responsibilities**: User login, password verification, JWT token generation, refresh token rotation.
- **Rules**: Must securely hash passwords (e.g., Argon2/bcrypt). Never store passwords in plaintext.

### 2.2 `users`
- **Responsibilities**: User account lifecycle, account lock/unlock, credential updates.
- **Rules**: Separated from core employee HR master data.

### 2.3 `roles` & 2.4 `permissions`
- **Responsibilities**: Role Based Access Control (RBAC). Provides definitions for default system roles (`ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`).
- **Rules**: Backend authorization is evaluated independently of frontend visibility.

### 2.5 `organization`
- **Responsibilities**: Manages the single-company structural hierarchy:
  $$\text{Company} \longrightarrow \text{Department} \longrightarrow \text{Team} \longrightarrow \text{Manager} \longrightarrow \text{Employee}$$
- **Rules**: Ensures foreign key integrity across organization levels.

### 2.6 `employees`
- **Responsibilities**: Employee master records, emergency contacts, job titles, department/team assignments, reporting manager links.

### 2.7 `attendance` & 2.8 `zkteco`
- **Responsibilities**:
  - `zkteco`: Ingests and stores raw biometric logs directly from hardware devices. Raw logs are preserved without modification.
  - `attendance`: Reads raw biometric logs and applies shift rules to produce calculated daily attendance records.
- **Rules**: Employees CANNOT manually create regular attendance entries.

### 2.9 `leave`
- **Responsibilities**: Leave entitlement tracking, leave application submission, status transitions (`PENDING`, `APPROVED`, `REJECTED`).
- **Rules**: Approval workflow is single-stage (Manager **OR** HR/Admin). Sequential approval is not required.

### 2.10 `payroll`
- **Responsibilities**: Monthly India payroll processing. Calculates basic salary, allowances, statutory deductions (PF, ESI, TDS), and net pay. Generates payslips.
- **Rules**: All currency calculations use `NUMERIC` decimal types. Floating-point math is strictly forbidden.

### 2.11 `documents`
- **Responsibilities**: Employee document metadata, identity proof uploads, contract records.

### 2.12 `notifications`
- **Responsibilities**: Dispatches system notifications for leave status changes, payslip publication, and administrative alerts.

### 2.13 `reports`
- **Responsibilities**: Compiles aggregated reports for headcounts, attendance summaries, leave balances, and payroll disbursements.

### 2.14 `audit`
- **Responsibilities**: Records immutable audit logs for security-sensitive actions (permission updates, salary modifications, profile changes).
