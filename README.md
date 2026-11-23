# HRMS - Enterprise Human Resource & Communication Management Platform

[![Architecture](https://img.shields.io/badge/Architecture-Modular%20Monolith-blue.svg)](#architecture)
[![Database](https://img.shields.io/badge/Database-MySQL-4479A1.svg)](#database)
[![RealTime](https://img.shields.io/badge/RealTime-Socket.IO-010101.svg)](#teams-chat--communication-module)
[![Node](https://img.shields.io/badge/Backend-Node.js%20%7C%20TypeScript-green.svg)](#technology-stack)
[![Web](https://img.shields.io/badge/Web-React%2019%20%7C%20Vite-61dafb.svg)](#technology-stack)

---

## 📌 Executive Summary
**HRMS** is a production-ready enterprise Human Resource Management & Internal Communication Platform. Built with a **Modular Monolith** backend, a high-performance **React 19** web dashboard, a real-time **Socket.IO** communication engine, and **MySQL** single source of truth.

### Organization & Communication Architecture
```
Company (Single-Company Identity)
  ├── Master Departments (IT, HR, Finance, Sales, Operations)
  ├── Teams & Designations
  ├── Employees (Auto ID: AMPL-00001, AMPL-00002...)
  ├── Internal Teams Chat (1-on-1, Groups, Department Channels, Announcements)
  └── eSSL / ZKTeco Biometric ADMS Hardware Integration
```

---

## 🚀 Key Features & Capabilities

### 💬 1. Teams-Style Internal Chat & Communication System
- **Real-Time Messaging**: Built on Socket.IO for instant 1-on-1 private messaging and multi-user group chats.
- **Department & Broadcast Channels**: Pre-seeded company-wide broadcast channel (*HR Announcements*) and department channels (*IT*, *HR*, *Finance*, *Sales*, *Operations*).
- **Rich Image & Media Handling**: Dedicated image picker, clipboard image paste (`Ctrl + V`), drag-and-drop file upload, and full-screen image lightbox viewer.
- **Message Controls & Badges**: Unread message badges in sidebar, typing indicators, message reply chains, message deletion, and strict participant IDOR authorization guards.

### 🆔 2. Automated Sequential Employee ID Generation
- **Format**: Auto-calculates sequential IDs in `AMPL-00001` format (`AMPL-00001`, `AMPL-00002`, `AMPL-00003`...).
- **Flexibility**: Pre-fills automatically when creating a new employee while remaining 100% editable for manual override. Includes an **Auto-Generate** refresh action.

### ⚙️ 3. Database-Driven Single-Company Identity & Settings
- Persistent MySQL configuration (`system_settings` table) for Company Name, Company Code, GSTIN, Corporate Email, Headquarters Address, Attendance Grace Rules, and Leave Allocations.
- Saved settings persist permanently across all user sessions and server restarts.

### 📠 4. eSSL / ZKTeco Biometric Hardware Integration
- Native ZKTeco ADMS push receiver listening at `/iclock/cdata`, `/iclock/getrequest` and `/iclock/devicecmd`.
- Real-time punches → automatic clock-in/out, late minutes and overtime; device User ID ↔ employee mapping; remote "pull logs" command.
- **Setup guide for eSSL AiFace Mars and similar terminals: [docs/essl-aiface-mars-setup.md](docs/essl-aiface-mars-setup.md)**

### 📧 5. Bulk Salary Slips & Mail Automation
- Automated bulk PDF/Excel salary slip generation and direct email dispatch.

---

## 🏗️ Repository Architecture & Workspaces

Structured as a scalable monorepo using `npm workspaces`:

```
HRMS/
├── backend/                  # Node.js + TypeScript Modular Monolith API
│   ├── src/
│   │   ├── config/           # Validated environment configuration (Zod)
│   │   ├── database/         # MySQL Connection Pool & Seeding Engine
│   │   ├── middleware/       # JWT Auth, RBAC, error handling, security
│   │   ├── modules/          # Isolated Business Modules
│   │   │   ├── auth/         # JWT Authentication & Password Policy
│   │   │   ├── chat/         # Teams Chat REST Controller & Socket.IO Engine
│   │   │   ├── employees/    # Database Employee CRUD & Next ID Generator
│   │   │   ├── settings/     # MySQL System Settings API
│   │   │   ├── leave/        # Leave Balances & Approval Workflows
│   │   │   ├── attendance/   # Punch Logs & Biometric ADMS Handler
│   │   │   └── zkteco/       # Hardware ADMS push endpoints
│   │   ├── routes/           # Versioned router (/api/v1) & health probes
│   │   ├── app.ts            # Express application configuration
│   │   └── server.ts         # HTTP Server & Socket.IO bootstrap
├── web/                      # React 19 + Vite + TypeScript Web Dashboard
│   ├── src/
│   │   ├── components/       # UI Components, Chat Modals, Lightbox
│   │   ├── pages/            # ChatPage, EmployeesPage, SettingsPage, LeavePage...
│   │   ├── services/         # REST API & Socket.IO Client Managers
│   │   └── styles/           # Modern Glassmorphic Dark Design System
├── packages/
│   └── shared/               # Shared TypeScript Contracts (@hrms/shared)
└── package.json              # Monorepo root configuration
```

---

## 🛠️ Technology Stack

| Area | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend Framework** | Node.js (v24) + Express | Modular routing, high performance, low memory footprint. |
| **Real-Time Engine** | Socket.IO (v4.8) | Bidirectional web socket transport for Teams chat & unread badges. |
| **Database** | MySQL | Enterprise relational integrity, ACID transactions, indexed search. |
| **Web Dashboard** | React 19 + Vite | Glassmorphism dark UI design system, HMR DX. |
| **API Architecture** | REST (`/api/v1`) | Standardized JSON payload envelope across all endpoints. |

---

## ⚡ Quick Start & Setup Guide

### 1. Install Dependencies
```bash
npm run setup
```

### 2. Build Workspaces
```bash
npm run build
```

### 3. Launch Development Platform
```bash
npm run dev
```

- **Web Dashboard Portal**: [http://localhost:8080](http://localhost:8080)
- **Backend API & Socket Server**: [http://localhost:4000](http://localhost:4000)
- **API Health Check**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

## 📄 License
Enterprise Proprietary Software - All Rights Reserved.
