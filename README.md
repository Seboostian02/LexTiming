# LexTiming

Employee time tracking application built with Next.js 15, TypeScript, Prisma, and PostgreSQL.

## Features

### Core
- **Clock In/Out** - real-time timer with pause/resume, automatic break tracking
- **Calendar View** - monthly overview with day details, status badges, anomaly detection
- **Leave Management** - mark/remove CO (vacation), CM (medical), HOLIDAY per day
- **Alert System** - dashboard banner showing unresolved anomalies for the employee

### Anomaly Detection (6 types)
- `MISSING_END` (critical) - clock-in without clock-out
- `MISSING_DAY` (critical) - workday with no timesheet entry
- `EARLY_START` (warning) - clocked in before schedule allows
- `LATE_END` (warning) - clocked out after schedule allows
- `UNDER_HOURS` (warning) - total hours below schedule minimum
- `OVER_HOURS` (warning) - total hours above schedule maximum

### Schedule Types (3)
- **FIX** - fixed hours (e.g., 09:00-17:00) with configurable tolerance
- **FEREASTRA** - time window (e.g., start 08:00-10:00, end 16:00-18:00)
- **FLEX** - minimum hours per day (e.g., 6h minimum, flexible start/end)

### Workflow
- **Approval Workflow** - submit -> manager review -> approve/reject with comments
- **Month Close** - admin locks month with pre-validation blockers (unsubmitted days, pending approvals, critical anomalies)
- **Reports** - monthly summary per employee with CSV export

### Administration
- **Employee Management** - CRUD with soft-delete, role assignment, manager/schedule linking
- **Schedule Management** - CRUD for all 3 schedule types with validation
- **Audit Log** - full audit trail with entity/action/actor/date filters, expandable before/after JSON, server-side pagination
- **Role-Based Access** - Employee, Manager, Admin with granular route and UI permissions

### Other
- **Team Overview** - manager view of team members with real-time status, filters, employee calendar dialog
- **Profile Page** - view current user details
- **Registration/Login** - auth flow with password visibility toggle, form validation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript (strict) |
| Database | PostgreSQL 16 (Docker) |
| ORM | Prisma v6 |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI primitives) |
| State | TanStack Query v5 |
| Tables | TanStack Table v8 |
| Forms | React Hook Form + Zod v4 validation |
| Auth | JWT (HTTP-only cookies, bcryptjs, jose) |
| Icons | Lucide React |
| Dates | date-fns |
| Toasts | Sonner |
| Testing | Vitest |

## Architecture

```
Browser
  │
  ├── Pages (React Server Components by default)
  │     └── Client Components ("use client") ─── Context Providers
  │           ├── TanStack Query hooks ──────────── fetch(/api/...)
  │           ├── React Hook Form + Zod schemas
  │           └── shadcn/ui components
  │
  ├── API Routes (src/app/api/**/route.ts)
  │     └── requireAuth() / requireRole() ───── JWT verification
  │           └── Service functions ─────────── Business logic
  │                 └── Prisma Client ──────── PostgreSQL
  │                       └── AuditLog ─────── Every mutation logged
  │
  └── Middleware (src/middleware.ts)
        └── Route protection (redirect unauthenticated to /login)
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Service layer pattern | No Prisma calls in route handlers; all business logic in `src/services/` for testability and reuse |
| JWT in HTTP-only cookies | Prevents XSS token theft vs localStorage; cookie set/cleared server-side |
| Zod schemas shared client+server | Single source of truth for validation; same schema validates form input and API payload |
| TanStack Query for server state | Automatic cache invalidation, background refetching, optimistic updates; no manual state sync |
| Server-side pagination (audit) | Large dataset (~1600+ records); skip/take in Prisma, page/pageSize in API params |
| Client-side pagination (employees) | Small dataset (<50 records); TanStack Table `getPaginationRowModel()` |
| Prisma singleton | Prevents connection pool exhaustion in Next.js hot reload (`globalThis` pattern) |
| Conditional seeding | `npm run dev` seeds only if DB is empty; `--force` flag wipes and re-seeds |

## Security

- **Authentication**: JWT tokens stored in HTTP-only, same-site cookies (not localStorage)
- **Password hashing**: bcryptjs with salt rounds
- **Input validation**: Zod schemas on every API endpoint (rejects malformed payloads before business logic)
- **Role-based access**: `requireRole("ADMIN")` / `requireRole("MANAGER")` guards on protected endpoints
- **Ownership checks**: Employees can only access their own timesheet data; managers only their team's
- **No leaked internals**: API responses exclude passwordHash, internal IDs where not needed
- **Audit trail**: Every create/update/delete/approve/reject operation logged with actor, timestamp, before/after state

## Database Schema

5 models, 2 migrations:

```
Employee ──────< TimesheetDay ──────< Approval
    │                                     │
    └──── managerId (self-relation)       └──── approverId (FK Employee)
    │
    └──── scheduleId ────> Schedule
    │
    └────< AuditLog (actorId)
```

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **Employee** | email (unique), role (EMPLOYEE/MANAGER/ADMIN), status (ACTIVE/INACTIVE), managerId (self-ref), scheduleId | Soft-delete via status |
| **Schedule** | type (FIX/FEREASTRA/FLEX), startTime, endTime, startWindowEnd, endWindowStart, minHoursPerDay, breakMinutes | Window fields only for FEREASTRA |
| **TimesheetDay** | employeeId+date (unique), startTime, endTime, breaks (JSON), totalMinutes, status (DRAFT/SUBMITTED/APPROVED/REJECTED/LOCKED), dayType (WORK/CO/CM/HOLIDAY) | Breaks stored as JSON array |
| **Approval** | timesheetDayId, approverId, decision (APPROVED/REJECTED), comment | One approval per submission |
| **AuditLog** | entity, entityId, action (11 types), before/after (JSON), actorId, timestamp | Immutable append-only log |

## Prerequisites

- **Node.js** 18+
- **Docker Desktop** (for PostgreSQL)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd LexTiming
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# 3. Start everything (Docker + migrations + seed + dev server)
npm run dev
```

The app will be available at **http://localhost:3000**.

### Startup Scripts

```powershell
# Windows (PowerShell) - full mode with lint + tests + fresh seed
.\start.ps1

# Windows (PowerShell) - quick mode, skip lint/tests/seed
.\start.ps1 -quick
```

```bash
# Unix/Linux/macOS
./start.sh
./start.sh --quick
```

These scripts check prerequisites (Docker, Node.js), start PostgreSQL, run migrations, seed data, launch Prisma Studio (http://localhost:5555), and start the dev server.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for signing JWT tokens | `my-secret-key-change-in-production` |
| `POSTGRES_DB` | PostgreSQL database name | `lextiming` |
| `POSTGRES_USER` | PostgreSQL user | `lextiming` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `lextiming` |
| `POSTGRES_PORT` | PostgreSQL port (host) | `5432` |
| `DATABASE_URL` | Prisma connection string | `postgresql://lextiming:lextiming@localhost:5432/lextiming` |
| `NEXT_PUBLIC_APP_URL` | Public app URL (client-accessible) | `http://localhost:3000` |

## Demo Accounts

| Role | Email | Password | Schedule |
|------|-------|----------|----------|
| Admin | admin@lextiming.com | admin123 | Fix 9-17 |
| Manager | maria@lextiming.com | manager123 | Fix 9-17 |
| Manager | andrei@lextiming.com | manager123 | Fereastra 8-10 > 16-18 |
| Employee | ion@lextiming.com | employee123 | Fix 9-17 |
| Employee | elena@lextiming.com | employee123 | Fix 9-17 |
| Employee | george@lextiming.com | employee123 | Fix 9-17 |
| Employee | ana@lextiming.com | employee123 | Fereastra 8-10 > 16-18 |
| Employee | mihai@lextiming.com | employee123 | Fereastra 8-10 > 16-18 |
| Employee | diana@lextiming.com | employee123 | Flex (min 6h) |

Seed data includes 2 months of timesheet entries (Jan-Feb 2026), leave days, approvals, rejections, and ~1600 audit log records.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start PostgreSQL + migrate + seed + Next.js dev server |
| `npm run dev:fresh` | Same as dev, but force re-seeds (wipes existing data) |
| `npm run dev:quick` | Start only Next.js (skip Docker/seed) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:studio` | Open Prisma Studio (database UI at localhost:5555) |
| `npm run seed` | Run database seed |

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Public routes (no layout)
│   │   ├── login/            # Login page
│   │   └── register/         # Registration page
│   ├── (app)/                # Protected routes (sidebar + topbar layout)
│   │   ├── dashboard/        # Clock in/out with live timer
│   │   ├── calendar/         # Monthly calendar view
│   │   ├── team/             # Team status overview (manager)
│   │   ├── approvals/        # Approval workflow (manager)
│   │   ├── profile/          # User profile
│   │   └── admin/
│   │       ├── employees/    # Employee CRUD
│   │       ├── schedules/    # Schedule CRUD
│   │       ├── reports/      # Monthly reports + CSV
│   │       ├── month-close/  # Lock month
│   │       └── audit/        # Audit log viewer
│   └── api/                  # 23 REST API endpoints
│       ├── auth/             # login, register, logout, me
│       ├── timesheet/        # clock, calendar, today, alerts, leave, [id], [id]/submit
│       ├── approvals/        # list, [id] (approve/reject)
│       ├── employees/        # CRUD, managers, team
│       ├── schedules/        # CRUD
│       ├── admin/            # audit, report, close-month
│       └── profile/          # current user
├── services/                 # Business logic layer (7 services)
│   ├── auth.service.ts       # Login, register, logout, getCurrentUser
│   ├── timesheet.service.ts  # Clock ops, calendar, leave, submit, alerts
│   ├── approval.service.ts   # Pending list, process approval ($transaction)
│   ├── employee.service.ts   # CRUD + audit logging
│   ├── schedule.service.ts   # CRUD + audit logging
│   ├── report.service.ts     # Monthly report, month close + validation
│   └── audit.service.ts      # Create/query audit logs (paginated)
├── hooks/                    # TanStack Query hooks (8 files)
├── schemas/                  # Zod validation schemas (5 files, shared client+server)
├── context/                  # React Context providers (3 files)
│   ├── auth-context.tsx      # Auth state, user payload, login/logout
│   ├── query-provider.tsx    # TanStack Query client configuration
│   └── sidebar-context.tsx   # Sidebar collapse state
├── components/               # React components (41 total)
│   ├── ui/                   # shadcn/ui primitives (15 components)
│   ├── layout/               # Sidebar, Topbar, MobileNav, PageTransition
│   ├── admin/                # AuditTable, EmployeeTable/Form, ScheduleTable/Form, ReportTable, MonthClosePanel
│   ├── calendar/             # MonthCalendar, DayDetailDialog
│   ├── dashboard/            # ClockWidget, DaySummary, AlertBanner
│   ├── approvals/            # ApprovalList, RejectDialog
│   └── team/                 # TeamTable, TeamOverview, EmployeeCalendarDialog, MarkLeaveDialog
├── lib/                      # Utilities
│   ├── auth.ts               # JWT sign/verify, requireAuth, requireRole
│   ├── prisma.ts             # Prisma singleton (globalThis pattern)
│   ├── constants.ts          # ROLES, DAY_STATUS, CLOCK_STATES, SCHEDULE_TYPES, ANOMALY_TYPES, AUDIT_ACTIONS, AUDIT_ENTITIES
│   ├── timesheet-utils.ts    # Pure functions for anomaly detection, clock state, break calc
│   ├── api-response.ts       # successResponse(), errorResponse() helpers
│   └── utils.ts              # cn() for className merging
├── types/                    # TypeScript type definitions
└── __tests__/                # Unit tests (47+ tests)
prisma/
├── schema.prisma             # 5 models, enums, relations
├── migrations/               # 2 PostgreSQL migrations
└── seed.ts                   # 9 employees, 3 schedules, 2 months data, ~1600 audit records
```

## Infrastructure

- **PostgreSQL 16** runs in Docker via `docker-compose.yml`
- **Named volume** `pgdata` persists data between restarts
- **Conditional seeding**: `npm run dev` seeds only if database is empty; use `npm run dev:fresh` to force re-seed
- **Dockerfile**: Multi-stage build (deps -> build -> runtime) for production deployment
- **Two modes**:
  - **Dev**: PostgreSQL in Docker, Next.js locally (`npm run dev`)
  - **Full Docker**: `docker compose --profile full up --build` (both DB and app containerized)
- **Theme**: Navy (#2c3e50) sidebar + Gold (#f9e531) accents

## Testing

```bash
npm run test         # Run all tests (47+)
npm run test:watch   # Watch mode
```

Tests cover business logic in `src/__tests__/`:
- **auth.test.ts** - password hashing (bcrypt), JWT signing/verification (jose)
- **timesheet-utils.test.ts** - break parsing, elapsed time calculation, anomaly detection (all 6 types), clock state derivation, schedule type handling
