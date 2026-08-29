# React migration matrix

Last verified: 2026-08-29. The 29 original page rows below are the project-wide
source of truth. `Active` means Express serves the built React shell when
started with `npm run start:react`. Default `npm start` still serves the retained
legacy files for rollback.

`Passed` is based on actual Chromium execution plus applicable API/database
regressions—not HTTP 200, a build, or component tests alone. `Partial` identifies
controls intentionally not exercised or not locally verifiable. This assesses
the authorized teacher demonstration, not public-production security.

| Original URL | React implementation | React active through Express | Functional/browser verification | Remaining blocker or limitation |
|---|---|---|---|---|
| `/`, `/index.html` | Complete | Active | Passed: real citizen and admin login journeys | Synthetic local accounts only |
| `/register.html` | Complete | Active | Partial: Chromium navigation/refresh and component contracts passed; new-account browser submission not run | Existing-account demo does not require registration |
| `/forgot-password.html` | Complete | Active | Partial: Chromium navigation/refresh and request contracts passed | Ethereal email delivery was not exercised |
| `/admin-login.html` | Complete React redirect | Active | Passed: redirect and real admin login | None for local demo |
| `/dashboard.html` | Complete | Active | Passed: authenticated navigation/refresh and real summary APIs | Some deferred service types remain outside demo |
| `/profile.html` | Complete | Active | Passed: authenticated navigation/refresh and owner-scoped API tests | Only backend-writable fields are editable |
| `/documents.html` | Complete | Active | Passed: authenticated navigation/refresh and document ownership/multipart contracts | Historical uploads remain a public privacy blocker |
| `/history.html` | Complete | Active | Passed: authenticated navigation/refresh and real history API | None for local demo |
| `/events.html` | Complete | Active | Passed: authenticated navigation/refresh and real notice API | None for local demo |
| `/contact.html` | Complete | Active | Passed: authenticated navigation/refresh and exact write contract tests | Browser did not create a new contact row |
| `/market.html` | Complete | Active | Passed: authenticated navigation/refresh and owner-scoped complaint API coverage | Public-data policy remains a deployment review item |
| `/todo.html` | Complete | Active | Passed: Chromium create, status change, delete, direct navigation and refresh | FullCalendar incompatibility replaced with React-owned calendar grid |
| `/community.html` | Complete | Active | Passed: Chromium navigation/refresh; multipart uploads, ownership, admin denial, XSS and exact counter tests | Legacy files retained only for rollback |
| `/shop.html` | Complete | Active | Passed: Chromium navigation/refresh; isolated cart, duplicate add, calculations and COD order APIs | Online payment is simulation-only unless sandbox is used |
| `/nid.html` | Complete | Active | Passed: Chromium navigation/refresh; multipart workflows, owner isolation, positive photo/signature persistence and XSS tests | Public/cross-identity verification endpoints remain deployment blockers |
| `/passport.html` | Complete | Active | Passed: Chromium navigation/refresh; application, NID binding, upload ownership, cancellation and single history tests | Real payment verification deferred; simulation explicitly unverified |
| `/tax.html` | Complete | Active | Passed: Chromium navigation/refresh; TIN/VAT/return/payment ownership and status tests | Payment record is `Pending`, not gateway-verified |
| `/health.html` | Complete | Active | Passed: Chromium navigation/refresh; card, vaccination, appointment and ownership tests | Admin transition/audit hardening remains backlog |
| `/water.html` | Complete | Active | Passed: Chromium navigation/refresh; connection, complaint, quality and ownership tests | Bill simulation does not write; legacy endpoint still trusts client totals |
| `/land.html` | Complete | Active | Passed: Chromium navigation/refresh; owner-scoped records/status and complete transfer-trigger regression | Real land-tax gateway verification deferred |
| `/agriculture.html` | Complete | Active | Passed: Chromium navigation/refresh; owner isolation, duplicate registration and admin denial | Pending public-listing contact exposure remains deployment blocker |
| `/education.html` | Complete | Active | Passed: Chromium navigation/refresh; result and stipend workflow tests | Public identity fields in result API remain deployment blocker |
| `/admission.html` | Complete | Active | Passed: Chromium navigation/refresh; catalogue/detail API regression | Public applicant identity access remains deployment blocker |
| `/apply.html` | Complete | Active | Passed for Draft/Pending application and duplicate rejection; Chromium navigation/refresh passed | Payment is isolated simulation unless sandbox works; no fake Paid state |
| `/reports.html` | Complete | Active | Passed: real admin login, all 14 report domains, filtering and client pagination in Chromium; selected-action locks tested | Some legacy CRUD breadth is linked to domain admin pages, not duplicated |
| `/admin-nid.html` | Complete | Active | Passed: Chromium navigation/refresh; admin authorization, filtering, pagination and selected-record tests | API returns newest 200 subset and lacks transition graph |
| `/admin-passport.html` | Complete | Active | Passed: Chromium navigation/refresh; authorization, filters, selected update and exactly-one trigger history | Server transition graph remains backlog |
| `/admin-health.html` | Complete | Active | Passed: Chromium navigation/refresh; all queues, selected updates and hospital CRUD APIs | Unknown-id false success and actor audit remain backlog |
| `/admin-water.html` | Complete | Active | Passed: Chromium navigation/refresh and real APIs; authorization, filters, selected updates, project CRUD and unknown-id rejection | Bill status is labeled administrative/demo, not gateway verification |

## Actual verification record

- React production build: **passed** (`vite build`, 71 modules).
- React component/contract tests: **94/94 passed** across 15 files.
- Backend/database regression: **66/66 passed** against
  `central_govt_db_test`, sequential and reset-safe.
- Chromium teacher-demo suite: **3/3 passed**:
  - all public pages navigate/refresh and all 29 Express routes return React;
  - real citizen login, all citizen pages, Todo write lifecycle, payment
    simulation labeling, and citizen denial from an admin API;
  - real admin login, every admin page, all Reports domains, filtering, and
    Admin Water real API loading.
- `central_govt_db` read-only readiness check: **passed**—138 tables, two
  synthetic citizens, and one approved synthetic admin.
- Positive multipart checks passed for Community and NID. Invalid NID/passport
  types were rejected as expected.
- No page exceptions or API HTTP 500/429 responses occurred in the final
  authenticated Chromium run.

The first complete Chromium run failed and is not counted as a pass:
FullCalendar's React adapter crashed under React 19. It was replaced with a
React-owned calendar grid, then the complete browser suite passed. The first
Admin Water focused run exposed a MariaDB `DATETIME` formatting defect; that was
corrected and both focused and full suites passed.

## React migration work remaining

- No intended teacher-presentation page remains on legacy HTML in React mode.
- Legacy HTML/JS/CSS remains intentionally available through default
  `npm start`; cleanup or changing the default start command needs approval.
- A click-through of every optional form/control is not claimed. The rehearsed
  walkthrough covers representative complete citizen, service,
  payment-simulation, and admin journeys.

## Pre-existing backend/database limitations

- Stored routines remain deferred because XAMPP MariaDB `mysql.proc` metadata
  is incompatible; active code contains no required `CALL` sites.
- NID `citizen_id` normalization remains intentionally unresolved.
- Several legacy/unused endpoints and admin transition graphs are deferred.
- Health/NID admin APIs retain documented unknown-id/queue-limit behavior.

## Security and public-deployment blockers

- Historical identity uploads, permissive CORS, browser token storage, public
  identity/result/application lookup, unverified real payment callbacks, and
  agriculture contact exposure remain open in `docs/SECURITY_TRACKER.md`.
- The payment fallback is local React state only and visibly says
  `SIMULATED — NOT GATEWAY VERIFIED`; it never calls a gateway or changes a
  payment/application status.
- NationX is ready for the scoped local teacher demonstration, but it is **not
  secure or ready for public deployment**.
