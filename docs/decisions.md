# HRMS Architecture Decision Records (ADRs)

This document logs key architectural and design choices made during the establishment of the HRMS foundation.

---

## ADR-001: Adoption of Modular Monolith Architecture

### Status
Accepted

### Context
HRMS requires robust module isolation across 15 core domains (`auth`, `users`, `roles`, `organization`, `employees`, `attendance`, `zkteco`, `leave`, `payroll`, etc.) while remaining straightforward to build, test, and deploy for a single company.

### Decision
Implement a Modular Monolith backend. Each module resides in `backend/src/modules/[module_name]` with isolated routes, controllers, and services. Direct cross-module database mutation is strictly prohibited.

### Consequences
- **Positive**: Low operational complexity, fast local development cycle, single deployment target.
- **Positive**: Clear boundary isolation allows individual modules to be extracted into independent microservices in the future.
- **Negative**: Requires strict code discipline to prevent improper cross-module dependencies.

---

## ADR-002: PostgreSQL Database with UUID Primary Keys & NUMERIC Currency

### Status
Accepted

### Context
HR data demands ACID transactions, relational hierarchy enforcement (`Company → Department → Team → Manager → Employee`), and financial calculation integrity for India payroll (PF, ESI, TDS).

### Decision
1. Use PostgreSQL as the primary relational database.
2. Use native `UUIDv4` for all primary key columns (`gen_random_uuid()`).
3. Store monetary and salary figures exclusively in `NUMERIC(12, 2)` or `DECIMAL(12, 2)` format.
4. Store all timestamps in UTC (`TIMESTAMPTZ`).

### Consequences
- **Positive**: Prevents floating-point rounding errors in payroll.
- **Positive**: UUIDs prevent sequential ID enumeration and simplify multi-database splitting.
- **Negative**: UUIDs occupy slightly more storage index overhead than 32-bit integers.

---

## ADR-003: Monorepo with Shared TypeScript Contracts (`@hrms/shared`)

### Status
Accepted

### Context
The HRMS system supports Web, Android, and iOS clients that consume the same RESTful API backend endpoints.

### Decision
Structure the project as an npm workspace monorepo containing `backend`, `web`, `mobile`, and `packages/shared`. `@hrms/shared` contains all DTOs, API envelopes, and status enums.

### Consequences
- **Positive**: Single source of truth for contracts. Breaking API payload changes trigger compile-time TypeScript errors across Web and Mobile.
- **Negative**: Workspace package resolution requires standard build orchestration.

---

## ADR-004: ZKTeco Raw Punch Log Isolation Boundary

### Status
Accepted

### Context
Attendance data originates from ZKTeco biometric devices. Manual creation of standard attendance entries by employees is strictly prohibited.

### Decision
Store raw biometric logs in a dedicated `zkteco` log repository without mutating raw values. The `attendance` module processes these raw logs asynchronously into daily work durations.

### Consequences
- **Positive**: Maintains an immutable audit trail of raw biometric device punches.
- **Positive**: Protects attendance calculations from unauthorized manual manipulation.

---

## ADR-005: Single-Stage Leave Approval Policy

### Status
Accepted

### Context
Employees apply for leave, which can be reviewed by either their direct Manager OR an HR/Admin user.

### Decision
Implement a single-stage approval workflow. Once an authorized Manager **OR** HR/Admin approves or rejects the application, the leave status updates immediately. Sequential Manager-then-HR approval is not required.

### Consequences
- **Positive**: Streamlines leave workflow and avoids approval bottlenecks.
- **Positive**: Simple status state machine (`PENDING` → `APPROVED` / `REJECTED`).
