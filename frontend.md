# Frontend Analysis & React Migration Guide

> Complete file-by-file analysis of the NationX frontend (`public/`), prepared for a
> HTML → React migration. **Goal: change NOTHING that the backend, database, or payment
> flow depends on.** Every API path, header, payload key, and redirect below is a
> contract that the React app must reproduce exactly.

---

## 0. The 10 Golden Rules (do not break these)

1. **All API calls are same-origin relative paths** (`/api/...`). Keep them relative in React (dev: proxy to `localhost:3000`; prod: serve the React build from the same Express server).
2. **Auth header format:** `Authorization: Bearer <token>` where token comes from `localStorage.getItem('token')` (citizens) or `localStorage.getItem('adminToken')` (admins). Keep these exact storage keys during migration so old sessions/logic keep working.
3. **JSON POSTs** send `'Content-Type': 'application/json'`. **File uploads** send FormData with NO manual Content-Type (browser sets multipart boundary). Never mix these up.
4. **Backend hard-redirects to HTML paths after payments:**
   - `src/routes/paymentRoutes.js:98,113` → `/land.html?status=success&tid=...` / `?status=fail`
   - `src/routes/universityRoutes.js:415-447` → `/apply.html?success=true&applicationId=...` / `?error=...` / `?cancelled=true`
   → React Router MUST register routes literally named `land.html` and `apply.html` (see §7).
5. **The departments API returns `.html` links** (`src/controllers/dashboardController.js:349-356` returns `link: 'agriculture.html'`, `'land.html'`, `'tax.html'`, `'passport.html'`, `'nid.html'`, `'health.html'`, `'water.html'`, `'education.html'`). Register React routes with those literal `.html` names so these links keep working with zero backend change.
6. **The generic service-request form prefixes `req_` client-side** (`public/js/dashboard.js:404` sends `subCategory: 'req_' + subCategory`). The backend uses that string directly as a **table name** (`dashboardController.js:326`). The prefix logic must stay in the frontend exactly as-is.
7. **Public (no-token) pages exist:** `index.html`, `register.html`, `forgot-password.html`, `admin-login.html`, **`admission.html`**, **`apply.html`** (university admission calls `/api/university/*` without Authorization). Don't add auth guards to these flows.
8. **Unauthenticated redirect targets:** citizens → `index.html`; admins → `index.html#admin` (the `#admin` hash opens the admin tab). On 401 mid-session: `localStorage.removeItem('token')` (or `adminToken`+`adminName`) then redirect.
9. **External browser APIs:** Open-Meteo (forecast, enabled) + NASA POWER (history, currently disabled in code) + `ui-avatars.com` avatars + geolocation. Helmet CSP already whitelists them (`src/app.js:48`).
10. **CDN libraries:** SweetAlert2 (`cdn.jsdelivr.net/npm/sweetalert2@11`) on every page, Font Awesome 6.4 CSS, FullCalendar 5 + SortableJS on dashboard/todo. In React use npm equivalents; CSP `unsafe-inline` is already permitted but prefer components.

---

## 1. Frontend Architecture Overview

- **No framework, no bundler.** 30 static HTML files served by `express.static` (`src/app.js:68`). Logic lives in 23 external JS files (`public/js/`) **plus large inline `<script>` blocks** inside 11 of the HTML files.
- **Two JS styles coexist:**
  - Object-literal "app" objects: `HealthApp`, `PassportApp`, `WeatherManager`, `WaterApp`, `AgricultureApp`, `NIDApp`, `TaxApp`… pattern: `const X = { API: '/api/x', token: localStorage.getItem('token'), init() {...} }`.
  - Loose function + `getElementById` scripts (inline pages, `auth.js`, `dashboard.js`).
- **Tab navigation inside pages** is done by showing/hiding `content-section` divs (`showSection('id')` / `switchTab()`), not routing. In React these become page-internal tab state.
- **Shared files:** `sidebar.js` (builds hamburger/overlay for the responsive sidebar on every authed page), `dashboard.js` (reused on 5 pages: dashboard, contact, events, shop, todo — contains summary loading, todos/kanban/calendar, service-request modal, logout).
- **SweetAlert2 is the universal dialog system** (dark theme: `background: '#0f172a'`, `color: '#fff'`, BD-green `#006a4e` / BD-red `#f42a41` accents). Replace with `sweetalert2` npm package and the same theming.
- **Styling:** shared `style.css` + `sidebar.css` on all authed pages; per-page CSS on top (map in §5). Bangladesh flag palette (green `#006a4e`, red `#f42a41`), dark slate backgrounds, Bengali + English mixed UI text.

**Size:** HTML ≈ 17,000 lines, JS ≈ 16,100 lines (`reports.js` alone 4,078; `nid.js` 1,629; `passport.js` 1,088), CSS 21 files.

---

## 2. Global Conventions

### 2.1 Tokens & storage (exact keys)
| Key | Set by | Used by | Cleared by |
|---|---|---|---|
| `token` | `js/auth.js:71,128` (login + auto-login after register) | every citizen page | logout button (`dashboard.js:256`), 401 handlers |
| `adminToken` | `js/auth.js:259`, `js/admin-login.js:52` | `reports.js`, all `admin-*.js` | admin logout / 401 (`reports.js:42-44`) |
| `adminName` | `js/auth.js:260`, `js/admin-login.js:53` | header display | with adminToken |

`land.html:946` additionally **sanitizes** the token: `.replace(/['"]+/g, '').trim()` — quotes in localStorage once broke `Bearer` parsing. Do the same normalization in the React API client.

### 2.2 Post-login routes
- Citizen login/register success → `dashboard.html`
- Admin login success → `reports.html`
- Password reset success → `index.html`
- `admin-login.html` is a stub that redirects to `index.html#admin` (`admin-login.html:9`). `auth.js:201` checks `location.hash === '#admin'` to auto-open the admin tab. Preserve this deep-link.

### 2.3 API call patterns to replicate
```js
// JSON
fetch('/api/...', { method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(payload) })

// Upload (NO content-type header!)
const fd = new FormData(); fd.append('document', file);
fetch('/api/...', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd })
```
- `land.html:836` also **checks `content-type` of responses** and shows "restart your server" on non-JSON — keep tolerant JSON parsing in React.
- `nid.js:track` uses `encodeURIComponent(refNo)`.
- Admin list endpoints take **query strings**: `?${params.toString()}` with `page`, `search`, `status` etc. (see §4.13).

---

## 3. File-by-File Analysis — Auth Pages (public, no token)

### 3.1 `index.html` (277 lines) — Landing + Login + Register + Admin portal
- CSS: `auth.css`. JS: CDN SweetAlert2 + `js/auth.js` + small inline focus/label effects (`index.html:258-275`).
- One page, three modes via tab toggles: Citizen login (`#loginForm`), Register (`#registerForm` — actually on `register.html`), Admin (`#adminSection` with login + register forms, `#admin` hash deep-link).
- API calls (all via `auth.js`):
  - `POST /api/auth/login` `{email, password}` → `{token, user}` → store `token` → `dashboard.html`
  - `POST /api/auth/register` `{username, email, password, nid, mobile, dob, address, gender}` → auto-login
  - `POST /api/admin/login` `{email, password}` → `{token, admin}` → store `adminToken`,`adminName` → `reports.html`; `data.status === 'pending'` shows pending-approval notice
  - `POST /api/admin/register` `{name, nid, email, mobile, password}` → always "pending approval" flow
- React: `<LoginPage>`, `<RegisterPage>`, `<AdminLoginPage>` sharing one `/` route with `#/admin` handling, or split routes.

### 3.2 `register.html` (521 lines) — Citizen registration
- CSS: `auth.css`; JS: `auth.js` (register handler, client-side password-match check). Fields listed in §3.1. → `dashboard.html` on success.

### 3.3 `forgot-password.html` (159 lines) — 2-step OTP reset
- Inline script (`forgot-password.html:64-157`):
  - `POST /api/auth/send-reset-otp` `{email, nid}` → response contains `previewUrl` (Ethereal demo) shown as a clickable link
  - `POST /api/auth/reset-password-verify` `{email, nid, otp, newPassword}`
- React: 2-step wizard; keep showing `data.previewUrl` when present.

### 3.4 `admin-login.html` (16 lines) — redirect stub
- `<script>window.location.replace('index.html#admin')</script>`. React: route `/admin-login` → `<Navigate to="/#admin" />`.

---

## 4. File-by-File Analysis — Citizen Pages

### 4.1 `dashboard.html` (476 lines) + `js/dashboard.js` (670 lines) — Citizen home
- Also loaded by `contact.html`, `events.html`, `shop.html`, `todo.html` (for summary/logout/todos).
- CDN: SweetAlert2, **FullCalendar 5**, **SortableJS**.
- APIs (all Bearer-token):
  - `GET /api/dashboard/summary` → `{user:{name,nid,photo_url}, stats:{activeRequests, completedTasks, notifications}}`
  - `GET /api/dashboard/departments` → array incl. `link` (`.html` filenames!), `icon`, `name`, `desc`
  - `GET/POST /api/dashboard/todos`; `PUT /api/dashboard/todos/:id/move` `{status:'todo'|'progress'|'done'}`; `DELETE /api/dashboard/todos/:id`; POST body `{title, description, due_date:'YYYY-MM-DD HH:MM:SS'}` (ISO-sliced, see `dashboard.js:189`)
  - `POST /api/dashboard/services/request` `{category, subCategory:'req_'+value, uniqueId, evidenceLink, description}` — **client-side `req_` prefix is mandatory** (backend uses it as table name)
  - `GET /api/dashboard/services/active|completed|status`, `GET /api/dashboard/notifications`, `POST /api/dashboard/notifications/:id/read`
- Features: stats cards, department grid, Kanban (SortableJS) + FullCalendar synced from todos, service-request modal with the 6-category/28-subtype `serviceTypes` map (`dashboard.js:326-364`), logout.
- On fetch error: `localStorage.removeItem('token')` → `index.html` (`dashboard.js:50-51`).

### 4.2 `profile.html` (116 lines) + `js/profile.js` (205 lines)
- `GET /api/user/profile`; `PUT/POST /api/user/profile` (JSON profile update); `POST /api/user/profile/photo` — **FormData `photo`** file field.

### 4.3 `documents.html` (142 lines) + `js/documents.js` (467 lines) — personal vault
- `GET /api/dashboard/documents`, `GET /api/dashboard/documents/user`
- `POST /api/dashboard/documents/upload` — FormData: `docType`, `docName`, `document` (file)
- `POST /api/dashboard/documents/upload-official` — FormData: `docCategory`, `identityNumber`, `document` (file)
- `PUT /api/dashboard/documents/update/:id`

### 4.4 `history.html` (75 lines) + `js/history.js` (80 lines)
- `GET /api/dashboard/history` — read-only activity feed.

### 4.5 `todo.html` (182 lines)
- Same `dashboard.js` todo engine + FullCalendar CSS/JS + SortableJS (standalone full-page kanban/calendar).

### 4.6 `events.html` (1,014 lines) + `js/notices.js` (406 lines) (+ dashboard.js)
- `GET /api/notices?${params}` (pagination/filters), `GET /api/notices/:id`, `DELETE /api/notices/:id`. Government notices/events board.

### 4.7 `contact.html` (491 lines) — ministry directory + message form
- Inline script `contact.html:404-447`: `POST /api/contact` `{department, subject, message}` with Bearer token. Static gov portal link list (bangladesh.gov.bd, epassport.gov.bd…).

### 4.8 `nid.html` (1,112 lines) + `js/nid.js` (1,629 lines) — NID Wing
- Sections: overview/dashboard, smart-card, corrections, reissue, address change, verification, family, appointments, fees, track, all-applications.
- API base `/api/nid`:
  - `GET /dashboard`, `/fees`, `/centers`, `/profile`, `/family`, `/family/:id`, `/all-applications`, `/verifications`, `/track/:refNo` (URL-encoded)
  - `GET /appointments/slots/:centerId/:date`; `POST/PUT /appointments`, `/appointments/:id`
  - `POST /smart-card` **JSON** `{collection_center_id, biometric_date}`
  - `POST /verify` JSON profileData; `POST /address-change` JSON
  - `POST /corrections` — FormData: `nid_number`, `correction_type`, `current_value`, `corrected_value`, `document_description`, `documents` (**multiple** files)
  - `POST /reissue` — FormData: `nid_number`, `reason`, `details`, `delivery_type`, `collection_center_id`, `delivery_address`, `gd_number`, `gd_date`, `police_station`, `gd_document` (file), `damaged_photo` (file)
  - Address change FormData: `nid_number`, `address_type`, `old_address`, `new_division`, `new_district`, `new_upazila`, `new_post_office`, `new_post_code`, `new_ward_no`

### 4.9 `passport.html` (1,011 lines) + `js/passport.js` (1,088 lines) — e-Passport
- 5-step wizard + track/applications/fees/offices/guidelines sections. API base `/api/passport`:
  - `GET /stats`, `/recent-activity`, `/my-applications`, `/fees`, `/offices`, `/application/:id`, `/track/:appNumber`, `/locations/divisions|districts/:div|upazilas/:dist`
  - `POST` application (JSON via shared post helper), `PUT` edit
  - `POST /upload-documents/:appId` — FormData (documents; **no Content-Type header**)
- Client-side fee calculation mirrors `sp_calculate_passport_fee`.

### 4.10 `tax.html` (970 lines) + `js/tax.js` (773 lines) — NBR Tax
- API base `const API = '/api/tax'` (`tax.js:9`):
  - `GET /dashboard`, `/tin/status`, `/vat/status`, `/zones`, `/notices`, `/payments`, `/returns`, `/challan`
  - `POST /tin/apply` — JSON with the TIN form fields (taxpayer_name, father_name, mother_name, date_of_birth, nid_number, passport_number, mobile, email, present_address, permanent_address, taxpayer_type, source_of_income, zone_id — matches `taxRoutes.js:71-105`)
  - `POST /returns/file`, `POST /payments/pay` (→ returns `receipt_no`), `POST /vat/register`, `POST /challan` (→ `challan_no`)
  - `POST /notices/:id/read`

### 4.11 `health.html` (706 lines) + `js/health.js` (660 lines)
- Sections: health-card, vaccination, hospitals, appointments, ambulance, complaints. API base `/api/health`:
  - `GET /my-stats`, `/my-activity`, `/hospitals`, `/locations/...`, `/health-card/my`, `/vaccination/my`, `/appointment/my`, `/ambulance/my`, `/complaint/my`
  - `POST /health-card/register` `{full_name, father_name, mother_name, nid_number, date_of_birth, gender, blood_group, phone, emergency_contact, division, district, upazila}`
  - `POST /vaccination/register` `{vaccine_type, vaccine_name, dose_number, vaccination_date, vaccination_center}`
  - `POST /appointment/...` `{hospital_id, patient_name, patient_age, patient_gender, phone, department, doctor_name, appointment_date, appointment_time, symptoms, urgency}`

### 4.12 `water.html` (557 lines) + `js/water.js` (503 lines)
- Sections: connections, bills, complaints, quality. API base `/api/water`:
  - `GET /my-stats`, `/my-activity`, `/locations/...`, `/connection/my-connections`, `/bill/my-bills`, `/complaint/my-complaints`, `/quality/my-reports`
  - `POST` connection `{holder_name, nid_number, phone, connection_type, pipe_size, wasa_region, division, district, upazila, ward_no, ...}`
  - `POST` bill pay `{connection_number, billing_month, meter_reading_prev, meter_reading_current, amount, surcharge, total_amount, payment_method, transaction_id}`
  - `POST` quality report `{source_type, issue_type, severity, affected_people, division, ...}`

### 4.13 `land.html` (1,530 lines, inline scripts only) — Land Ministry
- Tabs: overview, mutation, records, tax. Token sanitized (`land.html:946`).
- APIs (`/api/departments/...`):
  - `GET /locations/divisions` (with cache-buster `?t=`), `/locations/districts/:divId`, `/locations/upazilas/:distId`
  - `GET /land/records`, `POST /land/records` (JSON from FormData of `#addRecordForm`)
  - `GET /land/applications`; `GET /land/mutation/status/:trackNum`
  - `POST /land/mutation_v2` — JSON `{division_id, district_id, upazila_id, applicant NID, khatian, dag, deed, amount, price, ownType, buyerNid}` (modal form)
  - `POST /api/payment/land/tax/init` — JSON payload = tax form fields **plus** `division_id`, `district_id`, `upazila_id` added programmatically (`land.html:812-814`). Response `{url}` → `window.location.href = url` (SSLCommerz full-page redirect). **Backend redirects back to `/land.html?status=...`** — React route must exist at that path and read `status`/`tid` query params.
- **Client-side tax calc must be preserved** (`land.html:787-801`): Residential `size×10`, Commercial `size×20`, Agricultural `size>825 ? size×2 : 0` (BDT).

### 4.14 `agriculture.html` (529 lines) + `js/agriculture.js` (733) + `js/weather.js` (222)
- Sections: dashboard, crop-reports, market listings, subsidies, training, expert Q&A. API base `/api/agriculture`:
  - `GET /stats`, `/recent-activity`, `/locations/...`, `/crop-report/my-reports`, `/market/browse`, `/market/my-listings`, `/subsidy/my-history`, `/training/programs`, `/training/my-registrations`, `/expert/my-queries` + JSON POSTs for each form
  - Market listing create uses FormData: `name`, `description`, `price`, `image`, `stock_quantity`
- `weather.js`: **Open-Meteo forecast** (enabled) + **NASA POWER** history (code present, disabled). Uses `navigator.geolocation`, defaults to Dhaka (23.8103, 90.4125).

### 4.15 `education.html` (877 lines, inline) — Results + Stipends
- Tab "admission" just redirects to `admission.html` (`education.html:701-704`).
- `GET /api/education/results/:examType/:examYear/:rollNumber` → renders marksheet (subjects[], student{}, result{gpa,status}); print button (`window.print()`).
- Stipends: `GET /api/stipends`, `GET /api/stipends/my-applications`, `GET /api/user/profile` (pre-fill name), and **nested JSON payload**:
  ```json
  POST /api/stipends/apply
  { "stipendId": 1,
    "studentDetails": { "gpa": "...", "institution": "..." },
    "financialInfo": { "monthlyIncome": "...", "members": "...", "land": "..." },
    "guardianInfo": {},
    "bankDetails": { "method": "...", "accountNo": "..." } }
  ```

### 4.16 `admission.html` (852 lines, inline) — PUBLIC university admission circulars
- No auth. `GET /api/university/admissions` (cards + stats computed client-side), `GET /api/university/my-applications/:roll/:year` (public lookup by roll!).
- Links to `apply.html?id=`, `apply.html?id=&view=details`, `apply.html?id=&continue=:applicationId`.

### 4.17 `apply.html` (912 lines, inline) — PUBLIC application + payment
- URL params: `id`, `success=true&applicationId=`, `continue`, `view=details`, `error`, `cancelled`.
- Flow: `GET /api/university/admissions/:id` → `GET /api/university/verify-hsc/:roll/:year?admissionId=` (`{found, hscData, eligible, reason, alreadyApplied, applicationId}`) → `POST /api/university/apply` `{admissionPostId, hscRoll, hscYear, mobile, email, presentAddress}` (BD mobile regex `^01[3-9]\d{8}$` client-side) → `POST /api/university/payment/init` `{applicationId}` → redirect to `payData.url`.
- Backend returns user to `/apply.html?success=true&applicationId=...` — **React route must handle these query combos.**

### 4.18 `community.html` (258 lines) + `js/community.js` (597 lines)
- `GET /api/dashboard/summary` (user chip) + community CRUD:
  - `GET/POST /api/community/groups`, `GET /api/community/my-groups`, `POST /api/community/groups/:id/join`, `POST /api/community/groups/:id/leave`
  - Group create FormData: `name`, `description`, `cover_image`; edit adds `keep_existing_cover:'true'` when unchanged
  - `GET/POST /api/community/groups/:id/posts`; post FormData: `content`, `post_image`; edit adds `keep_existing_image:'true'`
  - `POST/DELETE /api/community/posts/:id/like`, `GET/POST /api/community/posts/:id/comments` `{content}`, `DELETE /api/community/comments/:id`, `DELETE /api/community/posts/:id`

### 4.19 `shop.html` (508 lines) + `js/shop.js` (273) (+ dashboard.js)
- `GET /api/shop/items`, `POST /api/shop/cart` `{item_id, quantity:1}`, `GET /api/shop/cart`, `DELETE /api/shop/cart/:cartId`, `POST /api/shop/order` `{contact_number, delivery_address, payment_method}`.

### 4.20 `market.html` (924 lines) + `js/market.js` (338)
- `GET /api/shop/market-prices`, `GET /api/shop/complaints/my`, `POST /api/shop/complaints` (FormData incl. `severity`, `priority`, `date`, `description`), `GET /api/user/profile`. Inline script only toggles sidebar.

---

## 4b. File-by-File Analysis — Admin Pages (adminToken)

### 4.21 `reports.html` (1,556 lines) + `js/reports.js` (4,078 lines) — Master admin console
- Guard: no `adminToken` → `index.html#admin` (`reports.js:11-12`). On 401: clear `adminToken`+`adminName` → same redirect.
- Tabs (`reports.js:180-192`): overview, users, services, land, community, shop, education, admissions, audit, stipends, notices, agriculture, tax (sub-tabs: returns/tin/payments/notices), market.
- Endpoints via `fetchAdminAPI('...')` → `/api/admin/...`: `users`, `new-users`, `service-requests`, `land-mutations`, `community-groups`, `community-posts`, `orders`, `complaints`, `shop-items` (+`POST/PUT /api/admin/shop-items`, `PUT /api/admin/orders/:orderId/status`), `universities`, `admission-posts`, `admission-stats`, `university-applications`, `stipends`, `stipend-applications`, `education/stats`, `education/boards`, `market-prices`
- Tax admin: `GET /api/admin/tax/stats|returns|payments|tin-applications|notices`, `PUT /api/admin/tax/returns/:id/status`, `POST /api/admin/tax/tin/:id/approve`, `POST /api/admin/tax/payments/:id/verify`
- Notices admin: `GET/POST /api/notices`, `PUT/DELETE /api/notices/:id`, `GET /api/notices/admin/all`
- Agriculture admin (`reports.js:3213+`, base `/api/agriculture`): `admin/stats`, `admin/queries`, `admin/subsidies`, `admin/crop-summary`, `admin/market-listings`, `admin/training`, `admin/views/district-summary`, `admin/views/training-summary`
- Shop item forms use FormData: `name`, `description`, `price`, `image`, `stock_quantity`, `status`, `search`.

### 4.22 `admin-nid.html` (190 lines) + `js/admin-nid.js` (336 lines)
- Base `/api/nid/admin`: `GET /stats`, `GET /applications?${params}` (query: search/status/page), `GET /application/:refNo?table=:sourceTable`, `POST /update-status`.

### 4.23 `admin-passport.html` (200 lines) + `js/admin-passport.js` (593 lines)
- Base `/api/passport`: `GET /admin/stats`, `GET /admin/application/:id`, `GET /offices`, status-update POST/PUT.

### 4.24 `admin-health.html` (409 lines) + `js/admin-health.js` (930 lines)
- Base `/api/health/admin`: `GET /stats`, `/hospitals`, list endpoints `?${params}` + `/:id` for `appointments`, `complaints`, `health-cards`, `vaccinations`, `ambulance`, plus create/update hospital (FormData-ish `getHospitalFormData()` → JSON).

### 4.25 `admin-water.html` (386 lines) + `js/admin-water.js` (870 lines)
- Base `/api/water/admin`: `GET /stats`, `/projects`, and `?${params}` + `/:id` for `connections`, `bills`, `complaints`, `quality`; project create/update.

---

## 5. CSS & Asset Inventory

**Per-page CSS map (all authed pages also load `style.css` + `sidebar.css`):**
`index/register/forgot-password` → `auth.css`; `tax` → `tax.css` only; `admin-*` → parent page CSS + `admin-*.css`; service pages → own CSS (`nid`, `passport`, `health`, `water`, `land`, `agriculture`, `community`, `documents`, `history`, `profile`, `reports`, `todo`, `shop`→`shop_images.css`); `dashboard`, `contact`, `events`, `market` → shared only.

**Images:** `public/images/` (bd_flag.svg, page hero backgrounds). **Uploads (served statically):** `public/uploads/` — `profile-*.png`, `community-*`, `post-*`, `products/product-*`, `nid/*`, `passport/*`, `user_docs/*`. React must keep referencing these by the same relative URLs (they come back from API responses like `user.photo_url`).

---

## 6. React Migration Plan (backend stays 100% untouched)

### 6.1 Setup
```
client/                      # Vite + React (+ react-router-dom)
  src/api/client.js          # fetch wrapper: baseURL '' (relative), Bearer token
                            # from localStorage, token sanitizer, 401 interceptor
                            # → clear keys + redirect to /#admin or /
  src/components/            # Sidebar, Topbar, SweetAlert wrapper (sweetalert2 npm),
                            # StatCard, DataTable, LocationSelect (div→dist→upazila),
                            # FileUploadField, PaymentStatusBanner
  src/pages/...              # one folder per current .html page
  src/context/AuthContext.jsx  # {token, adminToken, login, logout}
```
- Dev: Vite `server.proxy: { '/api': 'http://localhost:3000' }` and **`/uploads` + `/images` too**.
- Prod (zero-risk cutover): `npm run build` → serve `client/dist` from Express **after** the legacy `public` folder is retired. Do NOT add `app.get('*')` SPA fallback with the `'*'` literal — Express 5 rejects it; use `app.use((req,res,next)=>{ ... sendFile index.html ... })` placed **after** all `/api` routes, or `/*splat`.

### 6.2 Route table (literal `.html` names are deliberate — see Golden Rules 4 & 5)
| React route | Source page | Guard |
|---|---|---|
| `/` (with `#admin` support) | index.html | public |
| `/register.html`, `/forgot-password.html` | register/forgot | public |
| `/admin-login.html` | admin-login stub | public → redirect `/#admin` |
| `/dashboard.html` | dashboard | citizen |
| `/profile.html`, `/documents.html`, `/history.html`, `/todo.html`, `/events.html`, `/contact.html` | … | citizen |
| `/nid.html`, `/passport.html`, `/tax.html`, `/health.html`, `/water.html`, `/land.html`, `/agriculture.html`, `/education.html` | … | citizen |
| `/admission.html`, `/apply.html` | … | **public** (query-param driven) |
| `/community.html`, `/shop.html`, `/market.html` | … | citizen |
| `/reports.html` | reports | admin |
| `/admin-nid.html`, `/admin-passport.html`, `/admin-health.html`, `/admin-water.html` | … | admin |

Keeping `.html` in route paths means: backend payment redirects (`/land.html?status=success`), department links, `apply.html?success=true` returns, and any bookmarks keep working unchanged. (Optionally add clean aliases later via `<Redirect>`; clean URLs are NOT required by the backend.)

### 6.3 API client must reproduce
1. Relative `/api/...` paths, JSON vs FormData exactly as §2.3.
2. Bearer header from the right storage key per audience; sanitize quotes.
3. 401 handling: citizen pages → remove `token`, go `/`; admin pages → remove `adminToken`+`adminName`, go `/#admin`.
4. `subCategory: 'req_' + subtype` for the generic service-request form.
5. Land tax payload shape (add geo IDs programmatically) and land tax client-side rates.
6. University + land payment flows: `window.location.href = data.url` (leave the SPA — it's an external gateway; the return URLs bring the browser back to the React route, which reads query params `status/tid` or `success/applicationId`).

### 6.4 Libraries swap
| Current CDN | React replacement |
|---|---|
| SweetAlert2 `@11` | `sweetalert2` npm (keep `background:'#0f172a'` theming or wrap in a util) |
| Font Awesome 6.4 CSS | `@fortawesome/fontawesome-free` CSS import (icon class names unchanged: `fas fa-*`) |
| FullCalendar 5 | `@fullcalendar/react` + daygrid/timegrid |
| SortableJS | keep `sortablejs` npm inside a `useRef` effect (kanban) |
| Open-Meteo / NASA POWER | same `fetch` calls (CSP already allows) |

### 6.5 Suggested shared components (from repeated patterns)
- `LocationCascadeSelect` — the divisions→districts→upazilas dropdown chain repeated in land, health, water, agriculture, passport, nid, admin pages (`/api/departments/locations/*` or each module's `/locations/*`).
- `StatsRow` — every module's `GET /my-stats`|`/dashboard`|`/stats` cards.
- `AdminCrudTab` — the identical list+search+status+pagination pattern in all four `admin-*.js` files.
- `TimelineActivity` — `/my-activity`|`/recent-activity`|`/history` lists.

### 6.6 Migration order (page-by-page, legacy keeps running)
1. Scaffold `client/` with route table + API client + auth guards; verify login → dashboard round-trip.
2. Migrate read-only/low-risk pages: history, contact, events, market, profile, documents.
3. Migrate the seven service modules (nid → passport → tax → health → water → land → agriculture), preserving every payload from §4.
4. Migrate public admission/apply + **payment return handling** (test SSLCommerz sandbox round-trip via `/land.html?status=...`).
5. Migrate community/shop/todo/dashboard (kanban/calendar last).
6. Migrate admin console (reports.html is the biggest — split by its 13 tabs into lazy-loaded chunks).
7. Cutover: point Express static at `client/dist` (keep `/uploads` + `/images` static serving!), smoke-test every POST + one upload per module.

### 6.7 Top migration risks (checklist)
- [ ] FormData field names for uploads (documents/nid/passport/community/market/profile/shop-items) — backend `multer` field names are exact.
- [ ] `req_` prefix client-side for service requests (backend builds SQL table name from it).
- [ ] Payment return paths `/land.html`, `/apply.html` must exist as routes reading query params.
- [ ] Departments `.html` links from API must resolve in the router.
- [ ] `/uploads` and `/images` must remain statically served and referenced by API-returned URLs.
- [ ] Keep `token` / `adminToken` / `adminName` localStorage keys (or run a one-time key migration on app boot).
- [ ] Public pages admission/apply must not gain auth guards.
- [ ] Express 5 SPA fallback syntax (`'*'` literal throws).
- [ ] Stipend apply nested JSON shape; BD mobile regex; land tax rates — all client-side logic to port as-is.

---

## 7. Full Endpoint Index (frontend → backend contract)

**Auth:** `POST /api/auth/login|register|send-reset-otp|reset-password-verify`; `POST /api/admin/login|register`
**Dashboard/user:** `GET /api/dashboard/summary|departments|history|documents(/user)|notifications|services/(active|completed|status)`; `POST /api/dashboard/services/request|documents/upload|documents/upload-official`; `PUT /api/dashboard/documents/update/:id`; `POST /api/dashboard/notifications/:id/read`; todos CRUD + `/move`; `GET|PUT /api/user/profile`; `POST /api/user/profile/photo`
**Departments/geo/land:** `GET /api/departments/locations/divisions|districts/:id|upazilas/:id`; `GET|POST /api/departments/land/records|applications`; `GET /api/departments/land/mutation/status/:t`; `POST /api/departments/land/mutation_v2`; `POST /api/payment/land/tax/init`
**NID:** `/api/nid/...` (dashboard, fees, centers, profile, family, appointments+slots, smart-card, corrections, reissue, address-change, verify, verifications, track, all-applications) + `/api/nid/admin/...`
**Passport:** `/api/passport/...` (stats, recent-activity, my-applications, application/:id, track, fees, offices, locations/*, upload-documents/:id) + `/admin/...`
**Tax:** `/api/tax/...` (dashboard, tin/apply|status, vat/register|status, returns, returns/file, payments, payments/pay, challan, zones, notices, notices/:id/read) + `/api/admin/tax/...`
**Health:** `/api/health/...` (my-stats, my-activity, hospitals, locations/*, health-card, vaccination, appointment, ambulance, complaint — `/my` variants + register POSTs) + `/api/health/admin/...`
**Water:** `/api/water/...` (my-stats, my-activity, locations/*, connection, bill, complaint, quality) + `/api/water/admin/...`
**Agriculture:** `/api/agriculture/...` (stats, recent-activity, locations/*, crop-report, market, subsidy, training, expert) + `/admin/...`
**Education/stipends:** `GET /api/education/results/:type/:year/:roll`; `GET|POST /api/stipends(+/apply|/my-applications)`
**University (public):** `GET /api/university/admissions(/:id)|my-applications/:roll/:year|verify-hsc/:roll/:year`; `POST /api/university/apply|payment/init`
**Community:** `/api/community/groups(+:id|/join|/leave|/posts)`, `my-groups`, `posts/:id(/like|/comments)`, `comments/:id`
**Shop/market:** `GET|POST /api/shop/items|cart|order`; `GET /api/shop/market-prices`; `POST /api/shop/complaints`, `GET /api/shop/complaints/my`
**Notices:** `GET|POST /api/notices(/:id|/admin/all)`
**Contact:** `POST /api/contact`
**Admin misc:** `/api/admin/users|new-users|service-requests|land-mutations|community-groups|community-posts|orders(+/:id/status)|complaints|shop-items|universities|admission-posts|admission-stats|university-applications|stipends|stipend-applications|education/stats|education/boards|market-prices`
**External (browser):** Open-Meteo forecast, NASA POWER history (disabled), ui-avatars.com
