# API routes (`/api/v1`)

Permissions refer to the RBAC matrix in `packages/shared/src/permissions.js`.

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/health` | public | Liveness |
| POST | `/auth/login` | public (rate limited) | `{ email, password }` → `{ token, expiresAt, user }` |
| GET | `/demo/status` | public | Seed version, anchor date, instance id, counts |
| POST | `/auth/logout` | authenticated | Stateless; client discards token |
| GET | `/auth/me` | authenticated | Current profile |
| POST | `/demo/reset` | `demo:manage` | Restore original seed |
| POST | `/demo/reload` | `demo:manage` | Regenerate seed anchored to today |
| GET | `/lookups` | authenticated | Dropdown data (properties, rooms, guests, staff, billable reservations, settings) |
| GET | `/dashboard` | `dashboard:view` | `range=today|7d|30d|custom&from&to&propertyId` |
| GET/POST | `/properties` | view / `properties:manage` | Filters: `status`, `city` |
| GET/PATCH/PUT/DELETE | `/properties/:id` | view / manage / `properties:delete` | Delete blocked while rooms exist |
| GET | `/rooms/availability` | `rooms:view` | `checkIn, checkOut, guests, propertyId, excludeReservationId` |
| GET/POST | `/rooms` | view / `rooms:manage` | Filters: `propertyId`, `type`, `status` (derived) |
| GET/PATCH/PUT/DELETE | `/rooms/:id` | view / manage / `rooms:delete` | |
| GET/POST | `/guests` | view / `guests:manage` | Filters: `vip`, `nationality` |
| GET/PATCH/PUT/DELETE | `/guests/:id` | view / manage / `guests:delete` | Detail includes stay history |
| GET/POST | `/reservations` | view / `reservations:manage` | Filters: `status`, `propertyId`, `roomId`, `guestId`, `source`, `from`, `to` |
| GET/PATCH/PUT | `/reservations/:id` | view / manage | Detail includes payments and `allowedActions` |
| POST | `/reservations/:id/confirm` | `reservations:manage` | pending → confirmed |
| POST | `/reservations/:id/cancel` | `reservations:manage` | `{ reason? }` pending/confirmed → cancelled |
| POST | `/reservations/:id/check-in` | `reservations:operate` | confirmed, arrival date reached |
| POST | `/reservations/:id/check-out` | `reservations:operate` | checked_in → checked_out (+ cleaning task) |
| POST | `/reservations/:id/no-show` | `reservations:manage` | on/after arrival date |
| GET/POST | `/payments` | `payments:view` / `payments:manage` | Ledger; `meta.totals`; filters `reservationId, method, type, propertyId, from, to` |
| POST | `/payments/refunds` | `payments:manage` | `{ reservationId, amount, method, reason }` |
| GET | `/payments/summary/:reservationId` | `payments:view` | Derived payment position |
| GET/PATCH | `/payments/:id` | view / manage | Only `reference` and `notes` are editable |
| GET/POST | `/housekeeping` | view / `housekeeping:manage` | Filters: `status, priority, propertyId, roomId, assignedTo` |
| GET/PATCH/PUT/DELETE | `/housekeeping/:id` | view / manage | |
| POST | `/housekeeping/:id/assign` | `housekeeping:manage` | `{ assigneeId }` |
| POST | `/housekeeping/:id/start` · `/complete` | `housekeeping:operate` | |
| POST | `/housekeeping/:id/reopen` | `housekeeping:manage` | |
| GET/POST | `/maintenance` | view / `maintenance:create` | Filters: `status, priority, category, propertyId, roomId` |
| GET/PATCH/PUT/DELETE | `/maintenance/:id` | view / `maintenance:manage` | |
| POST | `/maintenance/:id/assign` | `maintenance:manage` | open → assigned |
| POST | `/maintenance/:id/start` · `/resolve` | `maintenance:operate` | resolve requires `{ resolutionNotes }` |
| GET/POST | `/notifications` | view / `notifications:broadcast` | `meta.unreadCount`; filters `unreadOnly, severity` |
| PATCH | `/notifications/:id/read` | view | |
| POST | `/notifications/read-all` | view | |
| DELETE | `/notifications/:id` | view | Dismiss for the current user |
| GET/PATCH/PUT | `/settings` | view / `settings:manage` | |
| GET/POST | `/users` | `users:view` / `users:manage` | Filters: `role`, `active` |
| GET/PATCH/PUT/DELETE | `/users/:id` | view / manage | Last-owner and self protections |
| GET | `/reports/occupancy` · `/revenue` · `/reservations` · `/operations` | `reports:view` | Same range parameters as the dashboard |

Money fields ending in `Minor` are integers in minor units (e.g. paise). Money *inputs* (`amount`, `baseRate`,
`nightlyRate`) accept decimal strings such as `"1500.50"`.
