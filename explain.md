# Land Ministry — Full Architecture Walkthrough (Frontend → Backend → Database)

---

## 1. HIGH-LEVEL OVERVIEW

The Land Ministry module lets citizens:
1. **View land information** (Overview tab)
2. **Add/manage land records** (My Records tab)
3. **Apply for land mutation** (transfer ownership from seller to buyer) (Mutation tab)
4. **Pay land development tax** (Land Tax tab)

### File Map

| Layer | File |
|---|---|
| Frontend HTML | `public/land.html` |
| Frontend CSS | `public/css/land.css` |
| Backend Routes (Land) | `src/routes/departmentRoutes.js` (lines 99–350) |
| Backend Routes (Tax Payment) | `src/routes/paymentRoutes.js` |
| Route Mounting | `src/app.js` (lines 74–77) |
| Database Schema | `src/database/land_mutation_schema.sql` |
| Database Trigger | `src/database/land_mutation_trigger.sql` |
| Database Views | `src/database/views.sql` (views `v_land_by_location`, `v_user_land_details`) |
| Stored Procedures | `src/database/stored_procedures.sql` (`sp_calculate_land_tax`, `sp_process_land_mutation`) |

---

## 2. FRONTEND — `public/land.html`

The page is a **single-page app with 4 tabs**, switched via JavaScript.

### Tab Navigation — `switchTab()` function (line ~973)

```js
function switchTab(e, el, tabName) {
    // Hides all sections, shows the selected one
    ['overview', 'mutation', 'records', 'tax'].forEach(sec => {
        document.getElementById(sec + '-section').style.display = 'none';
    });
    document.getElementById(tabName + '-section').style.display = 'block';
}
```

The sidebar has 4 navigation links:
- **Overview** → `#overview-section`
- **My Records** → `#records-section`
- **Mutation** → `#mutation-section`
- **Land Tax** → `#tax-section`

### Authentication Check (line ~960)

```js
const token = localStorage.getItem('token')...;
if (!token) window.location.href = 'index.html';  // Redirect to login
```

Every API call includes `Authorization: Bearer ${token}` header for JWT authentication.

### CSS Styling — `public/css/land.css`

The CSS file defines a **Bangladesh-themed dark design** with:
- Custom color variables: `--land-primary: #0d9488` (teal), `--land-gold: #d97706` (gold), `--land-emerald: #10b981`
- Glassmorphism card effects (`backdrop-filter: blur(20px)`)
- Animated background shapes (floating gradient blobs)
- Dark sidebar with teal accents and gold active borders
- Responsive grid layouts for all sections
- Custom SweetAlert2 popup styling to match the dark theme
- Modal slide-in animations

---

## 3. TAB-BY-TAB: Frontend → API → Backend → Database

---

### TAB A: OVERVIEW (`#overview-section`)

**What it shows:** Static info cards (Laws & Notices, Emergency Contacts) + Recent applications list.

**Dynamic data — `loadLandData()` (line ~1211):**

```
Frontend: fetch('/api/departments/land/applications')
       → Backend: departmentRoutes.js line 243
       → SQL: SELECT id, khatian_no, status, created_at 
              FROM land_mutations_v2 WHERE user_id = ? 
              ORDER BY created_at DESC LIMIT 5
       → Returns recent 5 mutation applications for the logged-in user
```

**Static content includes:**
- Land Development Tax Act 2023 (rules card)
- Mutation (Namjari) Guidelines (fee: 1,170 BDT)
- Digital Land Services (E-Khatian, Online Review, Mortgage Verify)
- Land Service Hotline: 16122
- Divisional Office contacts (Dhaka, Chattogram, Rajshahi, Khulna)

---

### TAB B: MY RECORDS (`#records-section`)

#### B1. Loading Records — `loadMyRecords()` (line ~984)

**Flow:**

```
Frontend: fetch('/api/departments/land/records')  [GET]
       ↓
Backend: departmentRoutes.js line 261
       ↓
SQL (2 queries merged):

  Query 1 — Manually added records:
    SELECT lr.*, d.name as division, dist.name as district, u.name as upazila
    FROM my_land_record lr
    LEFT JOIN divisions d ON lr.division_id = d.id
    LEFT JOIN districts dist ON lr.district_id = dist.id
    LEFT JOIN upazilas u ON lr.upazila_id = u.id
    WHERE lr.user_id = ?
            
  Query 2 — Auto-acquired via approved mutations:
    SELECT m.khatian_no, m.dag_no, m.land_amount as land_size...
    FROM land_mutations_v2 m
    WHERE m.buyer_nid = ? AND m.status = 'Approved'
       ↓
Backend merges both arrays (deduplicates by khatian+dag key)
       ↓
Frontend renders table rows in #recordsList tbody
```

This means records come from **two sources**:
1. **Manually added** records (from `my_land_record` table)
2. **Auto-added** records when a mutation is approved (buyer receives land automatically via trigger)

#### B2. Adding a New Record — `submitNewRecord()` (line ~1105)

When user clicks **"Add New Record"**, a modal opens with a form.

**Cascading Location Dropdowns Flow:**

```
User opens modal → loadAddRecordDivisions():
  → fetch('/api/departments/locations/divisions')
  → SQL: SELECT * FROM divisions ORDER BY name
  → Populates division dropdown

User selects a Division → onChange triggers loadAddRecordDistricts():
  → fetch('/api/departments/locations/districts/{divId}')
  → SQL: SELECT * FROM districts WHERE division_id = ? ORDER BY name
  → Populates district dropdown

User selects a District → onChange triggers loadAddRecordUpazilas():
  → fetch('/api/departments/locations/upazilas/{distId}')
  → SQL: SELECT * FROM upazilas WHERE district_id = ? ORDER BY name
  → Populates upazila dropdown
```

**Form Submission Flow:**

```
Frontend: fetch('/api/departments/land/records')  [POST]
  body: { division_id, district_id, upazila_id, khatian, dag, mouza, 
          land_size, deed_no, land_price, description, nid }
       ↓
Backend: departmentRoutes.js line 296
       ↓
Step 1 — Verification against official records: 
  SQL: SELECT status FROM land_mutations_v2 WHERE khatian_no = ? AND buyer_nid = ?
  → If match found & status='Approved' → verificationStatus = 'Approved'
  → Otherwise → verificationStatus = 'Pending'
       ↓
Step 2 — Insert into database (3NF — Foreign Keys only, no redundant text):
  SQL: INSERT INTO my_land_record 
       (user_id, division_id, district_id, upazila_id, khatian_no, dag_no, mouza, 
        land_size, deed_no, land_price, ownership_description, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ↓
Returns: { success: true, status: 'Approved' or 'Pending' }
```

---

### TAB C: MUTATION (`#mutation-section`)

This is the **core feature** — transferring land ownership from one person (seller) to another (buyer).

#### C1. Mutation Page Layout

The mutation section has:
- **Top Header** — Logo, date, profile button
- **Hero Section** — Welcome message with landscape SVG art and tree icons
- **Two Buttons** — "New Application" (opens form modal) and "Check Application Status" (scrolls to search)
- **Search Bar** — Division dropdown + Tracking Number input to check application status

#### C2. Apply for Mutation — `applyMutationPopup()` → `submitMutation()` (line ~1340)

The modal form collects:
- **Location:** Division / District / Upazila (cascading dropdowns)
- **Applicant (Seller) NID**
- **Land Details:** Khatian No, Dag No, Deed No, Land Amount, Price, Ownership Type
- **Buyer NID**

**Auto-fill from records:** The `loadRecordsToMutation()` function pre-loads the user's Approved land records into a dropdown. When selected, `fillMutationFormFromRecord()` auto-fills form fields (khatian, dag, deed, amount, price) and makes khatian/dag read-only for security.

**Submission Flow:**

```
Frontend: fetch('/api/departments/land/mutation_v2')  [POST]
  body: { divId, distId, upaId, appNid, buyerNid, khatian, dag, amount, price, deed, ownType }
       ↓
Backend: departmentRoutes.js line 125
       ↓
Step 1 — Validate Applicant (Seller) NID:
  SQL: SELECT id FROM reg_info WHERE nid = ?    (appNid)
  → If not found → 400 error "Applicant NID not found in system registration."

Step 2 — Validate Buyer NID + get buyer_id:
  SQL: SELECT id FROM reg_info WHERE nid = ?    (buyerNid)
  → If not found → 400 error "Buyer NID not found in system registration."

Step 3 — Verify Ownership (seller must own this land):
  SQL: SELECT id FROM my_land_record 
       WHERE user_id = ? AND khatian_no = ? AND dag_no = ? AND status = 'Approved'
  → If not found → 403 error "You can only sell Verified Land from your records."

Step 4 — Generate Tracking Number:
  trackingNum = "LMT-2026-XXXX" (random 4-digit suffix)

Step 5 — Insert Mutation Record:
  SQL: INSERT INTO land_mutations_v2 
       (user_id, division_id, district_id, upazila_id, khatian_no, dag_no, 
        land_amount, land_price, deed_no, ownership_type, buyer_nid, buyer_id, tracking_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

Step 6 — Create Notification + Service Request Log:
  SQL: INSERT INTO notifications (user_id, message) VALUES (?, ?)
  SQL: INSERT INTO service_requests (user_id, service_type, details, status, notification_read) 
       VALUES (?, 'Land Mutation', '...', 'Pending', false)
       ↓
Returns: { success: true, trackingNumber: "LMT-2026-XXXX" }
       ↓
Frontend shows SweetAlert2 success popup with the tracking number
```

#### C3. Check Status — `checkStatus()` (line ~1244)

```
Frontend: fetch('/api/departments/land/mutation/status/{trackingNum}')  [GET]
       ↓
Backend: departmentRoutes.js line 199
       ↓
SQL: SELECT * FROM land_mutations_v2 WHERE tracking_number = ?
       ↓
Returns the full mutation row (status, applicant_name, land_amount, tracking_number, created_at)
       ↓
Frontend shows SweetAlert2 popup with color-coded status:
  - Pending → yellow (#fbbf24)
  - Approved → green (#34d399) 
  - Rejected → red (#f87171)
```

---

### TAB D: LAND TAX (`#tax-section`)

#### Tax Calculation (Client-side) — `calculateTax()` (line ~881)

```js
if (type === 'Residential') tax = size * 10;       // 10 BDT per decimal
else if (type === 'Commercial') tax = size * 20;    // 20 BDT per decimal
else if (type === 'Agricultural') {
    if (size > 825) tax = size * 2;   // Only taxed if > 25 bighas (≈825 decimals)
    else tax = 0;                      // Tax free for small agricultural land
}
```

#### Auto-fill from Records

The `loadRecordsToTax()` function loads the user's Approved land records into a dropdown. When selected, `fillTaxFormFromRecord()` auto-fills khatian_no, dag_no, and land_size fields.

#### Payment Flow — `initiateTaxPayment()` (line ~893)

```
Frontend: fetch('/api/payment/land/tax/init')  [POST]
  body: { nid, mobile, division_id, district_id, upazila_id, 
          khatian_no, dag_no, land_type, land_size, tax_amount }
       ↓
Backend: paymentRoutes.js line 12
       ↓
Step 1 — Get user from NID:
  SQL: SELECT id, name FROM reg_info WHERE nid = ?

Step 2 — Generate transaction ID:
  transaction_id = "LTAX_" + timestamp + random string

Step 3 — Save tax record to database:
  SQL: INSERT INTO landtax 
       (transaction_id, user_id, nid, mobile, division_id, district_id, upazila_id,
        khatian_no, dag_no, land_type, land_size, tax_amount, payment_status, payment_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())

Step 4 — Initialize SSLCommerz Payment Gateway:
  → Sends payment data (amount, currency, customer info) to SSLCommerz API
  → SSLCommerz returns GatewayPageURL
       ↓
Returns: { url: GatewayPageURL }
       ↓
Frontend: window.location.href = GatewayPageURL   (redirects user to SSLCommerz payment page)
       ↓
After Payment completes, SSLCommerz calls back:

  SUCCESS → POST /api/payment/land/tax/success/:tran_id
    SQL: UPDATE landtax SET payment_status = 'Success' WHERE transaction_id = ?
    → Redirects browser to: /land.html?status=success&tid=LTAX_xxx

  FAIL → POST /api/payment/land/tax/fail/:tran_id
    SQL: UPDATE landtax SET payment_status = 'Failed' WHERE transaction_id = ?
    → Redirects browser to: /land.html?status=fail&tid=LTAX_xxx
```

---

## 4. DATABASE LAYER

### Tables Used

| Table | Purpose |
|---|---|
| `land_mutations_v2` | Stores all mutation applications (seller→buyer transfer requests) |
| `my_land_record` | Stores manually-added and auto-added land ownership records |
| `landtax` | Stores land tax payment records |
| `divisions` | 8 divisions of Bangladesh |
| `districts` | Districts (FK → divisions) |
| `upazilas` | Upazilas/Subdistricts (FK → districts) |
| `reg_info` | User registration table (NID-based lookup) |
| `notifications` | System notifications for users |
| `service_requests` | Logs of all service activities |

### `land_mutations_v2` Schema — `src/database/land_mutation_schema.sql`

```sql
CREATE TABLE IF NOT EXISTS land_mutations_v2 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,                    -- seller's user ID (FK → reg_info)
    division_id INT,                         -- FK → divisions
    district_id INT,                         -- FK → districts
    upazila_id INT,                          -- FK → upazilas
    applicant_name VARCHAR(255),             -- seller name
    applicant_father VARCHAR(255),
    applicant_mother VARCHAR(255),
    applicant_nid VARCHAR(50),               -- seller NID
    khatian_no VARCHAR(50),                  -- land register number
    dag_no VARCHAR(50),                      -- land plot number
    land_amount DECIMAL(10, 2),              -- land size in decimals
    land_price DECIMAL(15, 2),               -- estimated market price
    deed_no VARCHAR(100),                    -- legal deed number
    ownership_type VARCHAR(50),              -- 'Own' or 'Other/Inherited'
    buyer_name VARCHAR(255),
    buyer_nid VARCHAR(50),                   -- buyer's NID
    buyer_father_name VARCHAR(255),
    buyer_mother_name VARCHAR(255),
    tracking_number VARCHAR(50) UNIQUE,      -- "LMT-2026-XXXX" format
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES reg_info(id)
);
```

**Key design points:**
- Uses **3NF (Third Normal Form)** — location stored as foreign key IDs, not text names
- `tracking_number` is UNIQUE — used to identify applications
- `status` is an ENUM with 3 values — controlled vocabulary
- `user_id` is the seller, `buyer_nid`/`buyer_id` identifies the buyer

---

### Trigger: `after_mutation_approval` — `src/database/land_mutation_trigger.sql`

This is the **most critical piece** — it fires automatically when an admin approves a mutation:

```sql
CREATE TRIGGER after_mutation_approval
AFTER UPDATE ON land_mutations_v2
FOR EACH ROW
BEGIN
    -- Only fires when status changes TO 'Approved'
    IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
        
        -- ACTION 1: Give land to the BUYER
        INSERT INTO my_land_record 
            (user_id, division_id, district_id, upazila_id, khatian_no, dag_no, 
             mouza, land_size, deed_no, land_price, ownership_description, status)
        VALUES 
            (buyer_user_id, NEW.division_id, NEW.district_id, NEW.upazila_id, 
             NEW.khatian_no, NEW.dag_no, 'Mutation Transfer', NEW.land_amount, 
             NEW.deed_no, NEW.land_price, 
             CONCAT('Purchased via Mutation (Tracking: ', NEW.tracking_number, ')'), 
             'Approved');
        
        -- ACTION 2: Remove/reduce land from the SELLER
        IF full_transfer THEN
            DELETE FROM my_land_record WHERE id = seller_record_id;
        ELSE
            UPDATE my_land_record 
            SET land_size = seller_current_size - NEW.land_amount 
            WHERE id = seller_record_id;
        END IF;
        
        -- ACTION 3: Update service request status
        UPDATE service_requests 
        SET status = 'approved' 
        WHERE details LIKE CONCAT('%', NEW.tracking_number, '%');
        
    END IF;
END
```

**What happens when admin clicks "Approve":**
1. **Buyer gets a new record** in `my_land_record` (auto-created with 'Approved' status)
2. **Seller's record is updated** — if ALL land was sold, the row is DELETED; if partial, land_size is reduced
3. **Service request** matching the tracking number is marked 'approved'

This is a **fully automatic ownership transfer** — no manual intervention needed after approval.

---

### Stored Procedures — `src/database/stored_procedures.sql`

#### `sp_calculate_land_tax` — Tax Calculation

```sql
CREATE PROCEDURE sp_calculate_land_tax(
    IN p_land_type VARCHAR(50),
    IN p_land_size_decimal DECIMAL(10,2),
    OUT p_tax_amount DECIMAL(15,2)
)
BEGIN
    DECLARE v_rate DECIMAL(10,2);

    SET v_rate = CASE p_land_type
        WHEN 'Agricultural' THEN 2.50       -- 2.50 BDT/decimal
        WHEN 'Residential' THEN 15.00       -- 15.00 BDT/decimal
        WHEN 'Commercial' THEN 50.00        -- 50.00 BDT/decimal
        WHEN 'Industrial' THEN 75.00        -- 75.00 BDT/decimal
        WHEN 'Pond/Water Body' THEN 5.00    -- 5.00 BDT/decimal
        ELSE 10.00                          -- Default rate
    END;

    SET p_tax_amount = p_land_size_decimal * v_rate;

    -- Minimum tax 50 BDT
    IF p_tax_amount < 50 THEN
        SET p_tax_amount = 50;
    END IF;
END
```

#### `sp_process_land_mutation` — Admin Mutation Processing

```sql
CREATE PROCEDURE sp_process_land_mutation(
    IN p_mutation_id INT,
    IN p_action ENUM('Approved', 'Rejected'),
    IN p_admin_id INT
)
BEGIN
    -- Get mutation details
    SELECT user_id, tracking_number INTO v_user_id, v_tracking
    FROM land_mutations_v2 WHERE id = p_mutation_id;

    -- Update status (this triggers the after_mutation_approval trigger if Approved!)
    UPDATE land_mutations_v2 SET status = p_action WHERE id = p_mutation_id;

    -- Notify the user
    INSERT INTO notifications (user_id, message, type)
    VALUES (v_user_id, CONCAT('Land Mutation ', p_action, ': ...'), 
            IF(p_action = 'Approved', 'success', 'error'));

    -- Log admin action for audit trail
    INSERT INTO admin_actions_log (admin_id, action_type, target_table, target_id, new_status, notes)
    VALUES (p_admin_id, 'status_update', 'land_mutations_v2', p_mutation_id, p_action, ...);
END
```

**Important:** When this procedure sets `status = 'Approved'`, it *triggers* the `after_mutation_approval` trigger, which then auto-transfers the land.

---

### Database Views — `src/database/views.sql`

#### `v_land_by_location` — Geographic Land Report

```sql
CREATE OR REPLACE VIEW v_land_by_location AS
SELECT 
    d.name AS division, dist.name AS district, up.name AS upazila,
    COUNT(l.id) AS total_parcels,
    SUM(CASE WHEN l.status = 'Approved' THEN 1 ELSE 0 END) AS approved_parcels,
    SUM(CASE WHEN l.status = 'Pending' THEN 1 ELSE 0 END) AS pending_parcels,
    COALESCE(SUM(l.land_size), 0) AS total_land_area,
    COALESCE(SUM(l.land_price), 0) AS total_valuation,
    COALESCE(AVG(l.land_price), 0) AS avg_parcel_value
FROM divisions d
LEFT JOIN districts dist ON d.id = dist.division_id
LEFT JOIN upazilas up ON dist.id = up.district_id
LEFT JOIN my_land_record l ON up.id = l.upazila_id
GROUP BY d.id, dist.id, up.id
HAVING total_parcels > 0;
```

Used in the **Reports** page (`/api/reports/land-by-location`) for geographic analysis of land distribution.

#### `v_user_land_details` — Per-User Land Summary

```sql
CREATE OR REPLACE VIEW v_user_land_details AS
SELECT 
    u.name AS owner_name, u.nid AS owner_nid,
    COUNT(l.id) AS total_land_parcels,
    COALESCE(SUM(l.land_size), 0) AS total_land_area,
    COALESCE(SUM(l.land_price), 0) AS total_land_value,
    SUM(CASE WHEN l.status = 'Approved' THEN 1 ELSE 0 END) AS approved_parcels,
    GROUP_CONCAT(DISTINCT d.name SEPARATOR ', ') AS divisions_owned,
    GROUP_CONCAT(DISTINCT l.khatian_no SEPARATOR ', ') AS khatian_numbers
FROM reg_info u
LEFT JOIN my_land_record l ON u.id = l.user_id
LEFT JOIN divisions d ON l.division_id = d.id
GROUP BY u.id
HAVING COUNT(l.id) > 0
ORDER BY total_land_area DESC;
```

Used in the **Reports** page (`/api/reports/user-land-details`) for per-user land holdings analysis.

---

## 5. ROUTE MOUNTING — `src/app.js`

```js
// Line 74-75: Land routes (mutation, records, locations)
const departmentRoutes = require('./routes/departmentRoutes');
app.use('/api/departments', departmentRoutes);

// Line 76-77: Payment routes (tax payment via SSLCommerz)
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payment', paymentRoutes);
```

So:
- `/api/departments/land/*` → handled by `departmentRoutes.js`
- `/api/departments/locations/*` → also handled by `departmentRoutes.js`
- `/api/payment/land/*` → handled by `paymentRoutes.js`

---

## 6. COMPLETE API ENDPOINT MAP

| Method | Endpoint | File:Line | Purpose |
|---|---|---|---|
| GET | `/api/departments/locations/divisions` | departmentRoutes.js:103 | Get all 8 divisions |
| GET | `/api/departments/locations/districts/:divId` | departmentRoutes.js:110 | Get districts in a division |
| GET | `/api/departments/locations/upazilas/:distId` | departmentRoutes.js:117 | Get upazilas in a district |
| POST | `/api/departments/land/mutation_v2` | departmentRoutes.js:125 | Submit mutation application |
| GET | `/api/departments/land/mutation/status/:trackingNum` | departmentRoutes.js:199 | Check mutation status by tracking # |
| GET | `/api/departments/land/applications` | departmentRoutes.js:243 | Get user's recent 5 mutations |
| GET | `/api/departments/land/records` | departmentRoutes.js:261 | Get user's land records (merged) |
| POST | `/api/departments/land/records` | departmentRoutes.js:296 | Add new land record (with verification) |
| POST | `/api/payment/land/tax/init` | paymentRoutes.js:12 | Initiate SSLCommerz tax payment |
| POST | `/api/payment/land/tax/success/:tran_id` | paymentRoutes.js:92 | Payment success callback |
| POST | `/api/payment/land/tax/fail/:tran_id` | paymentRoutes.js:104 | Payment failure callback |

---

## 7. VISUAL FLOW SUMMARY

```
User opens land.html
  ├── Auth check (JWT token in localStorage)
  │
  ├── [Overview Tab] → GET /land/applications → land_mutations_v2 → shows recent 5 apps
  │
  ├── [My Records Tab] → GET /land/records → my_land_record + land_mutations_v2 (merged)
  │   └── [Add Record] → POST /land/records → INSERT my_land_record (auto-verified if mutation match)
  │
  ├── [Mutation Tab]  
  │   ├── [Apply] → POST /land/mutation_v2
  │   │     ├── Validates seller NID (reg_info)
  │   │     ├── Validates buyer NID (reg_info)
  │   │     ├── Verifies ownership (my_land_record, status='Approved')
  │   │     ├── INSERT land_mutations_v2 (status='Pending')
  │   │     └── INSERT notifications + service_requests
  │   │         
  │   │   [Admin later approves via stored procedure]
  │   │     → UPDATE land_mutations_v2 SET status='Approved'
  │   │     → TRIGGER fires automatically:
  │   │         1. Buyer gets new record in my_land_record
  │   │         2. Seller's record deleted or reduced
  │   │         3. Service request marked 'approved'
  │   │       
  │   └── [Check Status] → GET /land/mutation/status/:tracking → SELECT from land_mutations_v2
  │
  └── [Land Tax Tab]  
      ├── calculateTax() — client-side (Residential=10/dec, Commercial=20/dec, Agri=free up to 825 dec)
      └── [Pay Now] → POST /payment/land/tax/init
            ├── INSERT landtax (status='Pending')
            ├── SSLCommerz gateway init → returns payment URL
            ├── User redirected to SSLCommerz payment page
            └── Callback:
                  ├── Success → UPDATE landtax status='Success' → redirect land.html?status=success
                  └── Fail → UPDATE landtax status='Failed' → redirect land.html?status=fail
```
