# Homestay Cloud — Homestay Management System (Demo)

A production-quality, SaaS-style homestay management system that deploys to **Vercel with zero external
infrastructure**. All data lives in seeded, deterministic, in-memory storage — no database, cache, queue or
third-party backend is required.

> **DEMO MODE** — The app runs on seeded in-memory data. Changes may reset at any time (cold starts, scaling,
> redeploys, or a user pressing *Reset demo data*). Never enter real guest or payment data.

---

## Contents

- [Features](#features)
- [Demo credentials](#demo-credentials)
- [Architecture overview](#architecture-overview)
- [Folder structure](#folder-structure)
- [Module overview](#module-overview)
- [Local setup](#local-setup)
- [Build & test](#build--test)
- [Deployment guide (Vercel)](#deployment-guide-vercel)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Demo mode limitations](#demo-mode-limitations)

---

## Features

| Area | Highlights |
| --- | --- |
| Dashboard | Live KPIs (revenue, occupancy, active reservations, today's check-ins/outs, utilisation, outstanding balance), revenue/occupancy/reservation trends, room status, arrivals, departures, upcoming stays, property performance, recent activity. Filters: Today / 7 Days / 30 Days / Custom range + property. |
| Reservations | Create, edit, confirm, cancel, check-in, check-out, no-show. Live availability while booking. Overlap prevention with **exclusive checkout** (`check_in <= date < check_out`). |
| Rooms | Status (Available, Occupied, Reserved, Cleaning, Maintenance) **derived dynamically** from reservations, housekeeping and maintenance. Availability search. |
| Payments | Append-only ledger of payments/refunds (Cash, Card, Bank Transfer, UPI). Status (Unpaid, Partially Paid, Paid, Refunded) is **derived, never editable**. Integer minor units — no floating point. Card numbers are rejected (Luhn check); only last-4 is stored. |
| Housekeeping | Create, assign, start, complete, reopen; priorities; overdue tracking; auto checkout-clean task. |
| Maintenance | Report, assign, start, resolve; priorities and categories; *blocking* requests remove rooms from sale. |
| Reports | Occupancy (ADR, RevPAR), revenue (by method/property, outstanding), reservations (status/source, lead time, LOS, cancellation rate), operations. CSV export. |
| Platform | Mock auth with role-based access (Owner / Manager / Staff), notifications & announcements, settings, user management, demo reset/reload, toasts, skeleton loaders, empty states, error boundaries, confirmation dialogs, mobile-first layout. |

## Demo credentials

All accounts use the password **`Password123!`**

| Role | Email | Access |
| --- | --- | --- |
| Owner | `owner@homestay.demo` | Everything, incl. user management, settings and property deletion |
| Manager | `manager@homestay.demo` | Operations, payments, reports, demo reset; read-only users & settings |
| Staff | `staff@homestay.demo` | Front desk (reservations, guests, check-in/out), housekeeping & maintenance work |

Two extra staff accounts (`meera.iyer@homestay.demo`, `kabir.singh@homestay.demo`) exist for task assignment and
share the same password.

## Architecture overview

```
 React UI (presentation only)
   │  dispatch(action)
   ▼
 Redux Toolkit slices ──► Redux-Saga (all async workflows)
                            │  axios API layer (/api/v1, correlation IDs, bearer token)
                            ▼
 Express app (Vercel Serverless Function: api/index.js)
   middleware: correlation-id → helmet → CORS → rate limit → JSON → sanitize → auth/RBAC
   ▼
 Controllers (HTTP in/out only)
   ▼
 Services (business rules, Zod validation orchestration, workflows)
   ▼
 Repositories (data access only: getAll, getById, create, update, delete + domain finders)
   ▼
 Storage Provider (MemoryStorageProvider — the only implementation)
```

Key design decisions:

- **Clean boundaries.** Controllers never touch storage; services depend on repositories only; repositories depend
  on a storage-provider *contract* (`list, findById, insert, update, remove, count, getDocument, setDocument,
  replaceAll, clear`). A PostgreSQL/Supabase/MongoDB/Redis provider can be added by implementing the contract and
  passing it to `createContainer({ storage })` — no service changes.
- **Shared domain package.** `@homestay/shared` holds constants, the RBAC matrix, money/date utilities and **Zod
  schemas used by both the API and the React forms**, so validation rules are identical on both sides.
- **Decimal-safe money.** Every amount is an integer number of minor units (paise/cents). Decimal input such as
  `"1,500.50"` is parsed with string operations; averages use integer half-up division.
- **Derived state.** Room status, payment status and dashboard metrics are calculated on every request from live
  data — never stored or hard-coded.
- **Frontend data flow.** Components dispatch actions and render selectors. Sagas perform every API call, show
  toasts, and broadcast `entitiesChanged` so dependent modules (e.g. rooms after a check-out) refresh
  automatically. A generic CRUD slice/saga factory keeps all modules consistent.

### Serverless-aware design

The API is written assuming stateless, horizontally-scaled, short-lived instances:

| Concern | How it is handled |
| --- | --- |
| Memory loss / cold starts | `getContainer()` lazily builds and seeds the store **once per instance**. The seed is deterministic and anchored to the business date, so every instance starts from identical data. |
| Multiple instances | Auth tokens are **stateless HMAC-signed tokens**, valid on any instance. Clients poll `/demo/status`; if they are served by a new instance whose seed differs, the UI shows a notice and refreshes all data. |
| No background jobs | Nothing is scheduled. Derived values (statuses, KPIs, reports) are computed on request. |
| No persistent files | No file system writes; CSV export happens in the browser. |
| Rate limiting | Fixed-window limiter per instance (best effort without shared state). |
| Time zones | "Today" is resolved in the configured business time zone (`DEMO_TIMEZONE` / settings), not server UTC. |

## Folder structure

```
.
├── api/
│   └── index.js                 # Vercel Serverless Function entry (exports the Express app)
├── apps/
│   ├── api/                     # Express API (@homestay/api)
│   │   ├── src/
│   │   │   ├── app.js           # createApp(): middleware + /api/v1 router
│   │   │   ├── container.js     # composition root: storage → repositories → services
│   │   │   ├── server.js        # local dev server (port 4000)
│   │   │   ├── config/env.js    # Zod environment validation
│   │   │   ├── core/            # errors, response envelope, validation, query engine, security, clock
│   │   │   ├── middleware/      # correlation id, sanitize, rate limit, auth/RBAC, error handler
│   │   │   ├── storage/         # MemoryStorageProvider + provider contract
│   │   │   ├── repositories/    # BaseRepository + domain repositories
│   │   │   ├── services/        # business logic per module, analytics, payment math, demo seeding
│   │   │   ├── controllers/     # thin HTTP controllers
│   │   │   └── routes/v1.js     # route table with permissions
│   │   └── test/                # Vitest + Supertest suites
│   └── web/                     # React 19 + Vite SPA (@homestay/web)
│       └── src/
│           ├── api/             # axios client + endpoint modules
│           ├── app/             # store, root saga, sync actions
│           ├── components/      # design system (ui/), layout, charts, shared dialogs
│           ├── features/<module>/  # slice, saga, pages, forms per module
│           ├── hooks/ lib/      # permissions, money, mutation hooks, formatting, CSV, factories
│           └── test/            # Vitest + React Testing Library suites
├── packages/
│   └── shared/                  # @homestay/shared: constants, RBAC, money, dates, Zod schemas
├── data/
│   └── seed-data/               # @homestay/seed-data: deterministic demo dataset generator
├── docs/                        # architecture and API notes
├── vercel.json                  # build, output, function and rewrite configuration
└── .env.example
```

## Module overview

| Module | API | Service rules | Frontend |
| --- | --- | --- | --- |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | scrypt password hashes, signed expiring tokens, inactive users blocked | Login page, session persistence (localStorage), protected routes, role-aware nav |
| Dashboard | `GET /dashboard` | KPIs + daily series from live data | KPI cards, Recharts trends, lists |
| Properties | CRUD `/properties` | unique code; delete only when empty | Card grid, form, confirm delete |
| Rooms | CRUD `/rooms`, `GET /rooms/availability` | unique number per property; derived status; protected delete | Table, filters, availability search → book |
| Guests | CRUD `/guests` | unique email; only last 4 ID chars stored; protected delete | Table, VIP filter, detail with stay history |
| Reservations | CRUD + `confirm/cancel/check-in/check-out/no-show` | overlap prevention, capacity, maintenance block, past-date guard, status machine, re-pricing | List, filters, live-availability form, detail page with actions & timeline |
| Payments | `GET/POST /payments`, `POST /payments/refunds`, `GET /payments/summary/:id`, `PATCH /payments/:id` | no overpayment, refunds ≤ net paid, no payments on closed bookings, derived status | Ledger with totals, payment/refund forms |
| Housekeeping | CRUD + `assign/start/complete/reopen` | active assignees only; completed tasks immutable | Status tabs, assign/complete dialogs |
| Maintenance | CRUD + `assign/start/resolve` | assign before work; resolution notes required; blocking rooms | Status tabs, blocking badges |
| Reports | `GET /reports/{occupancy,revenue,reservations,operations}` | ADR, RevPAR, outstanding, LOS, lead time | Tabs, charts, CSV export |
| Notifications | list, read, read-all, dismiss, broadcast | per-user read/dismiss; role audiences | Inbox, unread badge, announcements |
| Settings | `GET/PATCH /settings` | owner-only updates; time zone validation | Settings form + demo environment panel |
| Users | CRUD `/users` | unique email; strong passwords; last-owner & self protection | Directory and editor |
| Demo | `GET /demo/status`, `POST /demo/reset`, `POST /demo/reload` | deterministic re-seed | Demo banner, seed status indicator, reset/reload |

## Local setup

Requirements: **Node.js 20.19+** (22 LTS recommended) and npm 10+.

```bash
npm install
npm run dev          # API on http://localhost:4000, web on http://localhost:5173 (proxying /api)
```

Open http://localhost:5173 and use one of the demo accounts. Optional: copy `.env.example` to `.env` and adjust.

Individual processes: `npm run dev:api`, `npm run dev:web`.

## Build & test

```bash
npm run build        # production build of the SPA → apps/web/dist
npm test             # shared + seed-data + API (Vitest/Supertest) + web (Vitest/RTL)
npm run test:api     # API only
npm run test:web     # web only
npm run preview      # serve the built SPA locally (expects the API on :4000 via `npm run dev:api`)
```

The test suites cover authentication, CRUD for properties/rooms/guests, the full reservation lifecycle
(create, update, cancel, check-in, check-out, no-show, double-booking prevention), payment calculation,
partial payments and refunds, housekeeping and maintenance workflows, repository CRUD behaviour, business rules,
API validation/success/error paths, rate limiting, sanitisation, the Vercel entry point, React components,
slices, sagas and route guards.

## Deployment guide (Vercel)

The repository deploys **without modification**:

```bash
npm install
npm run build
vercel deploy        # or: vercel deploy --prod
```

Or import the Git repository in the Vercel dashboard — the settings come from `vercel.json`:

| Setting | Value |
| --- | --- |
| Framework preset | Other (`framework: null`) |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `apps/web/dist` |
| Serverless function | `api/index.js` (Express app; all `/api/*` requests are rewritten to it) |
| SPA fallback | every non-API path is rewritten to `/index.html` |

Recommended (optional): set `AUTH_TOKEN_SECRET` to a random 32+ character string in *Project Settings →
Environment Variables*. Without it a built-in demo secret is used and a warning is logged.

## Environment variables

All variables are optional and validated at startup (invalid values fail fast).

| Variable | Default | Purpose |
| --- | --- | --- |
| `AUTH_TOKEN_SECRET` | built-in demo secret | HMAC secret for session tokens (≥ 32 chars) |
| `AUTH_TOKEN_TTL_SECONDS` | `43200` | Session lifetime |
| `CORS_ORIGIN` | `*` | Comma-separated allowed origins |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window |
| `RATE_LIMIT_MAX` | `300` | Requests per window per IP (per instance) |
| `AUTH_RATE_LIMIT_MAX` | `20` | Login attempts per window per IP |
| `DEMO_TIMEZONE` | `Asia/Kolkata` | Business time zone used before settings are changed |
| `VITE_API_BASE_URL` | `/api/v1` | Frontend API base URL (build time) |

## API reference

Base path: `/api/v1`. Every response uses the same envelope:

```json
{ "success": true, "data": {}, "meta": { "correlationId": "…", "pagination": { "page": 1, "pageSize": 10, "total": 42, "totalPages": 5 } }, "errors": [] }
```

Errors return `success: false` with structured items `{ code, message, field? }` and appropriate status codes
(`401`, `403`, `404`, `409` conflicts, `422` validation/business rules, `429` rate limited). Stack traces and
internal messages are never exposed. Send `X-Correlation-Id` to trace a request; it is echoed back.

List endpoints support `page`, `pageSize` (≤ 100), `search`, `sortBy`, `sortOrder` (`asc|desc`) plus
module filters (e.g. `/reservations?status=confirmed&propertyId=prop_001&from=2026-10-01&to=2026-10-31`).
See [docs/API.md](docs/API.md) for the full route list.

## Demo mode limitations

- **Ephemeral persistence.** Data is held in the memory of a single serverless instance. Changes are lost when the
  instance is recycled, and concurrent instances do not share changes. The UI makes this explicit with the demo
  banner, seed status indicator and new-instance notices.
- **Reset & reload.** *Reset demo data* restores the original seed; *Reload seed data* regenerates it anchored to
  today. Both affect only the instance that serves the request.
- **Mock authentication.** Accounts are seeded; there is no email verification, password reset or SSO.
- **No real payments.** Payments are ledger entries only — no gateway integration. Never enter card numbers
  (they are rejected) or banking credentials.
- **Best-effort rate limiting** is per instance.
- **Seed data is fictional.** Any resemblance to real people or properties is coincidental.
