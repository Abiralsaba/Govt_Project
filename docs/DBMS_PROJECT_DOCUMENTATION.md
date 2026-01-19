# Central Government System - DBMS Project Documentation
## Database Schema & Complex Queries

---

## Table of Contents
1. [Database Overview](#database-overview)
2. [Entity Relationship Diagram](#er-diagram)
3. [Normalized Tables (3NF)](#normalized-tables)
4. [Views](#database-views)
5. [Stored Procedures](#stored-procedures)
6. [Triggers](#database-triggers)
7. [Complex Queries](#complex-queries)
8. [Sample Query Results](#sample-results)

---

## 1. Database Overview <a name="database-overview"></a>

The Central Government System database is designed to manage citizen records, documents, land records, community interactions, and government services. The schema follows **Third Normal Form (3NF)** principles.

### Database Statistics
| Component | Count |
|-----------|-------|
| Tables | 40+ |
| Views | 5 |
| Stored Procedures | 4 |
| Triggers | 10 |
| Complex Queries | 8 |

### Main Domains
- **Authentication & Users**: `reg_info`, `user_info`, `login_logs`
- **Documents**: `govt_user_documents`, `user_documents`, `nid_cards`, `passport_books`
- **Taxation**: `tax_payers`, `tax_returns`
- **Land Management**: `my_land_record`, `land_mutations_v2`, `land_tax_paid`
- **Geographic Hierarchy**: `divisions`, `districts`, `upazilas`
- **Community**: `community_groups`, `community_members`, `community_posts`, `post_likes`, `post_comments`
- **Services**: `service_requests`, `todos`, `notifications`

---

## 2. Entity Relationship Diagram <a name="er-diagram"></a>

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   reg_info      │────→│   user_info     │     │  login_logs     │
│   (Users)       │     │   (Profile)     │     │  (Audit)        │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         ├─────────────────┬───────────────────┬──────────────────┐
         ↓                 ↓                   ↓                  ↓
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│govt_user_documents│ │ my_land_record  │ │service_requests │ │community_members│
│  (NID/Passport)   │ │  (Land Data)    │ │   (Services)    │ │   (Groups)      │
└─────────────────┘ └────────┬────────┘ └─────────────────┘ └────────┬────────┘
                             │                                        │
                             ↓                                        ↓
                    ┌─────────────────┐                      ┌─────────────────┐
                    │land_mutations_v2│                      │community_groups │
                    │ (Mutations)     │                      │community_posts  │
                    └────────┬────────┘                      └─────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ↓                   ↓                   ↓
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   divisions     │ │   districts     │ │   upazilas      │
│   (8 Records)   │ │   (64 Records)  │ │   (490+ Records)│
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 3. Normalized Tables (3NF) <a name="normalized-tables"></a>

### 3.1 Address Normalization

**Problem**: Addresses were stored as unstructured text, violating 1NF.

**Solution**: Created normalized address structure with lookup tables.

```sql
-- Address Types (Lookup Table)
CREATE TABLE address_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(50) UNIQUE NOT NULL -- 'Permanent', 'Present', 'Office'
);

-- Normalized Addresses
CREATE TABLE addresses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    address_type_id INT NOT NULL,
    division_id INT,
    district_id INT,
    upazila_id INT,
    village_area VARCHAR(255),
    post_office VARCHAR(100),
    post_code VARCHAR(10),
    FOREIGN KEY (user_id) REFERENCES reg_info(id),
    FOREIGN KEY (address_type_id) REFERENCES address_types(id),
    FOREIGN KEY (division_id) REFERENCES divisions(id)
);
```

### 3.2 Document Status Normalization

**Problem**: ENUM('pending','approved','rejected') repeated across multiple tables.

**Solution**: Single lookup table for all statuses.

```sql
CREATE TABLE document_statuses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(50) UNIQUE NOT NULL,
    color_code VARCHAR(7) DEFAULT '#6B7280'
);

INSERT INTO document_statuses (status_name, color_code) VALUES 
('Pending', '#F59E0B'),
('Approved', '#10B981'),
('Rejected', '#EF4444');
```

### 3.3 Payment Normalization

```sql
CREATE TABLE payment_methods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    method_name VARCHAR(50) UNIQUE NOT NULL,
    processing_fee_percent DECIMAL(5,2) DEFAULT 0
);

CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    payment_method_id INT NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    processing_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount + processing_fee) STORED,
    transaction_id VARCHAR(100) UNIQUE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);
```

---

## 4. Database Views <a name="database-views"></a>

### 4.1 v_citizen_profile
**Purpose**: Comprehensive citizen profile with all documents and activity summary.

```sql
CREATE VIEW v_citizen_profile AS
SELECT 
    u.id AS user_id,
    u.name AS full_name,
    u.nid,
    TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) AS age,
    nid_doc.identity_number AS nid_number,
    pass_doc.identity_number AS passport_number,
    (SELECT COUNT(*) FROM my_land_record WHERE user_id = u.id) AS total_land_records,
    (SELECT COUNT(*) FROM service_requests WHERE user_id = u.id) AS total_requests
FROM reg_info u
LEFT JOIN govt_user_documents nid_doc ON u.id = nid_doc.user_id AND nid_doc.doc_category = 'NID'
LEFT JOIN govt_user_documents pass_doc ON u.id = pass_doc.user_id AND pass_doc.doc_category = 'Passport';
```

### 4.2 v_land_by_location
**Purpose**: Land mutation aggregation by geographic hierarchy.

### 4.3 v_community_analytics
**Purpose**: Group engagement metrics and classification.

### 4.4 v_service_dashboard
**Purpose**: Daily service request statistics with approval rates.

### 4.5 v_user_activity
**Purpose**: User engagement scoring and tier classification.

---

## 5. Stored Procedures <a name="stored-procedures"></a>

### 5.1 sp_get_user_report
**Purpose**: Returns complete user data across all domains.
**Parameters**: `p_user_id INT`

```sql
CALL sp_get_user_report(1);
-- Returns: User info, Documents, Land records, Service history, Login history
```

### 5.2 sp_process_land_mutation
**Purpose**: Handles land mutation approval with transaction control.
**Parameters**: `p_mutation_id INT`, `p_new_status VARCHAR(20)`, `p_admin_notes TEXT`

```sql
CALL sp_process_land_mutation(5, 'Approved', 'Verified by admin');
-- Transfers land ownership, creates notifications, logs audit trail
```

### 5.3 sp_monthly_statistics
**Purpose**: Generates comprehensive monthly reports.
**Parameters**: `p_year INT`, `p_month INT`

```sql
CALL sp_monthly_statistics(2026, 1);
-- Returns: Registration stats, Service breakdown, Land mutations, Community activity
```

### 5.4 sp_search_citizens
**Purpose**: Flexible multi-criteria citizen search.

---

## 6. Database Triggers <a name="database-triggers"></a>

| Trigger Name | Event | Purpose |
|--------------|-------|---------|
| `tr_service_request_status_change` | AFTER UPDATE | Auto-create notifications |
| `tr_like_insert` | AFTER INSERT | Increment like_count |
| `tr_like_delete` | AFTER DELETE | Decrement like_count |
| `tr_comment_insert` | AFTER INSERT | Increment comment_count |
| `tr_comment_delete` | AFTER DELETE | Decrement comment_count |
| `tr_land_mutation_audit_update` | AFTER UPDATE | Audit log for land mutations |
| `tr_land_mutation_audit_insert` | AFTER INSERT | Audit log for new mutations |
| `tr_member_join_notify` | AFTER INSERT | Notify group admin |
| `tr_sync_user_info` | AFTER UPDATE | Sync reg_info to user_info |
| `tr_document_upload_log` | AFTER INSERT | Log document uploads |

---

## 7. Complex Queries <a name="complex-queries"></a>

### Query 1: Hierarchical Report with ROLLUP
```sql
SELECT 
    COALESCE(d.name, '=== GRAND TOTAL ===') AS division,
    COALESCE(dist.name, '--- Division Total ---') AS district,
    COUNT(DISTINCT m.id) AS total_mutations,
    SUM(m.land_price) AS total_value
FROM divisions d
LEFT JOIN districts dist ON d.id = dist.division_id
LEFT JOIN land_mutations_v2 m ON ...
GROUP BY d.name, dist.name WITH ROLLUP;
```

### Query 2: Window Functions - Running Totals
```sql
SELECT 
    DATE(created_at) AS date,
    service_type,
    COUNT(*) AS daily_count,
    SUM(COUNT(*)) OVER (
        PARTITION BY service_type 
        ORDER BY DATE(created_at)
        ROWS UNBOUNDED PRECEDING
    ) AS running_total,
    RANK() OVER (PARTITION BY DATE(created_at) ORDER BY COUNT(*) DESC) AS daily_rank
FROM service_requests
GROUP BY DATE(created_at), service_type;
```

### Query 3: User Engagement Score (CTE)
```sql
WITH user_stats AS (
    SELECT u.id, u.name,
           COALESCE(l.cnt, 0) AS login_count,
           COALESCE(p.cnt, 0) AS post_count
    FROM reg_info u
    LEFT JOIN (SELECT user_id, COUNT(*) cnt FROM login_logs GROUP BY user_id) l ON u.id = l.user_id
    LEFT JOIN (SELECT user_id, COUNT(*) cnt FROM community_posts GROUP BY user_id) p ON u.id = p.user_id
)
SELECT *, 
    NTILE(4) OVER (ORDER BY (login_count + post_count*5) DESC) AS quartile
FROM user_stats;
```

### Query 4: Document Expiry Alerts (UNION)
```sql
SELECT u.name, 'NID' AS doc_type, g.expiry_date,
    CASE WHEN expiry_date < CURDATE() THEN 'EXPIRED'
         WHEN DATEDIFF(expiry_date, CURDATE()) <= 30 THEN 'WARNING'
         ELSE 'OK' END AS alert_level
FROM reg_info u JOIN govt_user_documents g ON ...
UNION ALL
SELECT u.name, 'Passport', g.expiry_date, ...
ORDER BY days_until_expiry;
```

### Query 5: Monthly Pivot Table
```sql
SELECT service_type,
    SUM(CASE WHEN MONTH(created_at) = 1 THEN 1 ELSE 0 END) AS Jan,
    SUM(CASE WHEN MONTH(created_at) = 2 THEN 1 ELSE 0 END) AS Feb,
    -- ... more months
    COUNT(*) AS Total
FROM service_requests
GROUP BY service_type WITH ROLLUP;
```

### Query 6: Recursive CTE - Location Hierarchy
```sql
WITH RECURSIVE location_tree AS (
    SELECT id, name, 'Division' AS level, CAST(name AS CHAR(500)) AS path
    FROM divisions
    UNION ALL
    SELECT d.id, d.name, 'District', CONCAT(lt.path, ' > ', d.name)
    FROM districts d JOIN location_tree lt ON d.division_id = lt.id
)
SELECT * FROM location_tree;
```

### Query 7: Top Performers with Correlated Subquery
Uses ROW_NUMBER() OVER PARTITION to find top 3 active users per community group.

### Query 8: Division Performance Dashboard
Multi-level aggregation with derived metrics and multiple RANK() functions.

---

## 8. Sample Query Results <a name="sample-results"></a>

### v_citizen_profile
| user_id | full_name | nid | age | total_land_records | pending_requests |
|---------|-----------|-----|-----|-------------------|------------------|
| 1 | John Doe | 1234567890 | 35 | 3 | 2 |

### v_community_analytics
| group_name | member_count | total_posts | engagement_score | group_size_category |
|------------|--------------|-------------|------------------|---------------------|
| Tech Hub | 45 | 120 | 520 | Medium |

---

## Technical Specifications

- **Database**: MySQL 8.0+
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_unicode_ci
- **Storage Engine**: InnoDB (for FK support)

---

*Document Generated: January 2026*
*Project: Central Government System - DBMS*
