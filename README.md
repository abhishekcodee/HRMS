# HRMS - Single-Company Human Resource Management System

[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith-blue.svg)](#architecture)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)](#database)
[![Node](https://img.shields.io/badge/Backend-Node.js%20%7C%20TypeScript-green.svg)](#technology-stack)
[![Web](https://img.shields.io/badge/Web-React%2019%20%7C%20Vite-61dafb.svg)](#technology-stack)
[![Mobile](https://img.shields.io/badge/Mobile-React%20Native%20%7C%20Expo-000000.svg)](#technology-stack)

---

## 📌 Executive Summary
**HRMS** is a production-grade single-company Human Resource Management System. It is engineered with a **Modular Monolith** backend architecture, a high-performance **React Web** dashboard for Admin/HR workflows, and a cross-platform **React Native (Expo)** mobile application for Android and iOS devices.

### Organization Hierarchy
```
Company
  └── Department
        └── Team
              └── Manager
                    └── Employee
```

---

## 🏗️ Repository Architecture & Workspaces

The repository is structured as a scalable monorepo using standard `npm workspaces`:

```
HRMS/
├── backend/                  # Node.js + TypeScript Modular Monolith API
│   ├── src/
│   │   ├── config/           # Validated environment configuration (Zod)
│   │   ├── database/         # PostgreSQL pool, Drizzle ORM, health checks
│   │   ├── middleware/       # Error handling, request validation, security
│   │   ├── modules/          # 15 Isolated Module Boundaries
│   │   ├── routes/           # Versioned router (/api/v1) & health endpoints
│   │   ├── utils/            # Winston logger, AppError envelope
│   │   ├── app.ts            # Express application configuration
│   │   └── server.ts         # Server bootstrap & graceful shutdown
│   └── tests/                # Unit & Integration test suite
├── web/                      # React 19 + Vite + TypeScript Web Dashboard
│   ├── src/
│   │   ├── components/       # Layout, Navigation, ErrorBoundary, Skeleton
│   │   ├── pages/            # Architecture & Placeholder Module Screens
│   │   ├── styles/           # Dark mode design tokens & CSS system
│   │   └── App.tsx
├── mobile/                   # React Native (Expo) Cross-Platform Mobile App
│   ├── src/
│   │   ├── screens/          # Auth & Dashboard Placeholder Screens
│   │   ├── theme/            # Shared Mobile Styling Tokens
│   │   └── App.tsx
├── packages/
│   └── shared/               # Shared TypeScript Contracts & DTOs (@hrms/shared)
│       ├── src/
│       │   ├── api/          # ApiResponse & ApiErrorResponse Envelopes
│       │   ├── enums/        # Roles, Statuses, Attendance & Leave Enums
│       │   └── domain/       # Organization Hierarchy Interfaces
├── docs/                     # Architectural Documentation Suite
│   ├── architecture.md       # PlantUML diagram, Monolith rationale, Postgres, Integration boundaries
│   ├── development.md        # Setup guide, commands, coding standards, test strategy
│   ├── decisions.md          # Architecture Decision Records (ADRs)
│   ├── modules.md            # Module boundaries, domain responsibilities & inter-module contracts
│   └── security.md           # Security model, RBAC, secret management, auditability
├── .env.example              # Centralized environment variable template
├── .gitignore                # Global workspace gitignore
└── package.json              # Monorepo root workspace configuration
```

---

## 🛠️ Technology Stack & Choices

| Area | Technology Selected | Rationale |
| :--- | :--- | :--- |
| **Backend Framework** | Node.js (v24) + Express | Simple, production-tested, low footprint, modular routing. |
| **Language** | TypeScript (v5.7) | End-to-end type safety across backend, web, mobile, and shared packages. |
| **Database** | PostgreSQL | Enterprise relational integrity, native UUIDs, `NUMERIC` decimal for currency, UTC timestamps (`TIMESTAMPTZ`). |
| **ORM & Migrations** | Drizzle ORM + Drizzle Kit | Lightweight SQL-first ORM, type-safe schema definitions, schema generation. |
| **API Envelope** | REST (`/api/v1`) | Standardized JSON payload wrapper (`ApiResponse<T>` / `ApiErrorResponse`). |
| **Validation** | Zod | Strong runtime validation for HTTP requests and process environment variables. |
| **Web Frontend** | React 19 + Vite | Rapid HMR DX, modern CSS glassmorphism aesthetics, responsive dashboard layout. |
| **Mobile App** | React Native + Expo | Unified codebase targeting both Android & iOS platforms. |

---

## ⚡ Quick Start & Development Setup

### 1. Environment Setup
Copy `.env.example` to `.env` in the root workspace directory:
```bash
cp .env.example .env
```

### 2. Install Monorepo Dependencies
```bash
npm run setup
```

### 3. Build All Workspace Packages
```bash
npm run build
```

### 4. Running Development Servers

- **Backend API Server**:
  ```bash
  npm run dev:backend
  ```
  *API Liveness Probe*: `http://localhost:4000/api/v1/health`  
  *API Readiness Probe*: `http://localhost:4000/api/v1/ready`

- **Web Dashboard Application**:
  ```bash
  npm run dev:web
  ```
  *Local URL*: `http://localhost:5173`

- **Mobile App Shell (Expo)**:
  ```bash
  npm run dev:mobile
  ```

---

## 🧪 Testing & Verification

Run automated test suites across all packages:
```bash
npm run test
```

---

## 📚 Key Architectural Rules & Guidelines

1. **Modular Boundaries**: Business features reside in isolated folders under `backend/src/modules/`. No module directly mutates private tables of another module.
2. **PostgreSQL Currency Integrity**: All salary and financial figures use `NUMERIC(12,2)` decimal representations. Never use floating point (`FLOAT`/`REAL`).
3. **Biometric Integration**: Raw ZKTeco punch logs are stored in `zkteco` raw storage. Employees cannot create regular attendance records manually.
4. **Leave Approval**: Single-stage approval (Manager **OR** HR/Admin). Sequential approval is prohibited.
5. **UTC Timestamp Standard**: All database fields use `TIMESTAMPTZ` and application logic formats timestamps in ISO 8601 UTC string format.

---

## 📄 Comprehensive Documentation
Deep dive architectural documents are available in the [`docs/`](./docs) folder:
- [Architecture & System Design](./docs/architecture.md)
- [Development Standards & Guide](./docs/development.md)
- [Architecture Decision Records (ADRs)](./docs/decisions.md)
- [Module Boundaries & Domain Mapping](./docs/modules.md)
- [Security & RBAC Architecture](./docs/security.md)
