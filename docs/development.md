# HRMS Development & Engineering Standards

This document establishes the engineering practices, coding standards, environment guidelines, database workflows, and testing strategy for the HRMS repository.

---

## 1. Environment & Secrets Configuration

1. **Centralized Environment Variables**: All environment variable configurations reside in `.env`.
2. **Validation**: Runtime environment parsing is enforced using Zod in `backend/src/config/env.ts`. Missing required variables will halt application initialization immediately with clear error formatting.
3. **Secrets Hygiene**: Never commit `.env` or secret keys to Git. Use `.env.example` as the canonical reference.

---

## 2. Monorepo Workflow Commands

| Action | Command | Scope |
| :--- | :--- | :--- |
| **Install Dependencies** | `npm run setup` | All Workspaces |
| **Build All Packages** | `npm run build` | `@hrms/shared`, `backend`, `web`, `mobile` |
| **Run Backend Dev Server** | `npm run dev:backend` | `backend` (TSX Watch) |
| **Run Web Dev Server** | `npm run dev:web` | `web` (Vite Server) |
| **Run Mobile Dev Server** | `npm run dev:mobile` | `mobile` (Expo Server) |
| **Execute Migration Runner**| `npm run db:migrate` | `backend` |
| **Execute Seed Runner** | `npm run db:seed` | `backend` |
| **Execute Automated Tests** | `npm run test` | All Workspaces |

---

## 3. Database Migration & Seed Strategy

### 3.1 Migration Framework
- Drizzle ORM schemas live in `backend/src/database/schema/`.
- Generated migrations are placed in `backend/src/database/migrations/`.
- Execute migrations using:
  ```bash
  npm run db:migrate
  ```

### 3.2 Database Naming Conventions
- **Table Names**: Snake_case plural (e.g., `company_departments`, `employee_leave_applications`).
- **Primary Keys**: `id` column using native PostgreSQL `UUIDv4`.
- **Foreign Keys**: `[target_singular]_id` (e.g., `department_id`, `manager_id`).
- **Timestamps**: `created_at` and `updated_at` storing UTC `TIMESTAMPTZ`.
- **Monetary Amounts**: `NUMERIC(12, 2)` or `DECIMAL(12, 2)`.

---

## 4. API Standardization & Response Envelopes

All HTTP APIs MUST return standardized JSON responses:

### 4.1 Success Payload Structure (`ApiResponse<T>`)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "name": "Human Resources"
  },
  "meta": {
    "timestamp": "2026-08-11T11:30:00.000Z",
    "version": "v1"
  }
}
```

### 4.2 Error Payload Structure (`ApiErrorResponse`)
```json
{
  "success": false,
  "message": "Request validation failed",
  "errorCode": "VALIDATION_ERROR",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "Invalid email address format"
    }
  ],
  "timestamp": "2026-08-11T11:30:00.000Z",
  "path": "/api/v1/users"
}
```

---

## 5. Automated Testing Strategy

1. **Backend Integration Tests**: Unit and integration tests for route handlers, controllers, error middleware, and health checks are located in `backend/tests/` using Vitest and Supertest.
2. **Validation Tests**: Ensure invalid payloads return HTTP 400 with `VALIDATION_ERROR`.
3. **Execution**: Run tests locally with `npm run test`.
