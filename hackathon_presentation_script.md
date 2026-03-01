# 🎤 DBMS Hackathon Presentation Script

> **Project**: NationX — Central Government Digital Service Platform  
> **Database**: `central_govt_db` | **150+ Tables** | **20 Stored Procedures** | **17 Views** | **Multiple Triggers**

---

## 🟢 Opening (30 seconds)

> "আসসালামু আলাইকুম / Assalamu Alaikum. We are presenting **NationX** — a centralized government digital service platform for Bangladesh. This system handles everything from **NID registration** to **land mutation**, **passport applications**, **tax filing**, **health services**, and **education results** — all from one database with **150+ interconnected tables**, **20 stored procedures**, and real-time triggers."

---

## 🏗️ Database Architecture (1 minute)

> "Our database follows a **star-schema design** with `reg_info` as the central hub table. Every citizen table — NID, passport, health, tax, land — references `reg_info` via foreign key."

**Key stats to mention:**

| Metric | Value |
|--------|-------|
| Total Tables | 150+ |
| Stored Procedures | 20 |
| Views | 17 |
| Triggers | 6+ |
| Foreign Key Relationships | 180+ |
| Central Entity | `reg_info` (referenced by 90+ tables) |

**Say**: "The geographic hierarchy is fully normalized: `divisions` → `districts` → `upazilas`. One `reg_info` entry connects a citizen to their NID, passport, health card, land records, tax returns, and community activity."

---

## 🔥 The 3 Hardest Queries — Step-by-Step

### Hard Query #1: Land Mutation Hierarchical Report with ROLLUP

**API**: `GET /api/reports/land-rollup`  
**File**: [reportsRoutes.js](file:///Users/mdabiralsaba/Documents/web%20development/central%20govt/src/routes/reportsRoutes.js#L257-L275)

```sql
SELECT 
    COALESCE(d.name, '=== GRAND TOTAL ===') AS division,
    COALESCE(dist.name, CONCAT('--- ', COALESCE(d.name, 'Total'), ' ---')) AS district,
    COUNT(DISTINCT m.id) AS total_mutations,
    SUM(CASE WHEN m.status = 'Approved' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN m.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN m.status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
    COALESCE(SUM(m.land_price), 0) AS total_value,
    COALESCE(AVG(m.land_price), 0) AS avg_value
FROM divisions d
LEFT JOIN districts dist ON d.id = dist.division_id
LEFT JOIN upazilas u ON dist.id = u.district_id
LEFT JOIN land_mutations_v2 m ON u.id = m.upazila_id
GROUP BY d.name, dist.name WITH ROLLUP
HAVING total_mutations > 0
```

#### Step-by-Step Explanation:

| Step | Line(s) | What It Does | Concept Used |
|------|---------|-------------|--------------|
| 1 | `FROM divisions d` | Starts from the top of geographic hierarchy | Base table |
| 2 | 3× `LEFT JOIN` | Chains through: divisions → districts → upazilas → land_mutations_v2 | **4-table LEFT JOIN chain** (ensures divisions without mutations still appear) |
| 3 | `COALESCE(d.name, '=== GRAND TOTAL ===')` | When `ROLLUP` generates a NULL row for the grand total, this replaces NULL with a label | `COALESCE` + `ROLLUP` null handling |
| 4 | `COUNT(DISTINCT m.id)` | Counts unique mutations (not duplicated by the join chain) | `COUNT(DISTINCT)` prevents inflation from multiple joins |
| 5 | 3× `SUM(CASE WHEN ...)` | Pivots status into separate columns: Approved, Pending, Rejected | **Conditional aggregation** — creates a pivot table without `PIVOT` keyword |
| 6 | `GROUP BY d.name, dist.name WITH ROLLUP` | Groups by division → district, then auto-generates **subtotals per division** AND a **grand total row** | `WITH ROLLUP` — hierarchical aggregation |
| 7 | `HAVING total_mutations > 0` | Filters out divisions/districts with zero mutations | `HAVING` (post-aggregation filter, not `WHERE`) |

**Say**: "This query joins **4 tables** in a geographic chain — from divisions down to individual land mutations. The `WITH ROLLUP` keyword automatically generates **subtotal rows** for each division AND a **grand total row** at the bottom. The 3 `SUM(CASE WHEN ...)` expressions create a **pivot table** — splitting one status column into 3 separate count columns. This is the same technique used in government census reports."

#### Sample Output:
```
| division         | district            | total | approved | pending | rejected | total_value |
|------------------|---------------------|-------|----------|---------|----------|-------------|
| Dhaka            | Dhaka               | 15    | 8        | 5       | 2        | 75,00,000   |
| Dhaka            | Gazipur             | 7     | 3        | 4       | 0        | 28,00,000   |
| Dhaka            | --- Dhaka ---       | 22    | 11       | 9       | 2        | 1,03,00,000 |  ← subtotal
| Chittagong       | Chittagong          | 10    | 6        | 3       | 1        | 45,00,000   |
| === GRAND TOTAL ===                    | 32    | 17       | 12      | 3        | 1,48,00,000 |  ← grand total
```

---

### Hard Query #2: Land Mutation Approval — ACID Transaction (8 SQL Operations)

**API**: `PUT /api/admin/land-mutations/:id/approve`  
**File**: [adminRoutes.js](file:///Users/mdabiralsaba/Documents/web%20development/central%20govt/src/routes/adminRoutes.js#L253-L369)

This is the most complex **database operation** in the entire project — it executes **8 sequential SQL queries inside a single ACID transaction** across **5 different tables**.

```javascript
// Step 0: Get a dedicated connection from the pool (not shared)
const connection = await db.getConnection();

try {
    // Step 1: BEGIN TRANSACTION — all 8 queries succeed together or fail together
    await connection.beginTransaction();

    // Step 2: SELECT — Read the mutation details
    const [mutations] = await connection.query(
        'SELECT * FROM land_mutations_v2 WHERE id = ?', [id]
    );

    // Step 3: UPDATE — Change mutation status to 'Approved'
    await connection.query(
        'UPDATE land_mutations_v2 SET status = "Approved" WHERE id = ?', [id]
    );

    // Step 4: DELETE — Remove land from seller's record
    await connection.query(
        'DELETE FROM my_land_record WHERE user_id = ? AND khatian_no = ? AND dag_no = ?',
        [mutation.user_id, mutation.khatian_no, mutation.dag_no]
    );

    // Step 5: SELECT — Find buyer by NID in reg_info
    const [buyerUser] = await connection.query(
        'SELECT id FROM reg_info WHERE nid = ?', [mutation.buyer_nid]
    );

    // Step 6: INSERT — Add land to buyer's my_land_record (ownership transfer!)
    await connection.query(
        'INSERT INTO my_land_record (user_id, khatian_no, dag_no, ...) VALUES (...)',
        [buyerUser[0].id, ...]
    );

    // Step 7: INSERT — Send notification to the seller
    await connection.query(
        'INSERT INTO notifications (user_id, type, message) VALUES (...)',
        [mutation.user_id, 'Land Mutation', 'Your mutation has been approved!']
    );

    // Step 8: INSERT — Log into audit_log for tracking
    await connection.query(
        'INSERT INTO audit_log (table_name, record_id, action, ...) VALUES (...)'
    );

    // ALL 8 SUCCEEDED → COMMIT (make permanent)
    await connection.commit();

} catch (error) {
    // ANY failure → ROLLBACK (undo everything)
    await connection.rollback();
} finally {
    // Always release the connection back to the pool
    connection.release();
}
```

#### Step-by-Step Explanation:

| Step | SQL Type | Table | Purpose | What Happens on Failure |
|------|----------|-------|---------|------------------------|
| 1 | `BEGIN` | — | Starts ACID transaction | — |
| 2 | `SELECT` | `land_mutations_v2` | Read mutation details (khatian, dag, buyer NID) | ROLLBACK |
| 3 | `UPDATE` | `land_mutations_v2` | Change status: Pending → Approved | ROLLBACK |
| 4 | `DELETE` | `my_land_record` | Remove land from **seller's** ownership | ROLLBACK (land comes back!) |
| 5 | `SELECT` | `reg_info` | Find buyer's user ID from their NID | ROLLBACK |
| 6 | `INSERT` | `my_land_record` | Add land to **buyer's** ownership record | ROLLBACK (seller keeps land!) |
| 7 | `INSERT` | `notifications` | Notify seller that mutation was approved | ROLLBACK |
| 8 | `INSERT` | `audit_log` | Record admin action for accountability | ROLLBACK |
| ✅ | `COMMIT` | — | All 8 succeeded → make changes permanent | — |
| ❌ | `ROLLBACK` | — | Any step failed → undo ALL changes | Database returns to original state |

**Say**: "This is a real **ACID transaction** — Atomicity, Consistency, Isolation, Durability. If Step 4 deletes the land from the seller but Step 6 fails to add it to the buyer, the `ROLLBACK` undoes the delete — the seller keeps their land. Without the transaction, we'd have **lost data** — the land would disappear from both sides. This is the same pattern banks use for money transfers."

#### Why This Is the Hardest:

| Aspect | Complexity |
|--------|-----------|
| **Tables involved** | 5 (`land_mutations_v2`, `my_land_record`, `reg_info`, `notifications`, `audit_log`) |
| **SQL operations** | 8 (2 SELECT, 1 UPDATE, 1 DELETE, 3 INSERT, 1 UPDATE) |
| **Connection management** | `getConnection()` → `beginTransaction()` → `commit()`/`rollback()` → `release()` |
| **Error handling** | `try/catch/finally` with automatic rollback |
| **Business logic** | Real-world land ownership transfer between two citizens |

---

### Hard Query #3: Top 3 Community Group Performers (Derived Subquery + Window Function)

**API**: `GET /api/reports/top-group-performers`  
**File**: [reportsRoutes.js](file:///Users/mdabiralsaba/Documents/web%20development/central%20govt/src/routes/reportsRoutes.js#L411-L495)

```sql
SELECT 
    g.id AS group_id, g.name AS group_name,
    u.id AS user_id, u.name AS user_name,
    member_activity.post_count,
    member_activity.comment_count,
    member_activity.like_count,
    member_activity.total_activity,
    member_activity.rank_in_group
FROM (
    SELECT 
        m.group_id, m.user_id,
        COALESCE(post_cnt.cnt, 0) AS post_count,
        COALESCE(comment_cnt.cnt, 0) AS comment_count,
        COALESCE(like_cnt.cnt, 0) AS like_count,
        COALESCE(post_cnt.cnt, 0) * 5 + 
        COALESCE(comment_cnt.cnt, 0) * 2 + 
        COALESCE(like_cnt.cnt, 0) AS total_activity,
        ROW_NUMBER() OVER (
            PARTITION BY m.group_id 
            ORDER BY (
                COALESCE(post_cnt.cnt, 0) * 5 + 
                COALESCE(comment_cnt.cnt, 0) * 2 + 
                COALESCE(like_cnt.cnt, 0)
            ) DESC
        ) AS rank_in_group
    FROM community_members m
    LEFT JOIN (
        SELECT user_id, group_id, COUNT(*) AS cnt 
        FROM community_posts WHERE status = 'approved' 
        GROUP BY user_id, group_id
    ) post_cnt ON m.user_id = post_cnt.user_id AND m.group_id = post_cnt.group_id
    LEFT JOIN (
        SELECT pc.user_id, p.group_id, COUNT(*) AS cnt 
        FROM post_comments pc
        JOIN community_posts p ON pc.post_id = p.id
        GROUP BY pc.user_id, p.group_id
    ) comment_cnt ON m.user_id = comment_cnt.user_id AND m.group_id = comment_cnt.group_id
    LEFT JOIN (
        SELECT pl.user_id, p.group_id, COUNT(*) AS cnt 
        FROM post_likes pl
        JOIN community_posts p ON pl.post_id = p.id
        GROUP BY pl.user_id, p.group_id
    ) like_cnt ON m.user_id = like_cnt.user_id AND m.group_id = like_cnt.group_id
    WHERE (COALESCE(post_cnt.cnt, 0) * 5 + 
           COALESCE(comment_cnt.cnt, 0) * 2 + 
           COALESCE(like_cnt.cnt, 0)) > 0
) member_activity
JOIN community_groups g ON member_activity.group_id = g.id
JOIN reg_info u ON member_activity.user_id = u.id
WHERE member_activity.rank_in_group <= 3 AND g.status = 'approved'
ORDER BY g.name, member_activity.rank_in_group
```

#### Step-by-Step Explanation:

| Step | What It Does | Concept Used |
|------|-------------|--------------|
| 1 | 3 derived subqueries count posts, comments, likes **per user per group** | `LEFT JOIN` on **derived tables** (subqueries as tables) |
| 2 | `comment_cnt` joins `post_comments` → `community_posts` to find which group a comment belongs to | **Multi-table JOIN inside a subquery** |
| 3 | Weighted score: `posts × 5 + comments × 2 + likes × 1` | **Weighted formula** in SELECT and WHERE |
| 4 | `ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY score DESC)` | **Window function** — ranks users separately within each group |
| 5 | Outer query filters `rank_in_group <= 3` | Only keeps **top 3 per group** |
| 6 | JOINs to `community_groups` and `reg_info` for names | Final enrichment JOINs |

**Say**: "This query finds the **top 3 most active members per community group**. The inner derived table joins `community_members` with 3 separate subqueries — one for post counts, one for comment counts, one for like counts. Then `ROW_NUMBER() OVER (PARTITION BY group_id)` ranks users **within each group independently**. The outer WHERE keeps only rank ≤ 3. This is the same pattern Facebook uses to show 'Top Contributors' in groups."

---

## ⚡ Triggers Explained

**Say**: "We have 6 active triggers that fire automatically on database events."

### Trigger 1: `tr_sync_user_info` (AFTER UPDATE on `reg_info`)

```sql
-- When a user updates their profile in reg_info,
-- this trigger automatically syncs changes to user_info table
BEGIN
    IF EXISTS (SELECT 1 FROM user_info WHERE user_id = NEW.id) THEN
        UPDATE user_info SET name = NEW.name, email = NEW.email, 
               nid = NEW.nid, mobile = NEW.mobile
        WHERE user_id = NEW.id;
    ELSE
        INSERT INTO user_info (user_id, name, email, nid, mobile)
        VALUES (NEW.id, NEW.name, NEW.email, NEW.nid, NEW.mobile);
    END IF;
END
```

**Explain**: "`NEW` refers to the updated row. The trigger checks if a `user_info` record exists — if yes, it UPDATEs; if not, it INSERTs. This is called an **UPSERT pattern**."

### Trigger 2: `tr_service_request_status_change` (AFTER UPDATE on `service_requests`)

```sql
-- When admin changes a service request status,
-- this automatically creates a notification for the citizen
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO notifications (user_id, message, type)
        VALUES (
            NEW.user_id,
            CONCAT('Service Request: Your ', NEW.service_type, 
                   ' request has been ', NEW.status),
            CASE NEW.status 
                WHEN 'approved' THEN 'success'
                WHEN 'rejected' THEN 'error'
                ELSE 'info'
            END
        );
    END IF;
END
```

**Explain**: "This uses `OLD` vs `NEW` comparison to detect actual status changes. It uses `CASE WHEN` inside the `INSERT` to determine the notification type. The citizen sees a real-time notification without the API having to manually insert it."

### Trigger 3 & 4: `tr_increment_like_count` / `tr_decrement_like_count`

**Explain**: "When a user likes a post, instead of running `SELECT COUNT(*)` every time to show the like count (which is expensive), the trigger automatically increments `like_count` on the `community_posts` table. The delete trigger uses `GREATEST(like_count - 1, 0)` to prevent negative numbers."

---

## 🔧 Key Stored Procedures

**Say**: "We have 20 stored procedures. Let me explain 3 important ones."

### Procedure 1: `sp_calculate_income_tax` — Bangladesh Tax Slab Calculator

```sql
CALL sp_calculate_income_tax(800000, 'Male', @tax, @bracket);
SELECT @tax, @bracket;
-- Result: @tax = 45000, @bracket = '15% Slab'
```

**Explain**: "This procedure implements the **Bangladesh FY 2025-26 progressive tax slab system**. It takes annual income + gender as input (women get 4 lakh tax-free vs 3.5 lakh for men). It uses the `GREATEST()` function to ensure no negative taxable income, and enforces a minimum 5000 BDT tax. This is a real calculation used by NBR."

### Procedure 2: `sp_process_service_request` — Dynamic Table Updates

```sql
CALL sp_process_service_request(
    'req_business_trade_lic', -- ANY table name dynamically!
    42,                       -- request ID
    'approved',               -- action
    1,                        -- admin ID
    'Documents verified'      -- remarks
);
```

**Explain**: "This uses **prepared statements with dynamic SQL** — `PREPARE stmt FROM @sql; EXECUTE stmt;`. It can update ANY of our 22 service request tables without writing 22 separate procedures. It also logs the action to both `admin_actions_log` and `audit_log` automatically."

### Procedure 3: `sp_book_appointment` — With Conflict Detection

**Explain**: "Before inserting an appointment, it runs a conflict check query. If the user already has an appointment on that date, it returns an error message through an `OUT` parameter instead of throwing an exception. It also auto-generates a notification."

---

## 🔗 ER Relationships Highlight

**Say**: "Let me show the key relationship chains:"

```
reg_info (1) ──→ (M) nid_profiles ──→ (M) nid_family_members
                                    ──→ (M) nid_correction_requests

reg_info (1) ──→ (M) passport_applications ──→ (M) passport_status_history
                                            ──→ (1) passport_books

reg_info (1) ──→ (M) nbr_tin_registrations ──→ (M) nbr_tax_returns 
                                            ──→ (M) nbr_tax_payments

divisions (1) ──→ (M) districts (1) ──→ (M) upazilas

community_groups (1) ──→ (M) community_posts (1) ──→ (M) post_comments
                     ──→ (M) community_members   ──→ (M) post_likes
```

**Explain**: "The `reg_info` table is the **hub of a star schema** — it directly connects to 90+ tables. We use both **1:1** relationships (reg_info ↔ user_info, passport_application ↔ passport_books) and **1:M** relationships (reg_info → many service requests). The `community_members` table acts as a **junction table** implementing a **M:M** relationship between citizens and groups."

---

## 🌐 Backend Architecture (Full Detail)

**Say**: "The backend is built with **Node.js + Express.js + MySQL2** following the **MVC pattern**."

### Tech Stack

| Layer | Technology | File |
|-------|-----------|------|
| Runtime | Node.js | `src/app.js` (entry point) |
| Framework | Express.js | 21 route files, 4 controllers |
| Database Driver | `mysql2/promise` | `src/config/db.js` (connection pool) |
| Authentication | JWT (jsonwebtoken) + bcrypt | `src/middleware/authMiddleware.js` |
| Security | Helmet.js + CORS + Rate Limiting | `src/app.js` |
| Email | Nodemailer (OTP reset) | `src/controllers/authController.js` |
| Frontend | Vanilla HTML/CSS/JS | `public/*.html` + `public/js/*.js` |

### Database Connection (Connection Pooling)

```javascript
// src/config/db.js
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'central_govt_db',
    waitForConnections: true,
    connectionLimit: 10,    // Max 10 simultaneous connections
    queueLimit: 0           // Unlimited queue
});
```

**Explain**: "We use **connection pooling** instead of creating a new connection per request. The pool maintains up to 10 reusable connections — this prevents MySQL's `Too many connections` error under load."

### Middleware Pipeline (Order matters!)

```
Request → Helmet (HTTP headers)
        → CORS (Cross-Origin)
        → JSON Parser
        → URL-Encoded Parser
        → Rate Limiter (100 req / 15 min per IP)
        → Static Files (public/)
        → Route Handler
        → Error Handler
```

**Say**: "Express middleware runs in **order of declaration**. Helmet sets secure HTTP headers first, then CORS allows cross-origin requests, then parsers extract body data, and finally the rate limiter blocks brute force attacks — all BEFORE reaching any route."

### Authentication Flow — JWT (JSON Web Token)

**Step 1: Registration** (`POST /api/auth/register`)
```javascript
// 1. Validate input with express-validator
// 2. Check for duplicate NID or email
const [existing] = await db.query(
    'SELECT id FROM reg_info WHERE email = ? OR nid = ?', [email, nid]
);
// 3. Hash password (bcrypt, 10 salt rounds)
const passwordHash = await bcrypt.hash(password, 10);
// 4. Insert into reg_info + user_info (dual write)
// 5. Generate JWT token and return immediately
const token = jwt.sign(
    { id: result.insertId, username, nid },
    JWT_SECRET,
    { expiresIn: '1h' }
);
```

**Step 2: Login** (`POST /api/auth/login`)
```javascript
// 1. Find user by email
// 2. Compare password with bcrypt
const isMatch = await bcrypt.compare(password, user.password);
// 3. Generate JWT token
// 4. Log login to login_logs table (IP, User-Agent)
await db.query(
    'INSERT INTO login_logs (user_id, ip_address, user_agent) VALUES (?, ?, ?)',
    [user.id, req.ip, req.headers['user-agent']]
);
```

**Step 3: Protected Routes** — Middleware verifies token on every request:
```javascript
// src/middleware/authMiddleware.js
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];       // "Bearer eyJhbG..."
    if (!token) return res.status(403).json({ error: 'No token' });
    
    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.user = decoded;  // { id, username, nid }
        next();              // Proceed to route handler
    });
};
```

**Explain**: "The token is sent in the `Authorization: Bearer <token>` header. The middleware decodes it and attaches the user's identity (`req.user`) to every request — so routes never need to ask 'who is this user?' — they just read `req.user.id`."

### Admin vs User — Two Separate Auth Layers

```javascript
// User middleware: verifyToken → sets req.user
// Admin middleware: checks decoded.isAdmin === true → sets req.admin

if (!decoded.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
}
```

**Say**: "We have **two separate middleware functions**. Normal users get `req.user`, admins get `req.admin`. Admin routes like `/api/admin/*` and `/api/reports/*` use the admin middleware — even if a normal user has a valid JWT token, they'll get a 403 Forbidden."

### Password Reset Flow (OTP via Email)

```
1. User sends POST /api/auth/forgot-password { email, nid }
2. Server generates 6-digit OTP → stores in reg_info.reset_otp
3. Sets 15-min expiry → reg_info.reset_otp_expires
4. Sends OTP via Nodemailer email
5. User enters OTP + new password → POST /api/auth/reset-password
6. Server verifies OTP + expiry → bcrypt hashes new password
7. Clears OTP columns → returns success
```

### Route Mounting in `app.js`

```javascript
// 21 route files mounted on specific API prefixes:
app.use('/api/auth', authRoutes);           // Login, Register, OTP
app.use('/api/dashboard', dashboardRoutes); // Citizen dashboard
app.use('/api/nid', nidRoutes);             // NID services (12 tables)
app.use('/api/passport', passportRoutes);   // Passport (5 tables)
app.use('/api/tax', taxRoutes);             // NBR Tax (7 tables)
app.use('/api/health', healthRoutes);       // Health (6 tables)
app.use('/api/education', educationRoutes); // Education (7 tables)
app.use('/api/water', waterRoutes);         // Water (5 tables)
app.use('/api/agriculture', agricultureRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/stipends', stipendRoutes);
app.use('/api/admin', adminRoutes);         // Admin dashboard
app.use('/api/reports', reportsRoutes);     // Complex analytics
// ... and more
```

### Full Request Lifecycle Example

```
Browser: POST /api/nid/apply { name, dob, address, ... }
  ↓
  app.js: Helmet → CORS → JSON parser → Rate limiter
  ↓
  authMiddleware: Verify JWT → req.user = { id: 42, nid: '1990...' }
  ↓
  nidRoutes.js: Validate body → INSERT INTO nid_applications
  ↓
  MySQL: Row inserted → Trigger fires automatically
  ↓
  Trigger: INSERT INTO notifications → 'NID application submitted'
  ↓
  nidRoutes.js: res.json({ success: true, applicationNo })
  ↓
  Browser: Shows success toast notification
```

### Error Handling

```javascript
// Global error handler catches everything
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Max 5MB.' });
    }
    res.status(500).json({ error: err.message || 'Something went wrong!' });
});
```

### Security Layers Summary

| Layer | What It Prevents |
|-------|-----------------|
| **Helmet.js** | XSS, clickjacking, MIME sniffing |
| **CORS** | Unauthorized cross-origin requests |
| **Rate Limiting** | Brute force attacks (100 req/15 min) |
| **bcrypt (10 rounds)** | Password cracking (rainbow tables) |
| **JWT (1h expiry)** | Session hijacking |
| **Parameterized queries** | SQL injection (`?` placeholders) |
| **express-validator** | Invalid input data |

---

## 🎯 Closing (15 seconds)

> "To summarize: **134 tables**, **180+ foreign key relationships**, **20 stored procedures**, **17 database views**, **6 triggers**, and complex queries using **CTEs**, **window functions**, **ROLLUP**, and **prepared statements**. This is a production-grade DBMS implementation for a complete digital government ecosystem. ধন্যবাদ / Thank you!"

---

## 💡 Potential Judge Questions & Answers

| Question | Answer |
|----------|--------|
| "Is this 3NF?" | "~75% 3NF. Core tables are fully normalized. Some tables use JSON for flexibility (stipend applications). We have a `schema_normalized.sql` ready for full normalization." |
| "Why 134 tables?" | "Each government service (NID, Passport, Tax, Health, Education, Water, Land, Agriculture) has its own set of 5-12 tables following the Single Responsibility Principle." |
| "What's the hardest part?" | "The engagement scoring query — 7 CTEs, 5 LEFT JOINs, 3 window functions computing engagement across 5 different activity tables in a single query." |
| "How do you handle security?" | "JWT authentication middleware on all API routes, bcrypt password hashing, rate limiting (100 req/15min), Helmet.js HTTP headers, and admin approval workflow." |
