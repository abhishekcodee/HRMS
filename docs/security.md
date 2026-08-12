# HRMS Security & Compliance Specification

This document details the security model, access control design, data protection rules, environment management, and audit logging standards for HRMS.

---

## 1. Password & Credential Security
- **No Plaintext Passwords**: Passwords MUST NEVER be logged or stored in plaintext under any circumstances.
- **Secure Hashing Algorithm**: User passwords must be hashed using Argon2id or bcrypt with a minimum cost factor of 12.
- **Secrets Isolation**: Secrets (JWT keys, DB credentials) must be injected solely via process environment variables (`.env`). Commit of `.env` files to source control is blocked by `.gitignore`.

---

## 2. Authentication vs. Authorization

```
Incoming Request
       │
       ▼
[Authentication Middleware] ─── (Verifies JWT Signature & Expiry)
       │
       ▼
[Authorization Middleware]  ─── (Verifies Role / Permission Grants)
       │
       ▼
[Controller Action Execution]
```

1. **Decoupled Architecture**: Authentication (verifying who the user is) and Authorization (verifying what the user is allowed to do) are implemented in separate middleware layers.
2. **Backend Enforcement**: Backend endpoints evaluate RBAC permissions independently. Frontend UI component visibility is treated purely as a user experience enhancement, never as a security boundary.

---

## 3. Role Based Access Control (RBAC) Matrix

| User Role | Organization Admin | Employee Data | Biometric Config | Leave Approval | Payroll & Payslips | Audit Logs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin** | Full Access | Full Access | Full Access | Full Access | Full Access | View & Export |
| **HR** | View Hierarchy | Full Access | View Logs | Approve / Reject | Full Access | View |
| **Manager** | View Department | Team Access | View Team Logs | Approve / Reject (Team) | No Access | No Access |
| **Employee** | View Company | Self Only | Self Logs | Apply / View Self | View Self Payslip | No Access |

---

## 4. Input Validation & Network Security

- **Strict Payload Validation**: All incoming API requests (request body, query parameters, route parameters) are validated against Zod schemas using `validateRequest()` middleware. Malformed inputs are rejected immediately with HTTP 400.
- **HTTP Security Headers**: Enforced via `helmet()` middleware (X-Frame-Options, X-Content-Type-Options, HSTS).
- **CORS Protection**: Restricted to configured origins specified in `CORS_ORIGIN`.

---

## 5. First-Class Auditability Architecture

- **Audit Log Entry Structure**:
  - `id` (UUIDv4)
  - `user_id` (UUIDv4 of operator)
  - `action` (e.g., `ROLE_UPDATE`, `LEAVE_APPROVE`, `PAYROLL_RUN`)
  - `resource_type` & `resource_id`
  - `ip_address` & `user_agent`
  - `timestamp` (UTC ISO string)
  - `changes_json` (Before / After payload diff)
- **Immutability**: Audit log entries can only be appended (`INSERT`). `UPDATE` and `DELETE` operations are strictly forbidden by database triggers.
