# NationX — Central Government Services Portal

> Full project analysis. Read this before working on the codebase.

**TL;DR:** A university DBMS course project (team "SELECT * FROM WINNERS") simulating Bangladesh central-government services — a full-stack **Node.js/Express + MySQL** citizen portal with ~30 static HTML pages, a 364-endpoint REST API, and the project's centerpiece: a **~134-table MySQL schema** with ~30 stored procedures, ~20 triggers, and 15+ views. Runs locally on XAMPP at `http://localhost:3000`.

---

## 1. Tech Stack

| Layer       | Technology |
|-------------|------------|
| Runtime     | Node.js (CommonJS), Express 5 |
| Database    | MySQL via `mysql2/promise` connection pool (10 conns), database `central_govt_db` |
| Auth        | JWT (1h expiry) + bcrypt hashing; separate citizen/admin token paths |
| Security    | helmet + CSP, CORS, express-rate-limit (100 req / 15 min on `/api`) |
| Uploads     | Multer (5MB cap) |
| Payments    | SSLCommerz sandbox (`sslcommerz-lts`) for land tax |
| Email       | Nodemailer with Ethereal test accounts (demo OTP only) |
| Frontend    | Plain static HTML + vanilla JS (`fetch` to `/api/*`), per-page CSS, CDN fonts/icons |
| External    | Open-Meteo + NASA POWER (weather/agriculture), ui-avatars.com |

## 2. Project Structure

```
central govt/
├── src/
│   ├── app.js                  # Express entry point: 22 route mounts, CSP, rate limit
│   ├── config/db.js            # MySQL pool
│   ├── controllers/            # Only 4 (auth 245L, adminAuth 144L, dashboard 549L, user 104L)
│   ├── middleware/             # authMiddleware (JWT), adminMiddleware (isAdmin claim), multer
│   ├── routes/                 # 22 files — THE BULK OF THE APP (~10,600 lines, SQL inline)
│   └── database/               # 27 SQL files (~7,300 lines): schemas, procs, triggers, views
├── public/
│   ├── *.html                  # 30 pages (citizen services + admin panels)
│   ├── js/                     # 23 vanilla JS files (one per page + sidebar/weather)
│   ├── css/                    # ~25 stylesheets (per-page + shared style/sidebar/auth)
│   └── uploads/                # user content: profiles, NID photos, passports, products…
├── docs/DBMS_PROJECT_DOCUMENTATION.md       # main course documentation
├── explain.md / explain1.md / explain2.md   # deep dives: Land, Community, Education modules
├── NationX_Documentation.html / NationX_Technical_Specification.html (untracked spec docs)
├── nationx-complete-er-diagram-134-tables.svg / .png, sequence diagram, poster
└── README.md, .env (gitignored)
```

**Architecture pattern:** deliberately "fat routes" — nearly all business logic and SQL lives directly in route files (e.g. `adminRoutes.js` is 1,762 lines / 56 endpoints; `nidRoutes.js` is 1,233 lines). Controllers exist only for auth, admin auth, dashboard, and user. There is **no service/repository layer and no ORM** — match this style when extending existing modules.

## 3. Backend — API Surface (364 endpoints across 22 modules)

| Module | Endpoints | What it does |
|---|---|---|
| `adminRoutes` | 56 | Master admin panel: approvals across all services |
| `health` | 40 | Vaccinations, appointments, records |
| `nid` | 33 | NID card apply/correction, citizen verification |
| `water` | 33 | Water connections, billing, complaints |
| `agriculture` | 30 | Crop reports, subsidies, weather-fed advisory |
| `department` | 29 | Department directory + ~28 `req_*` generic service request types |
| `passport` | 26 | Passport applications, fee calc, status tracking |
| `community` | 18 | Groups, posts, comments, likes + moderation |
| `dashboard` | 18 | Citizen unified summary/stats |
| `tax` (NBR) | 14 | TIN registration, returns, VAT, payments, notices |
| `shop` | 13 | Products, cart, orders |
| `reports` | 15 | Analytics/reporting |
| `university` / `education` / `stipend` | 19 | Exam results (JSC/SSC/HSC), admissions, stipends |
| `auth` / `adminAuth` / `user` / `payment` / `notice` / `contact` | 20 | Login/register/OTP, admin auth, profile, SSLCommerz, notices, contact |

### Auth flow
- **Citizen:** registers into `reg_info` (mirrored into `user_info`) → receives JWT `{id, username, nid}`, 1h expiry. Login writes to `login_logs`.
- **Admin:** logs in via `admins` table (must be `status='approved'`) → JWT carrying an `isAdmin` claim, enforced by `src/middleware/adminMiddleware.js:18`.
- **Client side:** token stored in `localStorage`; pages redirect to `index.html` when missing (see `public/js/dashboard.js:2`); requests send `Authorization: Bearer <token>`.

## 4. Database Layer (centerpiece of the project)

- **~138 `CREATE TABLE` statements** across 27 SQL files. `schema_full.sql` (68 tables) is the master; domain schemas extend it: nid (12), nbr (7), health (6), agriculture (6), passport (5), water (5), education (4), shop (4), university admission (3), stipend (2), market (2), admin (2), plus land, notices, contact, logging. Some duplication exists between master and domain files.
- **Domains covered:** NID, passport, tax/NBR, health, water, land/mutation, agriculture, education, university admission, stipends, community, shop/market, geo hierarchy (`divisions → districts → upazilas`), and ~28 generic `req_*` request tables (birth cert correction, trade license, driving license, visa, GD/legal cases, …).
- **Advanced DB features (the graded focus):**
  - ~30 **stored procedures** — `sp_process_nid_application`, `sp_generate_nid_number`, `sp_calculate_land_tax`, `sp_process_land_mutation`, `sp_calculate_income_tax`, `sp_check_admission_eligibility`, `sp_check_stipend_eligibility`, `sp_generate_water_bill`, `sp_admin_dashboard_stats`, …
  - ~20 **triggers** — `after_mutation_approval`, `tr_sync_user_info`, `tr_like_insert/delete` (denormalized counters), `tr_clear_cart_on_order`, audit triggers, …
  - 15+ **views** — `v_citizen_profile`, `v_service_dashboard`, `v_education_board_analysis`, `v_shop_product_inventory`, …
  - `complex_queries.sql` (721 lines) of analytical queries; `schema_normalized.sql` demonstrates 3NF/BCNF.

## 5. Frontend

- **Citizen pages:** index (landing), register, forgot-password (OTP), dashboard, profile, documents, history, todo, reports, contact, events.
- **Service pages:** `nid`, `passport`, `tax`, `health`, `water`, `land` (largest, 1,530 lines), `agriculture`, `education`, `admission`, `apply`, `shop`, `market`, `community`.
- **Admin pages:** `admin-login`, `admin-nid`, `admin-passport`, `admin-health`, `admin-water`.
- Vanilla JS per page in `public/js/` (23 files) calling the API with Bearer tokens; shared responsive sidebar (`sidebar.js`); Bangladesh flag green/red theme. The largest HTML files are monolithic (reports 1,556 lines; land 1,530).

## 6. Documentation

- `docs/DBMS_PROJECT_DOCUMENTATION.md` — full course doc: problem statement, architecture, per-domain ER diagrams, every table's schema.
- `explain.md` (Land), `explain1.md` (Community), `explain2.md` (Education) — frontend → API → database walkthroughs of individual modules.
- `NationX_Technical_Specification.html` — includes an "AI/ML Pipeline" section that is **aspirational only**; no such code exists.
- ER diagram (SVG + 9MB PNG), sequence diagram, and a project poster in git history.

## 7. Known Issues & Gotchas

1. **README is stale/broken** — references `scripts/setup_db.js`, `scripts/deploy_schema.js`, `scripts/deploy_expansion.js`, but **no `scripts/` folder exists**; also contains the typo `node src/app.js30` (should be `node src/app.js`). Setup is actually: create DB `central_govt_db`, run the SQL files in `src/database/`, then `npm start`.
2. **Inconsistent JWT fallback secrets** — `src/controllers/authController.js:7` falls back to `'super_secret_key_change_this_in_prod'` while `src/middleware/authMiddleware.js:7` falls back to `'your-secret-key'`. Works only because `.env` defines `JWT_SECRET`; without it, tokens would be signed and verified with different secrets.
3. **Two password libraries** — both `bcrypt` (citizens) and `bcryptjs` (admins) are dependencies.
4. **Payments hardcoded to localhost** — `src/routes/paymentRoutes.js` builds success/fail/cancel URLs with `http://localhost:3000/...` and falls back to sandbox creds `testbox/qwerty`. Demo-only.
5. **Real user uploads committed to git** — `public/uploads/` contains NID photos, passport scans, and profile pictures. Privacy concern; clean before making the repo public.
6. **No tests, no linter, no CI** — `npm test` is a placeholder.
7. **Schema drift risk** — tables are defined in both `schema_full.sql` and per-domain files; near-duplicates exist (e.g. `Ordered_item` vs `order_items`).
8. `.env` is correctly gitignored; helmet/CSP + rate limiting are sensibly configured for a student project.

## 8. Quick Start

```bash
npm install                 # install dependencies
# MySQL (XAMPP) must be running; create DB `central_govt_db`
# Load src/database/schema_full.sql then domain schemas, views, procs, triggers
npm start                   # serves on http://localhost:3000
```
