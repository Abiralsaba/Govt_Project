# React migration matrix

Last verified: 2026-08-28. `React verified` means the page is implemented with
React-owned markup/state, the Vite production build passed, its focused contract
tests passed, and its built `.html` route/read APIs were exercised against
`central_govt_db_test`. It does not mean the whole application is production
ready. Security blockers remain in `docs/SECURITY_TRACKER.md`.

The original files in `public/` are retained unchanged as rollback sources.
`npm start` serves legacy; `npm run start:react` enables only the verified route
allow-list in `src/app.js`.

| Existing URL | Role | Legacy source | Main API contract | Current status |
|---|---|---|---|---|
| `/`, `/index.html` | Public | `index.html`, `js/auth.js`, `css/auth.css` | `/api/auth/login`, `/api/admin/login`, `/api/admin/register` | React verified; `#admin` preserved |
| `/register.html` | Public | `register.html`, `js/auth.js`, `css/auth.css` | `POST /api/auth/register` | React verified |
| `/forgot-password.html` | Public | inline + `js/auth.js` | `POST /api/auth/send-reset-otp`, `/reset-password-verify` | React verified; demo preview URL preserved |
| `/admin-login.html` | Public redirect | `admin-login.html` | none | React verified redirect to `/index.html#admin` |
| `/dashboard.html` | Citizen | `dashboard.html`, `js/dashboard.js`, shared CSS | summary, departments, requests, notifications | React verified; first complete workflow |
| `/profile.html` | Citizen | `profile.html`, `js/profile.js`, `css/profile.css` | `GET/PUT /api/user/profile`, `POST /profile/photo` | React verified; only backend-writable fields editable |
| `/documents.html` | Citizen | `documents.html`, `js/documents.js`, `css/documents.css` | official/personal document GET and multipart upload/update | React verified; FormData names tested |
| `/history.html` | Citizen | `history.html`, `js/history.js`, `css/history.css` | `GET /api/dashboard/history` | React verified |
| `/events.html` | Citizen | `events.html`, `js/notices.js` | public `/api/notices` list/detail with filters | React verified |
| `/contact.html` | Citizen | `contact.html`, inline script | `POST /api/contact` | React verified; write payload unit-tested |
| `/market.html` | Citizen | `market.html`, `js/market.js` | market prices and price complaints | React verified; active JSON complaint contract used |
| `/todo.html` | Citizen | `todo.html`, `js/dashboard.js`, `css/todo.css` | dashboard todo CRUD/move | Pending; legacy rollback active |
| `/community.html` | Citizen | `community.html`, `js/community.js`, `css/community.css` | groups, posts, comments, likes, uploads | Pending; legacy rollback active |
| `/shop.html` | Citizen/payment return | `shop.html`, `js/shop.js` | items, isolated cart, orders, shop payment return params | Pending; legacy rollback active |
| `/nid.html` | Citizen | `nid.html`, `js/nid.js`, `css/nid.css` | `/api/nid/*` JSON and multipart workflows | Pending; legacy rollback active |
| `/passport.html` | Citizen | `passport.html`, `js/passport.js`, `css/passport.css` | `/api/passport/*` wizard/uploads/tracking | Pending; legacy rollback active |
| `/tax.html` | Citizen | `tax.html`, `js/tax.js`, `css/tax.css` | `/api/tax/*` | Pending; legacy rollback active |
| `/health.html` | Citizen | `health.html`, `js/health.js`, `css/health.css` | `/api/health/*` | Pending; legacy rollback active |
| `/water.html` | Citizen | `water.html`, `js/water.js`, `css/water.css` | `/api/water/*` | Pending; legacy rollback active |
| `/land.html` | Citizen/payment return | `land.html` inline, `css/land.css` | departments land APIs and `/api/payment/land/tax/init` | Pending; legacy handles `status`/`tid` return today |
| `/agriculture.html` | Citizen | `agriculture.html`, `js/agriculture.js`, `js/weather.js` | `/api/agriculture/*`, weather APIs | Pending; legacy rollback active |
| `/education.html` | Citizen | `education.html` inline | results and stipend lifecycle | Pending; legacy rollback active |
| `/admission.html` | Public | `admission.html` inline | public `/api/university/admissions*` | Pending; legacy rollback active |
| `/apply.html` | Public/payment return | `apply.html` inline | verify/apply/payment plus return query combinations | Pending; legacy handles payment return today |
| `/reports.html` | Admin | `reports.html`, `js/reports.js`, `css/reports.css` | master `/api/admin/*` console | Pending; legacy rollback active |
| `/admin-nid.html` | Admin | `admin-nid.html`, `js/admin-nid.js` | `/api/nid/admin/*` | Pending; legacy rollback active |
| `/admin-passport.html` | Admin | `admin-passport.html`, `js/admin-passport.js` | passport admin endpoints | Pending; legacy rollback active |
| `/admin-health.html` | Admin | `admin-health.html`, `js/admin-health.js` | `/api/health/admin/*` | Pending; legacy rollback active |
| `/admin-water.html` | Admin | `admin-water.html`, `js/admin-water.js` | `/api/water/admin/*` | Pending; legacy rollback active |

## Verified contracts so far

- Same citizen/admin local-storage keys (`token`, `adminToken`, `adminName`) and
  `Authorization: Bearer` behavior, including quote sanitization and 401 cleanup.
- Relative same-origin APIs; JSON and multipart requests remain distinct.
- Literal `.html` routes and their query strings are accepted by Express.
- Dashboard generic requests retain the client-side `req_` prefix.
- `/uploads` remains served by Express and was smoke-tested during React mode.
- No legacy HTML is embedded and no legacy JavaScript is imported by React.

## Verification record

- React build: passed.
- React tests: 5 files, 9 tests passed.
- Database/backend regression: 13 tests passed.
- Test-database Express smoke: auth/dashboard workflow and the six low-risk page
  routes/read APIs passed with HTTP 200.
- Full cross-page compatibility: blocked until every pending row is migrated and
  exercised. No public deployment or production-readiness claim is authorized.
