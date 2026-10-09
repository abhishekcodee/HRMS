# HRMS Web Dashboard

The web application is a React 19 + TypeScript + Vite dashboard for HR, payroll,
attendance, leave, documents, reports, and tenant administration.

## Local development

From the repository root:

```bash
npm install
npm run dev:backend
npm run dev:web
```

- Web dashboard: <http://localhost:8080>
- Backend API: <http://localhost:4000>
- Vite proxies `/api` and `/uploads` to the backend (see `vite.config.ts`).
- Configure local values in `.env`; use `.env.example` as the safe template.

## Useful commands

```bash
npm run build --workspace=web
npm run test --workspace=web
```

The web test command currently runs Vitest with `--passWithNoTests`. New behavior
should include a focused test or a repeatable browser smoke check before it is
considered complete.

## Product conventions

- The UI uses role-aware routes. The implemented role names are `ADMIN`,
  `EMPLOYER`, and `EMPLOYEE`; the active role is resolved by `AuthContext` and
  `RoleContext`.
- API requests use `/api/v1` and authenticated requests read the token from
  `localStorage`. User-facing pages should show explicit loading, empty, and
  error states rather than treating a failed request as an empty dataset.
- Attendance punch state `0` means **Check In**; other device states are shown as
  **Check Out**.
- Dates displayed to users should use the browser's local timezone. Avoid fixed
  demo years in operational pages; derive reporting periods from the selected
  period or the current date.
- Use shared components from `src/components/ui` so keyboard focus, labels,
  alerts, and responsive behavior remain consistent.

## Accessibility and responsive QA

Before releasing a web change, verify:

1. The main workflow works with keyboard-only navigation and has visible focus.
2. Dialogs and drawers announce their title, close with Escape, and return focus.
3. Loading, empty, validation, and API failure states are distinguishable.
4. Tables remain usable at 320px, 375px, 768px, and desktop widths.
5. Both dark and light themes preserve readable contrast.

## Source of truth

The backend is MySQL-backed and multi-tenant aware. When documentation conflicts
with code, verify the route and service implementation before changing a user
flow. Keep `docs/ui-design-system.md` aligned with the actual React + Vite
implementation and the tokens in `src/styles/index.css`.
