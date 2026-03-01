# Education Module — Full Architecture Walkthrough

This document traces every click-to-database round trip for the **Education module**, which actually spans **three interconnected sub-systems**:

| Sub-system | Frontend Page | Route File | DB Schema |
|---|---|---|---|
| **Exam Results** (JSC / SSC / HSC) | `education.html` (Tab 1) | `educationRoutes.js` | `education_schema.sql` + `education_institutions.sql` |
| **University Admissions** | `admission.html` + `apply.html` | `universityRoutes.js` | `university_admission_schema.sql` |
| **Stipends & Grants** | `education.html` (Tab 3) | `stipendRoutes.js` | `stipend_schema.sql` |

---

## 1. File Map

```
public/
  education.html          ← Main portal: Exam Results tab + Stipends tab (878 lines)
  admission.html          ← Standalone admissions browsing page (853 lines)
  apply.html              ← Per-admission application + payment page (913 lines)

src/routes/
  educationRoutes.js      ← 186 lines — boards, results, years, institutions (public, no auth)
  universityRoutes.js     ← 511 lines — admissions CRUD, HSC verify, apply, SSLCommerz payment
  stipendRoutes.js        ← 96 lines  — stipend list, my-applications, apply (auth required)

src/routes/adminRoutes.js ← Lines 755-830 — Admin stipend management endpoints

src/database/
  education_schema.sql    ← 293 lines — education_boards, jsc/ssc/hsc_results + sample data
  education_institutions.sql ← 118 lines — education_institutions + 60 seed rows
  university_admission_schema.sql ← 154 lines — universities, admission_posts, university_applications
  stipend_schema.sql      ← 38 lines  — stipends table, stipend_applications + 3 seed rows
  views.sql               ← Lines 520-920 — 4 education analytics views
  stored_procedures.sql   ← Lines 387-430 — sp_check_admission_eligibility
                          ← Lines 512-556 — sp_check_stipend_eligibility

src/app.js (route mounting, lines 84-89):
  educationRoutes   → /api/education
  universityRoutes  → /api/university
  stipendRoutes     → /api/stipends
```

---

## 2. Sub-system A: Exam Results (JSC / SSC / HSC)

### 2.1 Frontend — `education.html` (Exam Results Tab)

The page uses a sidebar with three navigation items. Tab 1 ("Exam Results") is the default. Tab 2 ("Admission") redirects to `admission.html`. Tab 3 ("Stipends") shows the stipend dashboard (covered in Section 4).

**Exam Results form flow (lines 383-535):**

1. User selects **Exam Type** (JSC / SSC / HSC) from a dropdown
2. Selects **Exam Year** from a dropdown (populated on page load via `GET /api/education/years`)
3. Enters **Roll Number**
4. Clicks **"ফলাফল দেখুন" (Check Result)**

```
checkResult()   →  GET /api/education/results/{examType}/{year}/{roll}
                →  on success: renderResult(data)
                →  on 404: SweetAlert "Result not found"
```

**`renderResult()` (line 586)** builds a result card containing:
- Student info (name, roll, reg, father, mother, DOB, institution, board)
- Subject-wise grades table with colour-coded grade badges:
  - A+ → green (#27ae60)
  - A → teal (#16a085)
  - A- → olive (#6c7a28)
  - B → blue (#2980b9)
  - C → orange (#d35400)
  - D → dark red (#c0392b)
  - F → red (#e74c3c)
- Overall GPA with pass/fail badge
- Print button (triggers `window.print()`)

All styling is inline `<style>` — there is no separate CSS file for education.

### 2.2 Backend — `educationRoutes.js`

This file has **5 public endpoints** (no auth middleware):

| # | Method | Route | What it does |
|---|--------|-------|--------------|
| 1 | GET | `/boards` | `SELECT * FROM education_boards ORDER BY name` |
| 2 | GET | `/results/:examType/:year/:roll` | Dynamic table lookup → formatted JSON response |
| 3 | GET | `/years` | Queries all 3 result tables for distinct years, deduplicates via JS `Set` |
| 4 | GET | `/institutions/:boardId` | All institutions under one board |
| 5 | GET | `/institutions` | All institutions with board name via LEFT JOIN |

#### Deep Dive: `/results/:examType/:year/:roll` (lines 25-150)

This is the core endpoint. Walk-through:

1. **Validate** `examType` against `['jsc', 'ssc', 'hsc']` — returns 400 if invalid
2. **Build table name** dynamically: `` `${examType}_results` `` — **NOTE: this is vulnerable to SQL injection if validation is bypassed, but the whitelist check above prevents it**
3. **Query**: `SELECT r.*, b.name as board_name, b.code as board_code FROM {table} r LEFT JOIN education_boards b ON r.board_id = b.id WHERE r.roll_number = ? AND r.exam_year = ?`
4. **Format subjects** based on exam type:
   - **JSC**: 7 subjects (bangla, english, mathematics, general_science, bangladesh_global_studies, religion, ict)
   - **SSC**: 12 subjects (bangla_1st/2nd, english_1st/2nd, mathematics, physics, chemistry, biology, higher_math, bgs, religion, ict)
   - **HSC**: 13 subjects + optional 4th subject (physics_1st/2nd, chemistry_1st/2nd, biology_1st/2nd, higher_math_1st/2nd, ict, + optional_subject_name/grade)
5. **Filter out nulls**: `subjects.filter(s => s.grade)` — removes subjects without grades
6. **Response structure**:
```json
{
  "examType": "HSC",
  "examYear": 2024,
  "student": {
    "name": "...", "rollNumber": "...", "registrationNumber": "...",
    "fatherName": "...", "motherName": "...", "dateOfBirth": "...",
    "institution": "...", "board": "...", "group": "Science"
  },
  "subjects": [
    { "name": "বাংলা ১ম পত্র", "grade": "A+" },
    ...
  ],
  "result": { "gpa": 5.0, "status": "Passed" }
}
```

### 2.3 Database — Exam Results Tables

#### `education_boards` (11 rows)
```sql
CREATE TABLE education_boards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,         -- e.g. "Dhaka Board"
    code VARCHAR(20) UNIQUE NOT NULL,   -- e.g. "DHK"
    established_year YEAR,
    region VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
Seeded boards: Dhaka, Chittagong, Rajshahi, Jessore, Comilla, Sylhet, Dinajpur, Barisal, Mymensingh, Madrasah, Technical.

#### `jsc_results`
```sql
CREATE TABLE jsc_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll_number VARCHAR(20) NOT NULL,
    registration_number VARCHAR(30),
    exam_year YEAR NOT NULL,
    board_id INT,
    student_name VARCHAR(150) NOT NULL,
    father_name VARCHAR(150),
    mother_name VARCHAR(150),
    date_of_birth DATE,
    institution_name VARCHAR(200),
    -- 7 subject grade columns:
    bangla VARCHAR(5),
    english VARCHAR(5),
    mathematics VARCHAR(5),
    general_science VARCHAR(5),
    bangladesh_global_studies VARCHAR(5),
    religion VARCHAR(5),
    ict VARCHAR(5),
    gpa DECIMAL(3,2),
    result_status ENUM('Passed','Failed') DEFAULT 'Passed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_roll_year (roll_number, exam_year),
    INDEX idx_student (student_name),
    FOREIGN KEY (board_id) REFERENCES education_boards(id)
);
```

#### `ssc_results`
Same structure as `jsc_results` plus:
- **12 subject columns**: bangla_1st, bangla_2nd, english_1st, english_2nd, mathematics, physics, chemistry, biology, higher_math, bangladesh_global_studies, religion, ict
- **`exam_group`** column: `ENUM('Science','Commerce','Arts')`

#### `hsc_results`
Same as `ssc_results` plus:
- **Split paper subjects**: physics_1st/2nd, chemistry_1st/2nd, biology_1st/2nd, higher_math_1st/2nd
- **Optional subject**: optional_subject_name VARCHAR(100), optional_subject_grade VARCHAR(5)
- **`exam_group`**: `ENUM('Science','Commerce','Arts')`

All three tables have:
- `UNIQUE KEY (roll_number, exam_year)` — one result per roll per year
- `INDEX (student_name)` for name-based searches
- `FOREIGN KEY (board_id) → education_boards(id)`

#### `education_institutions` (≈60 rows)
```sql
CREATE TABLE education_institutions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT,
    name VARCHAR(200) NOT NULL,
    name_bn VARCHAR(200),           -- Bengali name (UTF-8mb4)
    institution_type ENUM('School','College','School & College','Madrasa','Technical') DEFAULT 'School',
    eiin VARCHAR(20),               -- Education Institute Identification Number
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES education_boards(id)
);
```

Seeded with top schools/colleges across all 11 boards, including Bengali names.

---

## 3. Sub-system B: University Admissions

### 3.1 Frontend — `admission.html`

A standalone page (Bengali language, `lang="bn"`) with:

**Header/Nav**: Logo + links to Education Portal, Admissions (active), My Applications

**Hero Section**: Bengali heading "বিশ্ববিদ্যালয় ভর্তি পোর্টাল"

**Stats Bar** (loaded via `loadStats()`):
- Total universities count
- Active admissions count
- Total applications count

All stats come from `GET /api/university/admissions` — frontend computes counts client-side.

**Filters**:
- বিশ্ববিদ্যালয়ের ধরন (University Type) — dropdown with: Public, Private, National, General, Engineering, Medical, Science & Technology, Agricultural
- Search box — filters by university_name, university_name_bn, unit_name, or unit_code

**Admissions Grid** — `renderAdmissions()` builds cards showing:
- University logo (code letters), name, location
- Unit badge (colour-coded: Science=green, Arts=purple, Commerce=orange, Engineering=blue, Medical=red)
- Info grid: min GPA, seats, fee, required group
- Deadline with days remaining (urgent styling if ≤ 7 days)
- "আবেদন করুন" (Apply) button → navigates to `apply.html?id={admissionId}`
- Details button → navigates to `apply.html?id={id}&view=details`

**My Applications View** (toggled via nav link):
- Form to enter HSC Roll + Year
- `loadMyApplications()` → `GET /api/university/my-applications/{roll}/{year}`
- Renders application cards with: university info, application ID, dates, payment/application status
- If payment pending → "পেমেন্ট সম্পন্ন করুন" button
- If paid → "প্রবেশপত্র" (Admit Card) button (shows "not published yet" alert)

**Page load flow**:
```
DOMContentLoaded
  ├── loadAdmissions()   → GET /api/university/admissions
  │     └── filterAdmissions() → renderAdmissions(filtered)
  ├── loadStats()        → GET /api/university/admissions (same call, computes counts)
  └── addEventListener('change'/'input', filterAdmissions)
```

### 3.2 Frontend — `apply.html`

A 3-step application wizard:

**Step 1 — HSC Verification**:
```
loadAdmissionDetails(id)        → GET /api/university/admissions/{id}
verifyHsc()                     → GET /api/university/verify-hsc/{roll}/{year}?admissionId={id}
```
- Displays student info grid (name, parents, roll, reg, board, group, GPA, institution)
- Shows eligibility card (green = eligible, red = not eligible with reason)
- If already applied: shows warning with existing application ID

**Step 2 — Contact Information** (shown only if eligible):
- Mobile number (validated: `/^01[3-9]\d{8}$/` — Bangladesh mobile format)
- Email (optional)
- Present address

**Step 3 — Payment**:
```
submitApplication()
  ├── POST /api/university/apply        → creates Draft application
  │     └── returns { applicationId, paymentAmount }
  └── POST /api/university/payment/init → returns { url: SSLCommerz GatewayPageURL }
        └── window.location.href = url  → redirects to payment gateway
```

**Post-payment redirect**: SSLCommerz calls back to `/api/university/payment/success`, which redirects to `apply.html?success=true&applicationId=XXX`. The page detects this via URLSearchParams and shows the success container with the application ID.

**Fallback**: If payment gateway init fails (testing mode), shows alert "পেমেন্ট গেটওয়ে সংযোগ নেই" and displays success with saved application ID.

### 3.3 Backend — `universityRoutes.js`

This file has **11 endpoints**, all public (no `verifyToken`):

| # | Method | Route | Auth | What it does |
|---|--------|-------|------|--------------|
| 1 | GET | `/admissions` | No | List admission posts with university info + filters (university, type, status) |
| 2 | GET | `/admissions/:id` | No | Single admission post detail + total paid applications count |
| 3 | GET | `/universities` | No | All active universities |
| 4 | GET | `/verify-hsc/:roll/:year` | No | Lookup HSC result + check eligibility for specific admission |
| 5 | POST | `/apply` | No | Create application (Draft) after re-verifying eligibility server-side |
| 6 | POST | `/payment/init` | No | Initialize SSLCommerz payment session |
| 7 | POST | `/payment/success` | No | SSLCommerz callback — updates status to Paid/Submitted, redirects |
| 8 | POST | `/payment/fail` | No | SSLCommerz callback — updates status to Failed, redirects |
| 9 | POST | `/payment/cancel` | No | SSLCommerz callback — redirects with cancelled flag |
| 10 | GET | `/application/:id` | No | Get single application status by application_id |
| 11 | GET | `/my-applications/:roll/:year` | No | All applications for a given HSC roll + year |

#### Deep Dive: `POST /apply` (lines 221-340)

Full server-side validation chain:

1. **Required fields check**: admissionPostId, hscRoll, hscYear, mobile → 400 if missing
2. **HSC result verification**: Queries `hsc_results` with board JOIN → 404 if not found
3. **Admission post lookup**: Queries `admission_posts` with university JOIN → 404 if not found
4. **Status check**: `admission.status !== 'Active'` → 400
5. **Deadline check**: `today > endDate` → 400
6. **GPA check**: `hsc.gpa < admission.min_gpa` → 400
7. **Group check**: `required_group !== 'Any' && hsc.exam_group !== required_group` → 400
8. **Duplicate check**: `SELECT * FROM university_applications WHERE admission_post_id = ? AND hsc_roll = ? AND hsc_year = ?` → 400
9. **Generate application ID**: `{university_code}-{unit_code}-{hsc_year}-{serial_padded_5}`
   - Example: `DU-A-2024-00001`
10. **INSERT** into `university_applications` with status = 'Draft'

#### Deep Dive: Payment Flow (lines 345-470)

```
Client                   Server                      SSLCommerz
  │                        │                            │
  ├─ POST /payment/init ──►│                            │
  │                        ├─ Lookup application ──────►│
  │                        ├─ sslcz.init(data) ────────►│
  │                        │◄─ GatewayPageURL ──────────┤
  │◄─ { url } ────────────┤                            │
  │                        │                            │
  ├─ redirect to URL ─────────────────────────────────►│
  │  (user completes payment on SSLCommerz)             │
  │                        │◄── POST /payment/success ──┤
  │                        │  body: { value_a, tran_id, val_id, card_type }
  │                        │  UPDATE payment_status='Paid', application_status='Submitted'
  │◄─── redirect /apply.html?success=true&applicationId=X ──┤
```

**SSLCommerz config**:
- `store_id`: `process.env.STORE_ID || 'testbox'`
- `store_passwd`: `process.env.STORE_PASS || 'qwerty'`
- `is_live`: `false` (hardcoded sandbox)
- Application ID passed via `value_a` field for callback identification

### 3.4 Database — Admission Tables

#### `universities` (10 rows)
```sql
CREATE TABLE universities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    name_bn VARCHAR(200),
    code VARCHAR(20) UNIQUE NOT NULL,     -- e.g. "DU", "BUET", "DMC"
    type ENUM('Public','Private','National','General','Engineering',
              'Medical','Science & Technology','Agricultural') NOT NULL,
    location VARCHAR(100),
    website VARCHAR(200),
    logo_url VARCHAR(200),
    established_year YEAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
Seeded: DU, BUET, DMC, JU, RU, CU, BAU, SUST, KU, CMC.

#### `admission_posts`
```sql
CREATE TABLE admission_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    unit_code VARCHAR(10) NOT NULL,        -- e.g. "A", "B", "C", "Engineering"
    unit_name VARCHAR(100) NOT NULL,       -- e.g. "Science Unit", "Arts Unit"
    session VARCHAR(20),
    exam_date DATE,
    min_gpa DECIMAL(3,2) NOT NULL,
    required_group ENUM('Science','Commerce','Arts','Any') DEFAULT 'Any',
    application_fee DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_seats INT,
    status ENUM('Active','Upcoming','Closed') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (university_id) REFERENCES universities(id)
);
```
Sample posts: DU (Units A/B/C/D), BUET, DMC, JU (Units A/B), SUST (Units A/B).

#### `university_applications`
```sql
CREATE TABLE university_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id VARCHAR(50) UNIQUE NOT NULL,  -- DU-A-2024-00001
    admission_post_id INT NOT NULL,
    hsc_roll VARCHAR(20) NOT NULL,
    hsc_reg VARCHAR(30),
    hsc_year YEAR NOT NULL,
    student_name VARCHAR(150),
    father_name VARCHAR(150),
    mother_name VARCHAR(150),
    date_of_birth DATE,
    hsc_gpa DECIMAL(3,2),
    hsc_group VARCHAR(20),
    hsc_board VARCHAR(100),
    hsc_institution VARCHAR(200),
    mobile VARCHAR(20),
    email VARCHAR(100),
    present_address TEXT,
    payment_amount DECIMAL(10,2),
    payment_status ENUM('Pending','Paid','Failed') DEFAULT 'Pending',
    payment_id VARCHAR(100),
    payment_date DATETIME,
    payment_method VARCHAR(50),
    application_status ENUM('Draft','Submitted','Admit Card Issued','Rejected') DEFAULT 'Draft',
    admit_card_url VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_application (admission_post_id, hsc_roll, hsc_year),
    FOREIGN KEY (admission_post_id) REFERENCES admission_posts(id)
);
```

Key constraint: `UNIQUE KEY (admission_post_id, hsc_roll, hsc_year)` — prevents duplicate applications.

---

## 4. Sub-system C: Stipends & Grants

### 4.1 Frontend — `education.html` (Stipends Tab)

Activated by clicking Tab 3 in the sidebar. Controlled by `showSection('stipend')` (line 700).

**Stipend dashboard structure**:
1. **Stats bar**: Active Grants count, My Applications count
2. **Grants grid**: Cards showing title, description, amount, type badge (Merit/Need/Disability/Research/General), min GPA, max income, deadline, "আবেদন করুন" button
3. **My Applications table**: application_no, stipend title, amount, status badge, submitted date

**Page load flow**:
```
showSection('stipend')
  └── loadStipendData()
        ├── GET /api/stipends              → renderGrants(grants)
        └── GET /api/stipends/my-applications → renderApplications(apps)
```

**Application form** — a 3-step modal:
1. **Academic Info**: exam type, roll, year, GPA, institution
2. **Financial Assessment**: monthly income, family members, land ownership
3. **Bank Details**: bank name, account number, branch, mobile banking info

```
openApplyForm(stipendId)           → shows modal
submitStipendApplication()         → POST /api/stipends/apply
  body: { stipendId, studentDetails, financialInfo, guardianInfo, bankDetails }
```

The frontend also fetches `GET /api/user/profile` to pre-fill the applicant name.

### 4.2 Backend — `stipendRoutes.js`

All endpoints require authentication (`router.use(verifyToken)` at line 6):

| # | Method | Route | What it does |
|---|--------|-------|--------------|
| 1 | GET | `/` | `SELECT * FROM available_stipends WHERE is_active = TRUE ORDER BY deadline ASC` |
| 2 | GET | `/my-applications` | User's applications via `req.user.id`, JOINed with stipend title + amount |
| 3 | POST | `/apply` | Validate + insert stipend application |

#### Deep Dive: `POST /apply` (lines 42-94)

Validation chain:

1. **Stipend exists & active**: `SELECT * FROM available_stipends WHERE id = ? AND is_active = TRUE` → 404 if not found
2. **Duplicate check**: `SELECT id FROM stipends_applications WHERE user_id = ? AND stipend_id = ?` → 400 if already applied
3. **GPA eligibility**: `studentDetails.gpa < grant.min_gpa` → 400 with required GPA
4. **Income eligibility**: `financialInfo.monthlyIncome > grant.max_income` → 400 if exceeds limit
5. **Generate application number**: `STP-{timestamp_base36}-{userId}` (e.g., `STP-M3K1G2A-42`)
6. **INSERT** with JSON columns for student_details, financial_info, guardian_info, bank_details

### 4.3 Admin Endpoints — `adminRoutes.js` (lines 755-830)

Mounted at `/api/admin` (managed in admin middleware):

| # | Method | Route | What it does |
|---|--------|-------|--------------|
| 1 | GET | `/stipends` | All stipends (including inactive), ordered by created_at DESC |
| 2 | POST | `/stipends` | Create new stipend → `INSERT INTO available_stipends (...)` |
| 3 | GET | `/stipend-applications` | All applications with student name/NID via JOIN on reg_info |
| 4 | PUT | `/stipend-applications/:id/status` | Update application status (Approved / Rejected) |

### 4.4 Database — Stipend Tables

#### `stipends` (schema) / `available_stipends` (code references)

**⚠ BUG: Table name mismatch** — `stipend_schema.sql` creates `stipends`, but all route files query `available_stipends`. Either:
- The schema file is outdated and the actual production table is `available_stipends`, or
- There's a view or alias not captured in the schema files

```sql
-- Schema says:
CREATE TABLE IF NOT EXISTS stipends (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    type ENUM('Merit', 'Need', 'Disability', 'Research', 'General') NOT NULL,
    min_gpa FLOAT DEFAULT 0,
    max_income DECIMAL(15, 2) DEFAULT NULL,
    deadline DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- But routes query: available_stipends
```

#### `stipend_applications` (schema) / `stipends_applications` (code references)

**⚠ BUG: Second table name mismatch** — Schema creates `stipend_applications` but routes query `stipends_applications`.

```sql
-- Schema says:
CREATE TABLE IF NOT EXISTS stipend_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stipend_id INT NOT NULL,
    application_no VARCHAR(50) UNIQUE NOT NULL,
    student_details JSON,
    financial_info JSON,
    guardian_info JSON,
    bank_details JSON,
    status ENUM('Draft','Submitted','Under Review','Approved','Rejected') DEFAULT 'Draft',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (stipend_id) REFERENCES stipends(id)
);

-- But routes query: stipends_applications
```

Seed data: 3 stipends (PM's Education Trust ৳5000, Excellence in Science ৳10000, Research Grant ৳25000).

---

## 5. Stored Procedures

### `sp_check_admission_eligibility` (stored_procedures.sql, lines 391-430)

```sql
CREATE PROCEDURE sp_check_admission_eligibility(
    IN p_hsc_roll VARCHAR(20),
    IN p_hsc_year YEAR,
    IN p_admission_post_id INT,
    OUT p_eligible BOOLEAN,
    OUT p_reason VARCHAR(255)
)
```

Logic:
1. Fetch GPA + group from `hsc_results` by roll/year
2. If not found → eligible = FALSE, "HSC result not found"
3. Fetch min_gpa + required_group from `admission_posts` by ID
4. If GPA < min_gpa → FALSE with reason
5. If required_group ≠ 'Any' AND group doesn't match → FALSE with reason
6. Otherwise → TRUE, "Eligible for admission."

**Note**: This procedure exists in the database but is **not called** by `universityRoutes.js` — the route implements identical logic inline (lines 241-282). The procedure is available for direct DB use or admin tools.

### `sp_check_stipend_eligibility` (stored_procedures.sql, lines 516-556)

```sql
CREATE PROCEDURE sp_check_stipend_eligibility(
    IN p_user_id INT,
    IN p_stipend_id INT,
    IN p_gpa DECIMAL(3,2),
    IN p_monthly_income DECIMAL(15,2),
    OUT p_eligible BOOLEAN,
    OUT p_reason VARCHAR(255)
)
```

Logic:
1. Fetch min_gpa, max_income, is_active, deadline from `available_stipends`
2. If inactive → FALSE
3. If deadline passed → FALSE
4. If already applied (check `stipends_applications`) → FALSE
5. If GPA < min_gpa → FALSE
6. If income > max_income → FALSE
7. Otherwise → TRUE

**Note**: Also not called by `stipendRoutes.js` — the route performs similar checks inline (lines 47-69), but the route **omits the deadline check** that the stored procedure includes.

---

## 6. Database Views (views.sql, lines 520-920)

Four analytics views for the education board system:

### `v_education_yearly_analysis` (VIEW 11)
Aggregated yearly statistics for JSC/SSC/HSC via UNION ALL:
- Total students, passed/failed counts, pass rate, fail rate
- GPA statistics (avg, max, min)
- GPA distribution: 5.0 count, 4.0+ count, 3.0+ count, below 3.0 count
- Year-over-year comparison flag

### `v_education_board_analysis` (VIEW 12)
Board-wise breakdown per exam type per year:
- Students, pass rate, GPA stats per board
- Golden GPA (5.00) count and rate
- Performance category (Excellent / Very Good / Good / Average / Below Average)
- Board ranking via `RANK() OVER (PARTITION BY exam_year ORDER BY AVG(gpa) DESC)`

### `v_education_institution_analysis` (VIEW 13)
Per-institution, per-board, per-year performance:
- Pass rate, GPA stats, golden GPA rate
- Achiever breakdown: high (≥4.5), mid (3.5-4.49), average (2.5-3.49)
- Institution tier: Tier 1 (Elite) through Tier 5 (Needs Improvement)
- Institution rank within board via `RANK() OVER (PARTITION BY exam_year, board_id ORDER BY AVG(gpa) DESC)`

### `v_education_top_performers` (VIEW 14)
Lists all GPA 5.00 achievers across JSC/SSC/HSC:
- Student info + board + institution
- Achievement badge: "Golden A+"

---

## 7. Complete API Endpoint Map

### Education Routes (`/api/education`)
| Method | Full Path | Auth | Purpose |
|--------|-----------|------|---------|
| GET | `/api/education/boards` | None | List all 11 education boards |
| GET | `/api/education/results/:examType/:year/:roll` | None | Check exam result |
| GET | `/api/education/years` | None | Available exam years |
| GET | `/api/education/institutions/:boardId` | None | Institutions under a board |
| GET | `/api/education/institutions` | None | All institutions with board names |

### University Routes (`/api/university`)
| Method | Full Path | Auth | Purpose |
|--------|-----------|------|---------|
| GET | `/api/university/admissions` | None | Browse admission posts (filterable) |
| GET | `/api/university/admissions/:id` | None | Single admission detail |
| GET | `/api/university/universities` | None | Active universities list |
| GET | `/api/university/verify-hsc/:roll/:year` | None | Verify HSC + check eligibility |
| POST | `/api/university/apply` | None | Create admission application |
| POST | `/api/university/payment/init` | None | Start SSLCommerz payment |
| POST | `/api/university/payment/success` | None | SSLCommerz success callback |
| POST | `/api/university/payment/fail` | None | SSLCommerz failure callback |
| POST | `/api/university/payment/cancel` | None | SSLCommerz cancel callback |
| GET | `/api/university/application/:id` | None | Application status lookup |
| GET | `/api/university/my-applications/:roll/:year` | None | All apps for HSC roll/year |

### Stipend Routes (`/api/stipends`)
| Method | Full Path | Auth | Purpose |
|--------|-----------|------|---------|
| GET | `/api/stipends` | JWT | Active stipends list |
| GET | `/api/stipends/my-applications` | JWT | Current user's applications |
| POST | `/api/stipends/apply` | JWT | Submit stipend application |

### Admin Routes (`/api/admin`)
| Method | Full Path | Auth | Purpose |
|--------|-----------|------|---------|
| GET | `/api/admin/stipends` | Admin | All stipends (admin view) |
| POST | `/api/admin/stipends` | Admin | Create new stipend |
| GET | `/api/admin/stipend-applications` | Admin | All stipend applications |
| PUT | `/api/admin/stipend-applications/:id/status` | Admin | Approve/reject application |

**Total: 23 endpoints** across 4 route files.

---

## 8. Visual Flow Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                       education.html                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Exam Results │  │  Admission  │  │  Stipends   │             │
│  │   (Tab 1)   │  │   (Tab 2)   │  │   (Tab 3)   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                 │                     │
│    checkResult()    redirect to       loadStipendData()          │
│         │          admission.html         │                      │
│         ▼                │           ┌────┴────┐                 │
│  GET /api/education      │      GET /api/      GET /api/         │
│  /results/{t}/{y}/{r}    │      stipends       stipends/         │
│         │                │           │         my-applications   │
│         ▼                │           ▼              │             │
│  renderResult()          │     renderGrants()  renderApps()      │
│  (grade cards,           │     (grant cards)   (history table)   │
│   GPA badge,             │           │                           │
│   print button)          │     openApplyForm() → POST /apply     │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │       admission.html          │
            │  ┌───────────────────────┐   │
            │  │ Filter & Browse Grid  │   │
            │  │ GET /api/university/   │   │
            │  │      admissions       │   │
            │  └───────────┬───────────┘   │
            │              │               │
            │     "আবেদন করুন" click       │
            │              │               │
            │  ┌───────────────────────┐   │
            │  │   My Applications     │   │
            │  │ GET /my-applications/ │   │
            │  │     {roll}/{year}     │   │
            │  └───────────────────────┘   │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │        apply.html             │
            │                              │
            │  Step 1: HSC Verify          │
            │  GET /verify-hsc/{r}/{y}     │
            │         │                    │
            │  Step 2: Contact Info        │
            │         │                    │
            │  Step 3: Payment             │
            │  POST /apply                 │
            │  POST /payment/init          │
            │         │                    │
            │    ┌────▼────┐               │
            │    │SSLCommerz│               │
            │    │ Gateway  │               │
            │    └────┬────┘               │
            │         │                    │
            │  POST /payment/success       │
            │  redirect → ?success=true    │
            │         │                    │
            │  ✅ Success Screen           │
            └──────────────────────────────┘
```

---

## 9. Database Relationship Diagram

```
education_boards (11)
    │
    ├── 1:N → jsc_results (board_id FK)
    ├── 1:N → ssc_results (board_id FK)
    ├── 1:N → hsc_results (board_id FK)
    └── 1:N → education_institutions (board_id FK)

universities (10)
    │
    └── 1:N → admission_posts (university_id FK)
                    │
                    └── 1:N → university_applications (admission_post_id FK)
                                    │
                                    └── Links to hsc_results via hsc_roll + hsc_year
                                        (no formal FK — lookup at application time)

stipends / available_stipends (3)
    │
    └── 1:N → stipend_applications / stipends_applications (stipend_id FK)
                    │
                    └── user_id → reg_info.id (no formal FK in schema file)
```

---

## 10. Known Issues & Design Notes

### 🔴 Critical Bugs

1. **Stipend Table Name Mismatch**: Schema file creates `stipends` but all routes query `available_stipends`. Similarly, schema creates `stipend_applications` but routes query `stipends_applications`. The app will crash with "Table doesn't exist" unless the actual DB tables were renamed from what the schema file shows, or there's an additional migration not in the repo.

2. **No Auth on University Endpoints**: All 11 endpoints in `universityRoutes.js` are fully public — anyone can submit applications without authentication. The `POST /apply` endpoint doesn't require a logged-in user, meaning anyone could submit applications if they know a valid HSC roll number.

### 🟡 Security Concerns

3. **SSLCommerz Sandbox Hardcoded**: `is_live = false` is hardcoded at line ~380 of `universityRoutes.js`. Payment will silently use sandbox mode even in production. Store credentials are also hardcoded as fallbacks (`testbox` / `qwerty`).

4. **No Payment Verification**: The `/payment/success` callback trusts SSLCommerz POST data without calling SSLCommerz's validation API to verify the transaction is genuine. An attacker could POST fake data to `/api/university/payment/success` with a valid `value_a` (application ID) to mark any application as "Paid" without actually paying.

5. **HSC Data Publicly Accessible**: `GET /api/university/verify-hsc/:roll/:year` returns full student information (name, parents, DOB, institution, GPA) with no auth. Anyone can enumerate students by iterating roll numbers.

### 🟡 Logic Gaps

6. **Stored Procedures Not Used**: Both `sp_check_admission_eligibility` and `sp_check_stipend_eligibility` exist in the database but are never called by the application routes. The routes duplicate the same logic inline. This creates maintenance risk — if eligibility rules change, both the route code and the stored procedure need updating.

7. **Stipend `POST /apply` Skips Deadline Check**: The route checks active status, duplicate application, GPA, and income — but does **not** check if the stipend deadline has passed. The stored procedure `sp_check_stipend_eligibility` includes this check, but it's not called. Users can apply to expired stipends.

8. **Admission Stats Double-Fetch**: `admission.html` calls `GET /api/university/admissions` twice on page load — once in `loadAdmissions()` and once in `loadStats()`. Both call the same endpoint. The stats could be computed from the first response.

9. **Application `status` Column**: The stipend `POST /apply` route inserts with `status = 'Pending'` but the schema defines the default as `'Draft'` and the ENUM includes `'Submitted'`. The status values are inconsistent between insertion and schema.

### 🔵 Design Decisions

10. **No Formal FK Between Applications and Users**: `university_applications` identifies students via `hsc_roll` + `hsc_year` rather than a `user_id`. This means the same person can apply from different devices/sessions without needing to be logged in. Stipend applications do have `user_id` (via JWT).

11. **HSC Snapshot Architecture**: When a university application is created, all HSC data (name, parents, GPA, group, board, institution) is copied into `university_applications`. This is a denormalization snapshot — if HSC data is corrected later, existing applications retain the old values. This is intentional for auditability.

12. **Bengali Language UI**: `admission.html` and `apply.html` use `lang="bn"` with Hind Siliguri font and Bengali text throughout. `education.html` uses a mix of Bengali and English. Date formatting uses `bn-BD` locale.

13. **No Pagination**: All list endpoints return full result sets with no `LIMIT/OFFSET` support. As the data grows, `GET /api/university/admissions` and the views will become increasingly slow.

14. **JSON Storage for Stipend Applications**: Student details, financial info, guardian info, and bank details are stored as JSON blobs. This makes querying/reporting on individual fields (e.g., "all applicants with income below 20000") require `JSON_EXTRACT` queries.
