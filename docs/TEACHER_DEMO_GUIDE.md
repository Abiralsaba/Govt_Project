# NationX local teacher demonstration guide

Verified on 2026-08-29. This guide is for a local course presentation only.
NationX is not approved for public deployment.

## Exact startup

1. Open XAMPP and start **MySQL**. Apache is not required because Express serves
   the application on port 3000.
2. In Terminal:

```bash
cd "/Users/abiralsaba/Documents/web development/central govt"

# First run on a computer only
npm install
npm run client:install

# Build and serve all 29 presentation pages through React + Express
npm run client:build
npm run start:react
```

3. Wait for `Server running on port 3000`, then open
   `http://localhost:3000/index.html`.

### Exact shutdown

1. Return to the Terminal running NationX and press `Ctrl+C` once.
2. Wait for the shell prompt to return. Confirm that
   `http://localhost:3000/index.html` no longer loads.
3. Stop XAMPP MySQL from its manager only when no other local application needs
   it. Do not force-kill MySQL or alter XAMPP/MariaDB system databases.

`npm run start:react` uses the existing `.env` only on the server. Database
credentials are never sent to Vite/React. Do not run a database reset before a
presentation unless an isolated test reset is intentionally required.

Rollback remains available: `npm start` serves the retained legacy frontend.
It is not the command for the React teacher demonstration.

## Startup troubleshooting

| Symptom | Check | Safe resolution |
|---|---|---|
| `ECONNREFUSED`, database error, or login fails immediately | Confirm XAMPP **MySQL** is green/running. Optionally inspect `lsof -nP -iTCP:3306 -sTCP:LISTEN`. | Start MySQL in XAMPP, then restart `npm run start:react`. Do not reinstall or reset a database during presentation troubleshooting. |
| `EADDRINUSE: address already in use :::3000` | Run `lsof -nP -iTCP:3000 -sTCP:LISTEN`. | Return to the Terminal already running NationX and press `Ctrl+C`. Stop only the known NationX process, then start again. |
| React page is blank or an old page appears | Confirm the command was `npm run start:react`, not `npm start`; confirm the build succeeded. | Stop Express, run `npm run client:build`, restart with `npm run start:react`, then hard-refresh the browser. |
| `client/dist` missing | The production React bundle has not been built. | Run `npm run client:build`; do not manually copy files into `public/`. |
| Module/package not found on a newly prepared computer | Check that both installation commands completed without interruption. | Run `npm install` and `npm run client:install`, then rebuild. Do not upgrade package versions before the presentation. |
| Synthetic login is rejected while MySQL is running | Check spelling and use the accounts below. | Restart Express once. If still rejected, stop and run the read-only/focused diagnostics rather than resetting development data. |
| Port 3000 works but a service panel shows an error | Check XAMPP MySQL first, then the Express Terminal for the exact endpoint error. | Continue with another non-blocked demo section; do not invent a successful result or change schema during the presentation. |

## Architecture in one minute

The browser loads a Vite-built React single-page application from Express while
preserving every presentation `.html` URL. React owns the UI and calls the
existing same-origin `/api/*` contracts; it does not embed legacy pages or run
legacy scripts. Express applies citizen/admin JWT middleware and uses the
existing `mysql2/promise` pool to reach MySQL. Business data, triggers, views,
and the authoritative land-transfer trigger remain in the existing schema.
Uploads continue through Multer into the retained upload directories. Legacy
HTML/JS/CSS stays available through default `npm start` as a rollback path.

```text
Browser → React/Vite build → Express routes + JWT authorization → MySQL
                                     ↘ Multer uploads
```

## Synthetic demo accounts

All accounts and geography below are synthetic local demo data.

| Role | Email | Password |
|---|---|---|
| Citizen Alice | `alice.demo@nationx.test` | `NationX-Demo-2026!` |
| Citizen Bob | `bob.demo@nationx.test` | `NationX-Demo-2026!` |
| Approved administrator | `admin.demo@nationx.test` | `NationX-Admin-2026!` |

Use Alice for the main citizen journey and Bob to explain/test ownership
isolation. Select values labelled `DEMO DATA` when a geographic field is needed.
Never reuse these passwords for public or real accounts.

## Rehearsable walkthrough

### 1. Architecture and login — 2 minutes

1. Sign in as Citizen Alice.
2. Explain that React owns the page and uses the unchanged Express REST APIs,
   JWT behavior, and MySQL schema.
3. Refresh `/dashboard.html` to demonstrate direct `.html` routing.
4. Show dashboard statistics, service requests, and notifications from the real
   development database.

Expected: the URL ends in `/dashboard.html`, refresh stays on the React
dashboard, the user is Synthetic Citizen Alice, and dashboard data loads without
an unauthorized or server-error banner.

### 2. Complete citizen write workflow — 2 minutes

1. Open **Todo**.
2. Create a task named `Teacher presentation follow-up` with a due date.
3. Open it, change it to **Done**, and show it in the React calendar grid.
4. Delete it, demonstrating a complete authenticated create/update/delete
   workflow.

Expected: the new task appears in To Do, changes to Done exactly once, appears
on its due-date calendar cell, and disappears after deletion and refresh.

### 3. Community and shop ownership — 2 minutes

1. Open **Community** and show groups/posts. User text is rendered as text, not
   injected HTML; counter updates have one database trigger authority.
2. Open **Shop**, add an item, and show the server-calculated cart total.
3. If placing an order, choose **Cash on Delivery**. This creates a real
   synthetic database order. Do not call it an online payment.

Expected: Community text is safely rendered, like/comment totals do not double,
Alice's cart total is calculated from stored item prices, and Bob cannot see or
modify Alice's cart. A COD order reports `PENDING`, never gateway-paid.

### 4. Citizen services and uploads — 3 minutes

1. Open NID and show the profile/application sections. A synthetic PNG/PDF can
   be uploaded; photo/signature paths now persist in the existing columns.
2. Open Passport and explain that an application NID must match the logged-in
   citizen. Show application/status/document areas.
3. Open Health or Water and show owner-scoped records. A Water complaint is a
   good real write demonstration using `DEMO DATA` geography.
4. Open Land and explain the verified mutation model: the admin route approves,
   while the authoritative trigger transfers ownership atomically and prevents
   double or excessive transfers.

Expected: NID uploads return retained `/uploads/nid/...` paths, a Passport NID
that differs from the logged-in citizen is rejected, citizen lists contain only
the owner's records, and real service submissions begin in their documented
Pending/Submitted state.

### 5. Payment demonstration — 1 minute

1. Open Passport, Water, Land, Apply, or Shop payment presentation area.
2. Click **Simulate presentation payment** only if the authorized sandbox is
   unavailable.
3. Point to the visible label:
   `SIMULATED — NOT GATEWAY VERIFIED`.
4. Explain that it is React state only: it performs no API call, writes no
   payment row, and changes no application/bill status.

Expected: a `NATIONX-DEMO-...` reference appears together with “No gateway
verification or server-side payment update occurred.” Refreshing removes the
simulation result, and the real server-owned payment status remains unchanged.

### 6. Administrator journey — 3 minutes

1. Log out and select **Admin**, then sign in with the synthetic administrator.
2. In **Reports**, open several domains and demonstrate real database analytics,
   filtering, status columns, and pagination.
3. Open **Admin Water** and show connections, bills, quality, complaints, and
   projects. Bill administration is clearly not gateway verification.
4. Open Admin NID/Passport/Health and show selected-record review.
5. Explain that citizen tokens receive HTTP 403 from admin Water/community/
   agriculture APIs and that selected-id regression tests prevent cross-record
   updates in the verified workflows.

Expected: Reports loads each chosen domain without an error banner; search and
pagination narrow only displayed records; Admin Water loads real queues; an
ordinary citizen token receives HTTP 403; updating a selected synthetic record
does not alter a neighboring record.

## Tests actually passed

```bash
npm run client:test   # 94/94 passed
npm test              # 66/66 passed against central_govt_db_test
npm run client:build  # passed
npm run test:browser  # 3/3 passed in Chromium
```

The browser suite performed real citizen/admin authentication, direct navigation
and refresh, all 29 React route checks, all Reports domain reads, a Todo write
lifecycle, payment-simulation labeling, and admin-denial verification. It
reported no final page exception or API 500/429 response.

## Implemented teacher-demo functionality

- All 29 intended presentation URLs are React-owned in `start:react` mode and
  retain direct navigation, refresh, query strings, and rollback files.
- Citizen/admin login, representative CRUD, owner isolation, multipart uploads,
  installed status meanings, domain reporting, and selected-record admin
  workflows use the real backend and local development/test databases.
- Payment fallback is isolated React state and is always labelled
  `SIMULATED — NOT GATEWAY VERIFIED`.
- The verified test totals and migration status are recorded in
  `REACT_MIGRATION_MATRIX.md`.

## Deferred production security and payment work

- Registration submission and Ethereal password-reset email delivery were not
  exercised in the final Chromium journey.
- Optional controls on every page were not all clicked; focused API/component
  regressions cover the listed service contracts.
- Real online-payment callback verification is not complete. Use the authorized
  sandbox if it works, otherwise use only the labeled non-writing simulation.
- Stored routines are deferred because this XAMPP MariaDB installation has
  incompatible `mysql.proc` metadata. Active demonstrated routes do not call
  them.
- Health/NID admin queue/transition limitations and unresolved NID
  `citizen_id` integrity are documented in the migration/database reports.
- Historical uploads, CORS, public identity endpoints, localStorage tokens, and
  other items in `SECURITY_TRACKER.md` block public deployment.
- Root production dependencies have unresolved security advisories. No package
  upgrades are part of the frozen presentation checkpoint.

These deferred items do not change the local teacher-demo result, but they must
not be described as implemented, secure, gateway-verified, or production-ready.

## Readiness assessment

**Ready for the scoped local teacher demonstration.** The intended React pages,
real local backend/database journeys, synthetic accounts, and isolated payment
simulation are working and actually tested.

**Not ready for public deployment or real payments.** Production security and
payment hardening remain a separately documented backlog.
