# Central Government System of Bangladesh
## Complete Project & DBMS Documentation

> **A full-stack e-Governance platform** enabling citizens to access 20+ government services — NID, Passport, Land, Tax, Health, Education, Water, Agriculture, Community — through a single unified portal.

| | |
|---|---|
| **Stack** | Node.js · Express 5 · MySQL 8 · Vanilla JS |
| **Architecture** | Monolithic MVC with REST API |
| **Database** | `central_govt_db` — 150+ tables, 16 views, 20 triggers, 6 stored procedures, 28 complex queries |
| **Auth** | JWT (User + Admin), Bcrypt, OTP-based password reset |
| **Payments** | SSLCommerz integration (Passport, Land Tax, Shop, University) |
| **Server** | Port 3000, Rate-limited (100 req/15 min) |

---

## Table of Contents

1. [System Overview & Problem Statement](#1-system-overview--problem-statement)
2. [System Architecture](#2-system-architecture)
3. [Project Structure](#3-project-structure)
4. [Database Design Overview](#4-database-design-overview)
5. [Complete Entity Relationship Diagram](#5-complete-entity-relationship-diagram)
6. [All Tables — Complete Schema Reference](#6-all-tables--complete-schema-reference)
7. [Normalization (3NF)](#7-normalization-3nf)
8. [Database Views (16)](#8-database-views-16)
9. [Triggers (14)](#9-triggers-20)
10. [Stored Procedures (4)](#10-stored-procedures-4)
11. [Complex Queries (12)](#11-complex-queries-28)
12. [REST API — All 327 Endpoints](#12-rest-api--all-327-endpoints)
13. [Authentication & Security](#13-authentication--security)
14. [Module-Wise Feature Documentation](#14-module-wise-feature-documentation)
15. [Data Flow Diagrams](#15-data-flow-diagrams)
16. [Business Logic Flows](#16-business-logic-flows)
17. [Installation & Setup](#17-installation--setup)
18. [Technical Specifications](#18-technical-specifications)

---

## 1. System Overview & Problem Statement

### The Problem

Bangladesh has 170+ million citizens interacting with dozens of government agencies. Each agency operates siloed systems, requiring citizens to visit separate offices, fill redundant paper forms, and wait weeks for basic services.

| Problem | Impact | Our Solution |
|---------|--------|-------------|
| **Fragmented Services** | Citizens visit 10+ offices for basic documents | Single portal for NID, Passport, Tax, Land, Health, Education, Water |
| **No Digital Records** | Paper-based land deeds, tax receipts lost or forged | MySQL database with audit trails, triggers, and immutable logs |
| **Zero Transparency** | No tracking after application submission | Real-time status tracking with notifications |
| **Manual Approvals** | Weeks of waiting, corruption risks | Admin dashboard with structured approval workflows |
| **No Community Platform** | Citizens can't interact or report issues | Community groups, complaints, market prices |

### The Solution

The **Central Government System** is a unified e-Governance portal that digitalizes citizen services across 8 major government departments:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CENTRAL GOVERNMENT SYSTEM                        │
│                  Government of Bangladesh                           │
├─────────────┬─────────────┬──────────────┬─────────────────────────┤
│  🆔 NID     │ 🛂 Passport │  🏠 Land     │  💰 Tax (NBR)          │
│  Wing       │  (DIP)      │  Records     │  TIN/VAT/Returns       │
├─────────────┼─────────────┼──────────────┼─────────────────────────┤
│  🏥 Health  │ 🎓 Education│  💧 Water    │  🌾 Agriculture        │
│  DGHS       │  Boards     │  WASA        │  DAE                   │
├─────────────┴─────────────┴──────────────┴─────────────────────────┤
│  🛒 Shop  │  👥 Community  │  📋 Documents  │  📊 Reports/Admin   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                               │
│                                                                          │
│   index.html ── dashboard.html ── nid.html ── passport.html ── ...      │
│       │              │               │              │                    │
│   style.css      sidebar.js      nid.js       passport.js               │
│                                                                          │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │  HTTP / AJAX (fetch API)
                              │  Authorization: Bearer <JWT>
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS.JS SERVER (:3000)                         │
│                                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   Helmet     │  │  CORS        │  │ Rate Limiter │                   │
│  │   (CSP)      │  │  (All)       │  │ 100/15min    │                   │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘                   │
│         └────────────────┼──────────────────┘                            │
│                          ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     MIDDLEWARE LAYER                              │   │
│  │  authMiddleware.js (JWT verify) ── adminMiddleware.js (Admin JWT)│   │
│  │  uploadMiddleware.js (Multer: 5MB images)                        │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      ROUTE LAYER (21 files)                      │   │
│  │                                                                  │   │
│  │  /api/auth ────── /api/dashboard ────── /api/user                │   │
│  │  /api/nid ─────── /api/passport ─────── /api/tax                 │   │
│  │  /api/health ──── /api/water ─────────── /api/agriculture        │   │
│  │  /api/education ─ /api/university ────── /api/community          │   │
│  │  /api/shop ────── /api/payment ───────── /api/reports            │   │
│  │  /api/stipends ── /api/notices ───────── /api/contact            │   │
│  │  /api/departments ── /api/admin                                  │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                   CONTROLLER LAYER (4 files)                     │   │
│  │  authController ── dashboardController ── userController         │   │
│  │  adminAuthController                                             │   │
│  │  (Many routes use inline handlers in route files)                │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    DATABASE LAYER                                 │   │
│  │  mysql2/promise connection pool (10 connections)                  │   │
│  │  Host: localhost | DB: central_govt_db                            │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         MySQL 8.0+ (InnoDB)                              │
│                                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │  80+ Tables │ │  16 Views  │ │ 14 Triggers│ │ 4 Procedures│          │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
│                                                                          │
│  Character Set: utf8mb4  |  Collation: utf8mb4_unicode_ci               │
│  Storage Engine: InnoDB  |  FK Support: Enabled                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Request-Response Flow

```
Client Request
     │
     ▼
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────┐
│ Helmet   │───▶│  CORS    │───▶│  Rate    │───▶│  JSON    │───▶│ Auth  │
│ (CSP)    │    │          │    │  Limiter │    │  Parser  │    │ Check │
└─────────┘    └──────────┘    └──────────┘    └──────────┘    └───┬───┘
                                                                    │
     ┌──────────────────────────────────────────────────────────────┘
     ▼
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Router  │───▶│Controller│───▶│  MySQL   │───▶│  JSON    │──▶ Client
│ Match   │    │ Handler  │    │  Query   │    │ Response │
└─────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## 3. Project Structure

```
central-govt/
│
├── .env                          # Environment variables (DB_HOST, JWT_SECRET, etc.)
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies & scripts
├── README.md                     # Quick start guide
│
├── docs/
│   └── DBMS_PROJECT_DOCUMENTATION.md   # ← YOU ARE HERE
│
├── public/                       # Static frontend (served by Express)
│   ├── index.html                # Landing page / Login
│   ├── register.html             # User registration
│   ├── forgot-password.html      # OTP-based password reset
│   ├── dashboard.html            # Main user dashboard
│   ├── profile.html              # User profile management
│   ├── documents.html            # Document upload & tracking
│   ├── history.html              # Service request history
│   ├── todo.html                 # Kanban task board
│   │
│   ├── nid.html                  # NID Registration Wing
│   ├── passport.html             # e-Passport Application
│   ├── land.html                 # Land Records & Mutations
│   ├── tax.html                  # NBR Tax Portal
│   ├── health.html               # Health Services (DGHS)
│   ├── water.html                # Water (WASA) Services
│   ├── education.html            # Education Board Results
│   ├── admission.html            # University Admission
│   ├── agriculture.html          # Agriculture (DAE) Services
│   │
│   ├── community.html            # Community Groups & Posts
│   ├── shop.html                 # Government e-Shop
│   ├── market.html               # Market Price Monitor
│   ├── contact.html              # Contact Government
│   ├── events.html               # Government Events
│   ├── reports.html              # Admin Reports
│   ├── apply.html                # Service Application Portal
│   │
│   ├── admin-login.html          # Admin authentication
│   ├── admin-nid.html            # Admin NID management
│   ├── admin-passport.html       # Admin Passport management
│   ├── admin-health.html         # Admin Health management
│   ├── admin-water.html          # Admin Water management
│   │
│   ├── css/                      # Stylesheets (21 files)
│   │   ├── style.css             # Global styles
│   │   ├── sidebar.css           # Navigation sidebar
│   │   ├── auth.css              # Login/Register pages
│   │   ├── nid.css               # NID module styles
│   │   ├── passport.css          # Passport module styles
│   │   ├── health.css            # Health module styles
│   │   ├── water.css             # Water module styles
│   │   ├── tax.css               # Tax module styles
│   │   ├── agriculture.css       # Agriculture styles
│   │   ├── community.css         # Community styles
│   │   ├── land.css              # Land module styles
│   │   ├── documents.css         # Documents styles
│   │   ├── profile.css           # Profile styles
│   │   ├── reports.css           # Reports styles
│   │   ├── todo.css              # Todo/Kanban styles
│   │   ├── history.css           # History styles
│   │   ├── shop_images.css       # Shop styles
│   │   ├── admin-nid.css         # Admin NID styles
│   │   ├── admin-passport.css    # Admin Passport styles
│   │   ├── admin-health.css      # Admin Health styles
│   │   └── admin-water.css       # Admin Water styles
│   │
│   ├── js/                       # Frontend JavaScript (23 files)
│   │   ├── auth.js               # Login/Register logic
│   │   ├── sidebar.js            # Sidebar navigation
│   │   ├── dashboard.js          # Dashboard widgets
│   │   ├── profile.js            # Profile management
│   │   ├── documents.js          # Document uploads
│   │   ├── history.js            # Service history
│   │   ├── nid.js                # NID frontend logic
│   │   ├── passport.js           # Passport frontend logic
│   │   ├── tax.js                # Tax frontend logic
│   │   ├── health.js             # Health frontend logic
│   │   ├── water.js              # Water frontend logic
│   │   ├── agriculture.js        # Agriculture frontend logic
│   │   ├── community.js          # Community frontend logic
│   │   ├── shop.js               # E-Shop frontend logic
│   │   ├── market.js             # Market prices display
│   │   ├── reports.js            # Admin reports
│   │   ├── notices.js            # Govt notices display
│   │   ├── weather.js            # Weather widget
│   │   ├── admin-login.js        # Admin auth
│   │   ├── admin-nid.js          # Admin NID management
│   │   ├── admin-passport.js     # Admin Passport panel
│   │   ├── admin-health.js       # Admin Health panel
│   │   └── admin-water.js        # Admin Water panel
│   │
│   ├── images/                   # Static images
│   └── uploads/                  # User uploaded files
│       ├── nid/                  # NID documents
│       ├── passport/             # Passport photos & docs
│       ├── products/             # Shop product images
│       └── user_docs/            # General user documents
│
└── src/                          # Backend source code
    ├── app.js                    # Express server entry point
    │
    ├── config/
    │   └── db.js                 # MySQL2 connection pool
    │
    ├── middleware/
    │   ├── authMiddleware.js     # JWT verification (user)
    │   ├── adminMiddleware.js    # JWT verification (admin)
    │   └── uploadMiddleware.js   # Multer file upload config
    │
    ├── controllers/
    │   ├── authController.js     # Register, Login, OTP Reset
    │   ├── adminAuthController.js # Admin Register, Login, GetMe
    │   ├── dashboardController.js # Summary, Todos, Services, Docs
    │   └── userController.js     # Profile CRUD, Photo Upload
    │
    ├── routes/                   # API Route handlers (21 files)
    │   ├── authRoutes.js         # /api/auth/*
    │   ├── dashboardRoutes.js    # /api/dashboard/*
    │   ├── userRoutes.js         # /api/user/*
    │   ├── nidRoutes.js          # /api/nid/*
    │   ├── passportRoutes.js     # /api/passport/*
    │   ├── taxRoutes.js          # /api/tax/*
    │   ├── healthRoutes.js       # /api/health/*
    │   ├── waterRoutes.js        # /api/water/*
    │   ├── agricultureRoutes.js  # /api/agriculture/*
    │   ├── educationRoutes.js    # /api/education/*
    │   ├── universityRoutes.js   # /api/university/*
    │   ├── communityRoutes.js    # /api/community/*
    │   ├── shopRoutes.js         # /api/shop/*
    │   ├── departmentRoutes.js   # /api/departments/*
    │   ├── paymentRoutes.js      # /api/payment/*
    │   ├── reportsRoutes.js      # /api/reports/*
    │   ├── stipendRoutes.js      # /api/stipends/*
    │   ├── contactRoutes.js      # /api/contact/*
    │   ├── noticeRoutes.js       # /api/notices/*
    │   ├── adminAuthRoutes.js    # /api/admin/* (auth)
    │   └── adminRoutes.js        # /api/admin/* (management)
    │
    └── database/                 # SQL schema files (25 files)
        ├── schema_full.sql       # Complete DB dump (all tables)
        ├── schema_normalized.sql # Normalization tables
        ├── schema_logging.sql    # Admin login logs
        ├── schema_logs.sql       # User login logs
        ├── nid_schema.sql        # NID Wing tables (14 tables)
        ├── passport_schema.sql   # Passport tables (5 tables)
        ├── health_schema.sql     # Health tables (6 tables)
        ├── water_schema.sql      # Water tables (5 tables)
        ├── nbr_schema.sql        # Tax/NBR tables (7 tables)
        ├── agriculture_schema.sql # Agriculture tables (6 tables)
        ├── education_schema.sql  # Education tables (4 tables)
        ├── education_institutions.sql
        ├── university_admission_schema.sql  # 3 tables
        ├── market_schema.sql     # Market tables (2 tables)
        ├── shop_schema.sql       # Shop tables (4 tables)
        ├── notices_schema.sql    # Notices table
        ├── contact_schema.sql    # Contact table
        ├── stipend_schema.sql    # Stipend tables (2 tables)
        ├── admin_schema.sql      # Admin tables (2 tables)
        ├── land_mutation_schema.sql   # Land mutation table
        ├── land_mutation_trigger.sql  # Land transfer trigger
        ├── views.sql             # 16 database views
        ├── triggers.sql          # 14 triggers
        ├── procedures.sql        # 4 stored procedures
        └── complex_queries.sql   # 12 complex analytical queries
```

---

## 4. Database Design Overview

### Database Statistics

| Component | Count | Details |
|-----------|-------|---------|
| **Tables** | **80+** | Across 12 major domains |
| **Views** | **16** | Citizen profiles, analytics, dashboards |
| **Triggers** | **14** | Auto-notifications, audit logs, counters |
| **Stored Procedures** | **4** | User reports, land mutations, statistics, search |
| **Complex Queries** | **12** | ROLLUP, Window Functions, CTEs, Recursive, Pivots |
| **Foreign Keys** | **100+** | Full referential integrity |
| **Indexes** | **60+** | Performance optimization |

### Domain Map

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         central_govt_db                                       │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗    │
│  ║  CORE TABLES                                                         ║    │
│  ║  reg_info (PK) ── user_info ── login_logs ── edit_req                ║    │
│  ║  admins ── admin_login_logs ── admin_actions_log                     ║    │
│  ╚══════════════════════════════╤════════════════════════════════════════╝    │
│                                 │                                            │
│         ┌───────────┬───────────┼───────────┬───────────┬──────────┐         │
│         ▼           ▼           ▼           ▼           ▼          ▼         │
│  ┌────────────┐┌────────────┐┌────────────┐┌────────┐┌────────┐┌────────┐   │
│  │ NID WING   ││ PASSPORT   ││ LAND       ││ TAX    ││ HEALTH ││ WATER  │   │
│  │ (14 tables)││ (5 tables) ││ (3 tables) ││(7 tbl) ││(6 tbl) ││(5 tbl) │   │
│  └────────────┘└────────────┘└────────────┘└────────┘└────────┘└────────┘   │
│         │           │           │           │         │          │            │
│  ┌────────────┐┌────────────┐┌────────────┐┌────────┐┌────────┐┌────────┐   │
│  │ EDUCATION  ││ UNIVERSITY ││ AGRICULTURE││ SHOP   ││COMMUNTY││SERVICES│   │
│  │ (5 tables) ││ (3 tables) ││ (6 tables) ││(4 tbl) ││(5 tbl) ││(8 tbl) │   │
│  └────────────┘└────────────┘└────────────┘└────────┘└────────┘└────────┘   │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗    │
│  ║  SUPPORT TABLES                                                      ║    │
│  ║  divisions (8) ── districts (64) ── upazilas (490+)                  ║    │
│  ║  address_types ── addresses ── document_statuses                      ║    │
│  ║  payment_methods ── payments ── audit_log                             ║    │
│  ║  notifications ── todos ── contact_messages ── govt_notices           ║    │
│  ║  stipends ── stipend_applications                                     ║    │
│  ╚═══════════════════════════════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Complete Entity Relationship Diagram

### Master ER Diagram — All Domains

```
═══════════════════════════════════════════════════════════════════════════════
                    CENTRAL GOVERNMENT SYSTEM — MASTER ER DIAGRAM
═══════════════════════════════════════════════════════════════════════════════

                              ┌───────────────────┐
                              │     reg_info       │  ◄── CENTRAL ENTITY
                              │─────────────────── │      (All users)
                              │ PK id              │
                              │ name               │
                              │ UK nid             │
                              │ UK email           │
                              │ password (hashed)  │
                              │ mobile             │
                              │ dob                │
                              │ gender             │
                              │ address            │
                              │ photo_url          │
                              │ reset_otp          │
                              │ created_at         │
                              └─────────┬─────────┘
                                        │
           ┌──────────┬────────┬────────┼────────┬────────┬──────────┐
           │          │        │        │        │        │          │
           ▼          ▼        ▼        ▼        ▼        ▼          ▼
     ┌──────────┐┌────────┐┌───────┐┌───────┐┌───────┐┌───────┐┌────────┐
     │user_info ││login_  ││edit_  ││notifi-││todos  ││addres-││govt_   │
     │(1:1)     ││logs    ││req    ││cations││       ││ses    ││user_   │
     │          ││(1:N)   ││(1:N)  ││(1:N)  ││(1:N)  ││(1:N)  ││docs   │
     │user_id FK││user_id ││user_id││user_id││user_id││user_id││(1:N)  │
     └──────────┘└────────┘└───────┘└───────┘└───────┘└───────┘└────────┘
```

### NID Wing ER Diagram (14 Tables)

```
                              ┌───────────────────┐
                              │     reg_info       │
                              └─────────┬─────────┘
                                        │ (user_id FK)
           ┌──────────┬────────┬────────┼────────┬────────┬──────────┐
           ▼          ▼        ▼        ▼        ▼        ▼          ▼
    ┌────────────┐┌────────┐┌───────┐┌───────┐┌───────┐┌───────┐┌────────┐
    │nid_profiles││nid_    ││nid_   ││nid_   ││nid_   ││nid_   ││nid_    │
    │            ││applica-││correc-││reissue││smart_ ││address││verifi- │
    │ nid_number ││tions   ││tion_  ││_reqs  ││card_  ││change_││cations │
    │ name_bn    ││        ││reqs   ││       ││reqs   ││reqs   ││        │
    │ name_en    ││app_no  ││       ││       ││       ││       ││        │
    │ blood_grp  ││status  ││req_no ││req_no ││       ││       ││        │
    │ biometric  ││        ││       ││       ││       ││       ││        │
    └────────────┘└────────┘└───────┘└───────┘└───────┘└───────┘└────────┘
           │
           ├──────────┬────────┬────────┬────────┬────────┐
           ▼          ▼        ▼        ▼        ▼        ▼
    ┌────────────┐┌────────┐┌───────┐┌───────┐┌───────┐┌───────┐
    │nid_appoint-││nid_    ││nid_   ││nid_   ││nid_   ││nid_   │
    │ments       ││family_ ││activ- ││collec-││fees   ││cards  │
    │            ││members ││ity_log││tion_  ││       ││(FK to │
    │ center_id  ││        ││       ││centers││       ││citiz- │
    │ slot_date  ││        ││       ││       ││       ││ens)   │
    └────────────┘└────────┘└───────┘└───────┘└───────┘└───────┘

    ┌────────────────────────────────────────────┐
    │ nid_corrections (old simple correction)    │
    │ PK id | FK user_id → reg_info              │
    └────────────────────────────────────────────┘
```

### Passport System ER Diagram (5 Tables)

```
    ┌──────────────────┐          ┌────────────────────┐
    │ passport_offices │          │ passport_fee_      │
    │ (15 RPOs)        │          │ schedule           │
    │                  │          │                    │
    │ PK id            │          │ passport_type      │
    │ UK office_code   │          │ page_count         │
    │ office_name      │          │ validity_years     │
    │ division         │          │ delivery_type      │
    │ district         │          │ fee_bdt            │
    └────────┬─────────┘          └────────────────────┘
             │ (preferred_office)
             ▼
    ┌───────────────────────────────────────────────────────┐
    │              passport_applications                     │
    │──────────────────────────────────────────────────────  │
    │ PK id (BIGINT)                                        │
    │ FK user_id → reg_info(id)                             │
    │ UK application_number                                 │
    │                                                       │
    │ service_type: New|Renewal|Lost|Damaged|Correction     │
    │ passport_type: Ordinary|Official|Diplomatic           │
    │ page_count: 48|64                                     │
    │ validity_years: 5|10                                  │
    │ delivery_type: Regular|Express|Super Express          │
    │                                                       │
    │ full_name_bn, full_name_en, father/mother/spouse      │
    │ dob, gender, religion, marital_status                 │
    │ nid_number, birth_certificate_no                      │
    │ present_address, permanent_address                    │
    │ mobile, email, emergency_contact                      │
    │ old_passport_number (for renewals)                    │
    │                                                       │
    │ status: Submitted → Payment Verified → Under Review   │
    │   → Biometric Scheduled → Police Verification         │
    │   → Approved → Printing → Dispatched → Delivered      │
    │                                                       │
    │ fee_amount, payment_status, payment_method            │
    │ photo_path, nid_scan_path, birth_cert_path            │
    └───────────────────────┬───────────────────────────────┘
                            │
               ┌────────────┼─────────────────┐
               ▼                              ▼
    ┌──────────────────────┐     ┌───────────────────────┐
    │  passport_books      │     │ passport_status_      │
    │                      │     │ history               │
    │ PK id                │     │                       │
    │ FK application_id    │     │ FK application_id     │
    │ UK passport_number   │     │ old_status            │
    │ issue_date           │     │ new_status            │
    │ expiry_date          │     │ changed_by            │
    │ issuing_authority    │     │ remarks               │
    └──────────────────────┘     └───────────────────────┘
```

### Land Management ER Diagram (3 Tables)

```
    ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
    │   divisions (8)  │     │  districts (64)  │     │ upazilas (490+)  │
    │   PK id          │◄────│  FK division_id  │◄────│  FK district_id  │
    │   UK name        │     │  PK id           │     │  PK id           │
    └──────────┬───────┘     └──────────┬───────┘     └──────────┬───────┘
               │                        │                        │
               └────────────┬───────────┴────────────────────────┘
                            ▼
    ┌───────────────────────────────────────────────────────┐
    │                  my_land_record                        │
    │  PK id | FK user_id → reg_info                        │
    │  FK division_id, district_id, upazila_id              │
    │  owner_name, nid, father_name, mother_name            │
    │  khatian_no, dag_no, mouza, jl_no, hold_no            │
    │  land_size (decimal), land_price, deed_no             │
    │  status: Pending|Approved|Rejected                    │
    └───────────────────────┬───────────────────────────────┘
                            │
                            ▼
    ┌───────────────────────────────────────────────────────┐
    │                land_mutations_v2                       │
    │  PK id | FK user_id → reg_info                        │
    │  FK division_id, district_id, upazila_id              │
    │  UK tracking_number                                   │
    │  applicant_name, khatian_no, dag_no, land_price       │
    │  buyer_name, buyer_nid, buyer_father_name             │
    │  ownership_type: Own|Other                            │
    │  status: Pending|Approved|Rejected                    │
    │                                                       │
    │  TRIGGER: after_mutation_approval                     │
    │  → Auto-transfers land to buyer's my_land_record      │
    └───────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────┐
    │                    landtax                             │
    │  PK id | UK transaction_id                            │
    │  FK division_id, district_id, upazila_id              │
    │  applicant_name, nid, khatian_no, dag_no              │
    │  land_type: Residential|Commercial|Agricultural       │
    │  tax_amount, payment_status, payment_date             │
    │  (SSLCommerz integrated)                              │
    └───────────────────────────────────────────────────────┘
```

### Tax / NBR ER Diagram (7 Tables)

```
    ┌───────────────────────┐
    │   nbr_tax_zones       │
    │   PK id               │
    │   UK zone_code        │
    │   zone_name           │
    │   circle_name         │
    │   jurisdiction        │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐          ┌───────────────────────┐
    │ nbr_tin_registrations │          │  nbr_vat_registrations│
    │ PK id                 │          │  PK id                │
    │ FK user_id → reg_info │          │  FK user_id → reg_info│
    │ FK zone_id            │          │  UK bin_number        │
    │ UK tin_number         │          │  business_name        │
    │ taxpayer_name         │          │  status               │
    │ taxpayer_type         │          └───────────────────────┘
    │ status                │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐          ┌───────────────────────┐
    │   nbr_tax_returns     │          │   nbr_tax_notices     │
    │   PK id               │          │   PK id               │
    │   FK user_id          │          │   FK user_id          │
    │   FK tin_id           │          │   notice_type         │
    │   UK submission_ref   │          │   subject             │
    │   tax_year            │          │   is_read             │
    │   total_income        │          └───────────────────────┘
    │   tax_due             │
    │   status              │          ┌───────────────────────┐
    └───────────┬───────────┘          │   nbr_tax_challan     │
                │                      │   PK id               │
                ▼                      │   FK user_id          │
    ┌───────────────────────┐          │   UK challan_no       │
    │   nbr_tax_payments    │          │   amount              │
    │   PK id               │          │   bank_name           │
    │   FK user_id          │          └───────────────────────┘
    │   FK return_id        │
    │   UK receipt_no       │
    │   amount              │
    │   payment_method      │
    └───────────────────────┘
```

### Health Services ER Diagram (6 Tables)

```
    ┌───────────────────────────────────────────────────────┐
    │                  health_hospitals                      │
    │  PK id | name, hospital_type, specializations         │
    │  division, district, upazila, beds, icu_beds          │
    │  emergency_24x7, phone, email, is_active              │
    └──────────────────────┬────────────────────────────────┘
                           │
              ┌────────────┼──────────────┐
              ▼            │              ▼
    ┌──────────────┐       │     ┌───────────────────┐
    │health_appoint│       │     │health_ambulance_  │
    │ments         │       │     │requests           │
    │FK user_id    │       │     │FK user_id         │
    │FK hospital_id│       │     │pickup_location    │
    │doctor_name   │       │     │emergency_type     │
    │status        │       │     │status             │
    └──────────────┘       │     └───────────────────┘
                           │
    ┌──────────────┐       │     ┌───────────────────┐
    │health_cards  │       │     │health_complaints  │
    │FK user_id    │───────┘     │FK user_id         │
    │UK card_number│              │complaint_type     │
    │blood_group   │              │status             │
    │emergency_    │              └───────────────────┘
    │contact       │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │health_vaccin-│
    │ations        │
    │FK user_id    │
    │FK health_    │
    │card_id       │
    │vaccine_name  │
    │dose_number   │
    │status        │
    └──────────────┘
```

### Water Services ER Diagram (5 Tables)

```
    ┌──────────────────────┐
    │   water_projects     │
    │   PK id              │
    │   project_name       │
    │   project_type       │
    │   budget             │
    │   status             │
    └──────────────────────┘

    ┌───────────────────────────────────────────────────────┐
    │                 water_connections                      │
    │  PK id | FK user_id → reg_info                        │
    │  UK connection_number                                 │
    │  connection_type: Residential|Commercial|Industrial   │
    │  meter_number, status                                 │
    └───────────────────┬───────────────────────────────────┘
                        │
                        ▼
    ┌───────────────────────────────────────────────────────┐
    │               water_bill_payments                     │
    │  PK id | FK user_id | FK connection_id                │
    │  billing_month, consumption_units                     │
    │  amount, payment_status                               │
    └───────────────────────────────────────────────────────┘

    ┌───────────────────────┐     ┌───────────────────────┐
    │ water_quality_reports │     │  water_complaints     │
    │ FK user_id            │     │  FK user_id           │
    │ source_type           │     │  complaint_type       │
    │ water_color, odor     │     │  description          │
    │ test_result           │     │  status               │
    └───────────────────────┘     └───────────────────────┘
```

### Education ER Diagram (5 Tables)

```
    ┌───────────────────────┐
    │   education_boards    │
    │   PK id               │
    │   UK code             │
    │   board_name          │
    └───────────┬───────────┘
                │
       ┌────────┼────────┬─────────────────┐
       ▼        ▼        ▼                 ▼
    ┌───────┐┌───────┐┌───────┐   ┌────────────────────┐
    │jsc_   ││ssc_   ││hsc_   │   │education_          │
    │results││results││results│   │institutions        │
    │       ││       ││       │   │                    │
    │FK     ││FK     ││FK     │   │FK board_id         │
    │board_ ││board_ ││board_ │   │institution_name    │
    │id     ││id     ││id     │   │eiin_number         │
    │roll_no││roll_no││roll_no│   └────────────────────┘
    │gpa    ││gpa    ││gpa    │
    │year   ││year   ││year   │
    └───────┘└───────┘└───────┘
```

### University Admission ER Diagram (3 Tables)

```
    ┌───────────────────────┐
    │     universities      │
    │   PK id               │
    │   UK code             │
    │   name, type          │
    │   location, website   │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │   admission_posts     │
    │   PK id               │
    │   FK university_id    │
    │   title               │
    │   academic_year       │
    │   application_fee     │
    │   deadline            │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────────────────────────────┐
    │          university_applications              │
    │   PK id | UK application_id                   │
    │   FK admission_post_id                        │
    │   applicant_name, hsc_roll, hsc_year, hsc_gpa │
    │   payment_status, application_status          │
    │   UNIQUE (admission_post_id, hsc_roll, year)  │
    └───────────────────────────────────────────────┘
```

### Agriculture ER Diagram (6 Tables)

```
    ┌───────────────────────┐     ┌───────────────────────┐
    │   agri_subsidies      │     │   agri_crop_reports   │
    │   FK user_id(implicit)│     │   FK user_id(implicit)│
    │   FK division_id      │     │   FK division_id      │
    │   FK district_id      │     │   FK district_id      │
    │   FK upazila_id       │     │   FK upazila_id       │
    │   subsidy_type        │     │   crop_name           │
    │   amount_requested    │     │   yield_metric_ton    │
    │   land_size_acres     │     │   season              │
    │   status              │     │   production_area     │
    └───────────────────────┘     └───────────────────────┘

    ┌───────────────────────┐     ┌───────────────────────┐
    │ agri_expert_queries   │     │ agri_farmer_market    │
    │ PK id                 │     │ PK id                 │
    │ user_id, crop_type    │     │ user_id               │
    │ question, answer      │     │ product_name          │
    │ status                │     │ quantity, price_per_kg│
    └───────────────────────┘     │ market_type           │
                                  └───────────────────────┘

    ┌───────────────────────┐     ┌───────────────────────┐
    │agri_training_programs │     │agri_training_         │
    │ PK id                 │◄────│registrations          │
    │ program_name          │     │ FK program_id         │
    │ trainer_name          │     │ user_id               │
    │ max_participants      │     │ registration_date     │
    │ start_date, end_date  │     └───────────────────────┘
    └───────────────────────┘
```

### Community & Shop ER Diagram

```
    ┌───────────────────────────────────────────────────────┐
    │               community_groups                        │
    │  PK id | FK created_by → reg_info                     │
    │  name, description, cover_image                       │
    │  status: pending|approved|rejected                    │
    └───────────────┬───────────────────────────────────────┘
                    │
           ┌────────┴────────┐
           ▼                 ▼
    ┌──────────────┐  ┌──────────────────┐
    │community_    │  │community_posts   │
    │members       │  │                  │
    │FK group_id   │  │FK group_id       │
    │FK user_id    │  │FK user_id        │
    │role: member| │  │content           │
    │      admin   │  │image_url         │
    │UNIQUE(grp,   │  │like_count ◄──TRIGGER── post_likes
    │       user)  │  │comment_count◄─TRIGGER── post_comments
    └──────────────┘  └────────┬─────────┘
                               │
                      ┌────────┴────────┐
                      ▼                 ▼
               ┌────────────┐   ┌──────────────┐
               │post_likes  │   │post_comments │
               │FK post_id  │   │FK post_id    │
               │FK user_id  │   │FK user_id    │
               │UNIQUE(post,│   │content       │
               │       user)│   └──────────────┘
               └────────────┘


    ┌───────────────┐     ┌────────────────┐     ┌──────────────┐
    │  shop_items   │◄────│  cart_items /   │     │ Ordered_item │
    │  PK id        │     │  addto_cart     │     │ PK id        │
    │  name         │     │  FK user_nid    │     │ FK user_id   │
    │  price        │     │  FK item_id     │     │ product_     │
    │  stock_qty    │     │  quantity       │     │ details(JSON)│
    │  image_url    │     └────────────────┘     │ payment_     │
    └───────────────┘                             │ status       │
                                                  └──────┬───────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │ order_items   │
                                                  │ FK order_id   │
                                                  │ FK item_id    │
                                                  │ quantity      │
                                                  │ price_at_time │
                                                  └──────────────┘
```

### Service Requests ER Diagram (20+ req tables)

```
    ┌───────────────────────────────────────────────────────────┐
    │                   service_requests                         │
    │  PK id | FK user_id → reg_info                            │
    │  service_type | details | evidence_link                   │
    │  status: pending|approved|rejected                        │
    │  notification_read                                        │
    │  TRIGGER: tr_service_request_status_change                │
    │           → Creates notification on status change         │
    └───────────────────────────────────────────────────────────┘
         │
         │  Each service_type maps to a specific req_* table:
         │
    ┌────┴────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  req_birth_cert_correction     req_business_company_reg             │
    │  req_death_cert_correction     req_business_trade_lic               │
    │  req_nid_correction            req_business_tin_certificate         │
    │  req_character_certificate     req_business_vat_reg                 │
    │  req_income_certificate        req_business_import_export           │
    │                                                                     │
    │  req_education_jsc             req_education_hsc                    │
    │  req_education_sss             req_education_transcript             │
    │  req_education_university_verification                              │
    │                                                                     │
    │  req_immigration_visa          req_immigration_passport_correction  │
    │  req_immigration_emigration_clearance                               │
    │                                                                     │
    │  req_legal_case    req_legal_complain    req_legal_gd               │
    │                                                                     │
    │  req_transport_driving_lic_correction                               │
    │  req_transport_driving_lic_renew                                    │
    │  req_transport_ownership_transfer                                   │
    │  req_transport_vehicle_reg_correction                               │
    │                                                                     │
    │  ALL have: PK id | FK user_id → reg_info | unique_number           │
    │            description | evidence_link | status | created_at        │
    └─────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────┐
    │                  completed_tasks                          │
    │  PK id | FK user_id → reg_info                            │
    │  service_type | original_request_id | unique_number       │
    │  status: Approved|Rejected | admin_comment                │
    └───────────────────────────────────────────────────────────┘
```

### Normalized / Support Tables ER Diagram

```
    ┌──────────────┐                      ┌──────────────────┐
    │address_types │                      │document_statuses │
    │PK id         │                      │PK id             │
    │UK type_name  │                      │UK status_name    │
    │(Permanent,   │                      │color_code        │
    │ Present,     │                      │(Pending=#F59E0B, │
    │ Office)      │                      │Approved=#10B981, │
    └──────┬───────┘                      │Rejected=#EF4444) │
           │                              └────────┬─────────┘
           ▼                                       │
    ┌──────────────┐                               │
    │  addresses   │                               │
    │FK user_id    │    ┌──────────────┐           │
    │FK address_   │    │payment_      │           │
    │  type_id     │    │methods       │           │
    │FK division_id│    │PK id         │           │
    │FK district_id│    │UK method_name│           │
    │FK upazila_id │    │processing_   │           │
    │village_area  │    │fee_percent   │           │
    │post_office   │    └──────┬───────┘           │
    │post_code     │           │                   │
    └──────────────┘           ▼                   │
                        ┌──────────────┐           │
                        │  payments    │           │
                        │FK user_id    │           │
                        │FK payment_   │           │
                        │  method_id   │───────────┘
                        │FK status_id  │
                        │service_type  │
                        │amount        │
                        │total_amount  │ (GENERATED: amount + processing_fee)
                        │UK transaction│
                        │  _id         │
                        └──────────────┘

    ┌───────────────────────────────────────────────────────────┐
    │                     audit_log                             │
    │  PK id (BIGINT)                                          │
    │  table_name | record_id | action: INSERT|UPDATE|DELETE   │
    │  old_values (JSON) | new_values (JSON)                   │
    │  changed_fields | user_id | session_id                   │
    │  ip_address | user_agent | action_timestamp              │
    │  IDX: (table_name, record_id)                            │
    │  IDX: (user_id, action_timestamp)                        │
    └───────────────────────────────────────────────────────────┘
```

---

## 6. All Tables — Complete Schema Reference

### 6.1 Core User Tables

| # | Table | PK | Key Columns | Foreign Keys | Purpose |
|---|-------|----|-------------|-------------|---------|
| 1 | `reg_info` | `id` | name, nid(UK), email(UK), password, mobile, dob, gender, address, photo_url, reset_otp | — | Central user registration (all citizens) |
| 2 | `user_info` | `id` | user_id(UK), name, email, nid, mobile, dob, address, gender, profile_image | FK user_id → reg_info | Extended user profile (synced via trigger) |
| 3 | `login_logs` | `id` | user_id, ip_address, user_agent, login_time | FK user_id → reg_info | User login audit trail |
| 4 | `edit_req` | `id` | user_id, edited_by, edited_fields, old_values, new_values, edited_at | FK user_id → reg_info | Profile edit audit |
| 5 | `notifications` | `id` | user_id, type, message, is_read, created_at | FK user_id → reg_info | In-app notifications |
| 6 | `todos` | `id` | user_id, title, description, status(todo/progress/done) | FK user_id → reg_info | Kanban task board |

### 6.2 Admin Tables

| # | Table | PK | Key Columns | Foreign Keys | Purpose |
|---|-------|----|-------------|-------------|---------|
| 7 | `admins` | `id` | name, email(UK), password, mobile, status(pending/approved/rejected) | — | Admin accounts with approval workflow |
| 8 | `admin_login_logs` | `id` | admin_id, login_time, ip_address, status, failure_reason | FK admin_id → admins | Admin login audit |
| 9 | `admin_actions_log` | `id` | admin_id, action_type, target_table, target_id, old/new_status, notes | FK admin_id → admins | Admin action audit trail |

### 6.3 Geographic Tables

| # | Table | PK | Key Columns | Records | Purpose |
|---|-------|----|-------------|---------|---------|
| 10 | `divisions` | `id` | name(UK) | 8 | Dhaka, Chittagong, Rajshahi, Khulna, Barisal, Sylhet, Rangpur, Mymensingh |
| 11 | `districts` | `id` | FK division_id, name | 64 | All Bangladesh districts |
| 12 | `upazilas` | `id` | FK district_id, name | 490+ | All Bangladesh upazilas |

### 6.4 Document Tables

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 13 | `govt_user_documents` | `id` | FK user_id, doc_category, identity_number, file_path, status, expiry_date, verified_by | Official documents (NID, Passport, Tax, etc.) |
| 14 | `user_documents` | `id` | FK user_id, doc_type, doc_name, file_path, status, admin_comment | Personal document uploads |

### 6.5 Service Request Tables

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 15 | `service_requests` | `id` | FK user_id, service_type, details, status, evidence_link | Central service tracking |
| 16 | `completed_tasks` | `id` | FK user_id, service_type, original_request_id, unique_number, status | Completed service archive |
| 17-36 | `req_birth_cert_correction` through `req_transport_vehicle_reg_correction` | `id` | FK user_id, unique_number, description, evidence_link, status | 20 specialized request tables (one per service) |

### 6.6 NID Wing Tables (14)

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 37 | `nid_profiles` | `id` | FK user_id, nid_number(UK), name_bn/en, biometric flags, card_type, profile_status | Full NID citizen profile with Bengali/English |
| 38 | `nid_applications` | `id` | FK user_id, application_no(UK), type, status (10 stages), assigned_nid | New NID applications with full workflow |
| 39 | `nid_correction_requests` | `id` | FK user_id, request_no(UK), correction_type, field_to_correct, current/new value | NID data correction requests |
| 40 | `nid_reissue_requests` | `id` | FK user_id, request_no(UK), reissue_type(Lost/Damaged/Expired), gd_number | NID card reissue applications |
| 41 | `nid_smart_card_requests` | `id` | FK user_id, current_nid, preferred_center, status | Smart card upgrade requests |
| 42 | `nid_address_change_requests` | `id` | FK user_id, change_type(Present/Permanent/Both), new address fields | Address change on NID |
| 43 | `nid_verifications` | `id` | FK user_id, nid_to_verify, verification_purpose, result | NID verification service |
| 44 | `nid_appointments` | `id` | FK user_id, center_id, slot_date, slot_time, purpose, status | Biometric appointment slots |
| 45 | `nid_family_members` | `id` | FK user_id, member_nid, relationship, member_name | Family linkage on NID |
| 46 | `nid_activity_log` | `id` | FK user_id, activity_type, description, ip_address | NID service activity audit |
| 47 | `nid_collection_centers` | `id` | center_name, division, district, address, daily_capacity | Biometric collection points |
| 48 | `nid_fees` | `id` | service_type, fee_amount, description | NID service fee schedule |
| 49 | `nid_cards` | `id` | FK citizen_id, nid_number(UK), issue_date, expiry_date, smart_card_status | Issued NID cards |
| 50 | `nid_corrections` | `id` | FK user_id, nid_number, field_name, corrected_value, status | Simple correction table |

### 6.7 Passport Tables (5)

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 51 | `passport_offices` | `id` | office_code(UK), office_name, office_name_bn, division, district | 15 Regional Passport Offices |
| 52 | `passport_fee_schedule` | `id` | passport_type, page_count, validity_years, delivery_type, fee_bdt | Fee lookup (12+ combinations) |
| 53 | `passport_applications` | `id` | FK user_id, application_number(UK), service_type, 60+ columns, 15 status stages | Full e-Passport application |
| 54 | `passport_books` | `id` | FK application_id, passport_number(UK), issue/expiry_date | Issued passport books |
| 55 | `passport_status_history` | `id` | FK application_id, old_status, new_status, changed_by, remarks | Status change audit trail |

### 6.8 Tax / NBR Tables (7)

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 56 | `nbr_tax_zones` | `id` | zone_code(UK), zone_name, circle_name, jurisdiction | Tax zone registry |
| 57 | `nbr_tin_registrations` | `id` | FK user_id, FK zone_id, tin_number(UK), taxpayer_type, status | TIN registration |
| 58 | `nbr_tax_returns` | `id` | FK user_id, FK tin_id, submission_ref(UK), tax_year, income, tax_due | Annual tax returns |
| 59 | `nbr_tax_payments` | `id` | FK user_id, FK return_id, receipt_no(UK), amount, payment_method | Tax payment records |
| 60 | `nbr_vat_registrations` | `id` | FK user_id, bin_number(UK), business_name, status | VAT/BIN registration |
| 61 | `nbr_tax_notices` | `id` | FK user_id, notice_type, subject, is_read | Tax notices to users |
| 62 | `nbr_tax_challan` | `id` | FK user_id, challan_no(UK), amount, bank_name | Tax payment challans |

### 6.9 Health Tables (6)

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 63 | `health_hospitals` | `id` | name, hospital_type, specializations, beds, emergency_24x7 | Hospital registry (22 columns) |
| 64 | `health_cards` | `id` | FK user_id, card_number(UK), blood_group, emergency_contact, status | Digital health cards |
| 65 | `health_vaccinations` | `id` | FK user_id, FK health_card_id, vaccine_name, dose_number, status | Vaccination records |
| 66 | `health_appointments` | `id` | FK user_id, FK hospital_id, doctor_name, appointment_date, status | Hospital appointments |
| 67 | `health_ambulance_requests` | `id` | FK user_id, pickup_location, emergency_type, status | Emergency ambulance |
| 68 | `health_complaints` | `id` | FK user_id, complaint_type, description, status | Health service complaints |

### 6.10 Water Tables (5)

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 69 | `water_connections` | `id` | FK user_id, connection_number(UK), connection_type, meter_number | WASA connections |
| 70 | `water_bill_payments` | `id` | FK user_id, FK connection_id, billing_month, amount, status | Water bill payments |
| 71 | `water_quality_reports` | `id` | FK user_id, source_type, water_color, odor, test_result | Water quality testing |
| 72 | `water_complaints` | `id` | FK user_id, complaint_type, description, status | Water service complaints |
| 73 | `water_projects` | `id` | project_name, project_type, budget, status | Infrastructure projects |

### 6.11 Education Tables (5)

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 74 | `education_boards` | `id` | code(UK), board_name | 11 education boards |
| 75 | `jsc_results` | `id` | FK board_id, roll_number, exam_year, gpa, UK(roll,year) | JSC exam results |
| 76 | `ssc_results` | `id` | FK board_id, roll_number, exam_year, gpa, UK(roll,year) | SSC exam results |
| 77 | `hsc_results` | `id` | FK board_id, roll_number, exam_year, gpa, UK(roll,year) | HSC exam results |
| 78 | `education_institutions` | `id` | FK board_id, institution_name, eiin_number | School/college registry |

### 6.12 University Admission Tables (3)

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 79 | `universities` | `id` | code(UK), name, type, location, website | University registry |
| 80 | `admission_posts` | `id` | FK university_id, title, academic_year, deadline, fee | Admission circulars |
| 81 | `university_applications` | `id` | FK admission_post_id, application_id(UK), hsc_roll, payment_status | Student applications |

### 6.13 Agriculture Tables (6)

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 82 | `agri_subsidies` | `id` | FK div/dist/upazila, subsidy_type, amount, land_size, status | Subsidy applications |
| 83 | `agri_crop_reports` | `id` | FK div/dist/upazila, crop_name, yield_metric_ton, season | Crop yield reporting |
| 84 | `agri_expert_queries` | `id` | user_id, crop_type, question, answer, status | Farmer expert Q&A |
| 85 | `agri_farmer_market` | `id` | user_id, product_name, quantity, price_per_kg | Farmer marketplace |
| 86 | `agri_training_programs` | `id` | program_name, trainer, max_participants, dates | Training catalog |
| 87 | `agri_training_registrations` | `id` | FK program_id, user_id, registration_date | Training enrollments |

### 6.14 Shop & Market Tables (6)

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 88 | `shop_items` | `id` | name, price, stock_quantity, image_url | Product catalog |
| 89 | `cart_items` / `addto_cart` | `id` | FK user_nid, FK item_id, quantity | Shopping cart |
| 90 | `Ordered_item` | `id` | FK user_id, total_amount, payment_method, product_details(JSON) | Orders |
| 91 | `order_items` | `id` | FK order_id, FK item_id, quantity, price_at_time | Order line items |
| 92 | `market_prices` | `id` | item_name, category, current_price, previous_price, effective_date | Daily market prices |
| 93 | `price_complaints` | `id` | user_id, complaint_text, status | Price complaints |

### 6.15 Community Tables (5)

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 94 | `community_groups` | `id` | FK created_by, name, description, cover_image, status | Community groups |
| 95 | `community_members` | `id` | FK group_id, FK user_id, role, UK(group,user) | Group membership |
| 96 | `community_posts` | `id` | FK group_id, FK user_id, content, like_count, comment_count | Group posts |
| 97 | `post_likes` | `id` | FK post_id, FK user_id, UK(post,user) | Post likes |
| 98 | `post_comments` | `id` | FK post_id, FK user_id, content | Post comments |

### 6.16 Other Tables

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 99 | `contact_messages` | `id` | FK user_id, subject, message | Contact form messages |
| 100 | `govt_notices` | `id` | FK created_by(admin), title, category, department, priority, status | Government notices |
| 101 | `stipends` | `id` | title, amount, eligibility_criteria, deadline | Available stipends |
| 102 | `stipend_applications` | `id` | FK stipend_id, application_no(UK), applicant_name, status | Stipend applications |
| 103 | `landtax` | `id` | UK transaction_id, nid, khatian_no, dag_no, tax_amount, payment_status | Land tax payments (SSLCommerz) |
| 104 | `tax_returns` | `id` | FK user_id, tax_year, income_amount, tax_paid | Legacy tax returns |
| 105 | `edu_admissions` | `id` | FK user_id, unit_name, status | Legacy education admissions |
| 106 | `health_vaccinations` (simple) | `id` | FK user_id, vaccine_name, status | Legacy vaccination |
| 107 | `water_issues` | — | FK user_id, description, status | Legacy water issues |
| 108 | `agri_crop_reports` (simple) | `id` | FK user_id, crop_name, yield, season | Legacy crop reports |
| 109 | `agri_subsidies` (simple) | `id` | FK user_id, subsidy_type, amount, status | Legacy subsidies |

### 6.17 Normalization / Lookup Tables

| # | Table | PK | Key Columns | Purpose |
|---|-------|----|-------------|---------|
| 110 | `address_types` | `id` | type_name(UK) | Address type lookup (Permanent/Present/Office) |
| 111 | `addresses` | `id` | FK user_id, FK address_type_id, FK div/dist/upazila, village, post_office, post_code | Normalized addresses |
| 112 | `document_statuses` | `id` | status_name(UK), color_code | Status lookup with UI colors |
| 113 | `payment_methods` | `id` | method_name(UK), processing_fee_percent | Payment method registry |
| 114 | `payments` | `id` | FK user_id, FK payment_method_id, FK status_id, service_type, amount, total_amount(GENERATED) | Unified payment ledger |
| 115 | `audit_log` | `id` | table_name, record_id, action, old/new_values(JSON), user_id, ip_address | Global audit trail |

---

## 7. Normalization (3NF)

### 7.1 Address Normalization

**Problem:** Addresses stored as unstructured text in `reg_info.address`, violating 1NF.

**Solution:** Created `address_types` + `addresses` with FK references to geographic hierarchy.

```sql
-- Address Types (Lookup Table)
CREATE TABLE address_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(50) UNIQUE NOT NULL -- 'Permanent', 'Present', 'Office'
);

-- Normalized Addresses (3NF - No transitive dependencies)
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
    UNIQUE KEY (user_id, address_type_id),   -- One address per type per user
    FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE,
    FOREIGN KEY (address_type_id) REFERENCES address_types(id),
    FOREIGN KEY (division_id) REFERENCES divisions(id),
    FOREIGN KEY (district_id) REFERENCES districts(id),
    FOREIGN KEY (upazila_id) REFERENCES upazilas(id)
);
```

**Normalization proof:**
- **1NF:** All columns are atomic (no multi-valued cells).
- **2NF:** All non-key attributes depend on the full composite key `(user_id, address_type_id)`.
- **3NF:** No transitive dependencies — `division_id` directly references `divisions`, not via a district string.

### 7.2 Document Status Normalization

**Problem:** `ENUM('Pending','Approved','Rejected')` repeated in 20+ tables — changes require ALTER TABLE on every table.

**Solution:** Single lookup table for statuses.

```sql
CREATE TABLE document_statuses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    color_code VARCHAR(7) DEFAULT '#6B7280'
);

INSERT INTO document_statuses (status_name, color_code) VALUES
('Pending', '#F59E0B'), ('Approved', '#10B981'), ('Rejected', '#EF4444');
```

### 7.3 Payment Normalization

**Problem:** Payment logic scattered across `landtax`, `passport_applications`, and `Ordered_item` — each with different amount/method columns.

**Solution:** Unified `payments` table with a computed column.

```sql
CREATE TABLE payment_methods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    method_name VARCHAR(50) UNIQUE NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    processing_fee_percent DECIMAL(5,2) DEFAULT 0.00
);

CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    payment_method_id INT NOT NULL,
    service_type VARCHAR(50) NOT NULL,        -- 'land_tax', 'passport_fee', etc.
    reference_table VARCHAR(50) NOT NULL,     -- polymorphic FK
    reference_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    processing_fee DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount + processing_fee) STORED,
    transaction_id VARCHAR(100) UNIQUE,
    status_id INT NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    FOREIGN KEY (status_id) REFERENCES document_statuses(id)
);
```

### 7.4 Audit Log Normalization

```sql
CREATE TABLE audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    old_values JSON,         -- Full row snapshot before change
    new_values JSON,         -- Full row snapshot after change
    changed_fields TEXT,     -- Comma-separated changed column names
    user_id INT,
    session_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_user_actions (user_id, action_timestamp)
);
```

---

## 8. Database Views (16)

### View 1: `v_citizen_profile` — Comprehensive Citizen Profile

Joins `reg_info` with NID, Passport, Tax documents, land records, service requests, and login activity into a single row per user.

```sql
CREATE OR REPLACE VIEW v_citizen_profile AS
SELECT 
    u.id AS user_id,
    u.name AS full_name,
    u.nid, u.email, u.mobile, u.gender, u.dob,
    TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) AS age,
    u.address, u.photo_url,
    u.created_at AS registration_date,
    
    nid_doc.identity_number AS nid_number,
    nid_doc.status AS nid_status,
    pass_doc.identity_number AS passport_number,
    pass_doc.status AS passport_status,
    tax_doc.identity_number AS tin_number,
    
    (SELECT COUNT(*) FROM my_land_record WHERE user_id = u.id) AS total_land_records,
    (SELECT COALESCE(SUM(land_size), 0) FROM my_land_record WHERE user_id = u.id) AS total_land_area,
    (SELECT COUNT(*) FROM service_requests WHERE user_id = u.id) AS total_requests,
    (SELECT COUNT(*) FROM service_requests WHERE user_id = u.id AND status = 'pending') AS pending_requests,
    (SELECT COUNT(*) FROM service_requests WHERE user_id = u.id AND status = 'approved') AS approved_requests,
    (SELECT COUNT(*) FROM login_logs WHERE user_id = u.id) AS total_logins,
    (SELECT MAX(login_time) FROM login_logs WHERE user_id = u.id) AS last_login

FROM reg_info u
LEFT JOIN govt_user_documents nid_doc ON u.id = nid_doc.user_id AND nid_doc.doc_category = 'NID'
LEFT JOIN govt_user_documents pass_doc ON u.id = pass_doc.user_id AND pass_doc.doc_category = 'Passport'
LEFT JOIN govt_user_documents tax_doc ON u.id = tax_doc.user_id AND tax_doc.doc_category = 'Tax';
```

### View 2: `v_land_by_location` — Land Aggregation by Geography

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
GROUP BY d.id, d.name, dist.id, dist.name, up.id, up.name
HAVING total_parcels > 0;
```

### View 3: `v_community_analytics` — Group Engagement Metrics

Calculates member count, post count, likes, comments, engagement score, and classifies groups by size (New/Small/Medium/Large/Very Large).

### View 4: `v_service_dashboard` — Daily Service Statistics

Aggregates daily service request counts, approval/rejection rates per service type, and unique user counts.

### View 5: `v_user_activity` — User Engagement Scoring

Computes an activity score = logins×1 + requests×3 + posts×5 + comments×2 + groups×3, then classifies users as New/Regular/Active/Power User.

### View 6: `v_user_land_details` — Per-User Land Summary

Aggregated land holdings with comma-separated divisions, khatian numbers, and date ranges.

### View 7: `v_shop_product_inventory` — Product Performance

Combines product data with sales from JSON, cart stats, inventory status, and popularity score.

### View 8: `v_user_purchase_history` — Customer Shopping Summary

Orders, revenue, cart status, and customer tier classification (VIP/Premium/Regular/New/Prospect).

### View 9: `v_education_yearly_analysis` — Exam Result Analytics

Yearly pass rates, GPA distribution, and GPA 5.0 counts for JSC/SSC/HSC.

### View 10: `v_education_board_analysis` — Board Performance Ranking

Board-wise performance per exam type/year with `RANK()` window function.

### View 11: `v_education_institution_analysis` — Institution Tier System

Institution-level pass rate, golden GPA rate, tier classification (Tier 1-5), and ranking.

### View 12: `v_education_top_performers` — GPA 5.0 Students

Lists all students with perfect GPA 5.00 across all exam types.

### View 13: `v_agri_district_summary` — Agriculture by District

Per-district crop reports and subsidies with productivity rating.

### View 14: `v_agri_training_summary` — Training Program Analytics

Registration fill rate, attendance rate, and demand level classification.

---

## 9. Triggers (14)

### Trigger Summary Table

| # | Trigger | Event | Table | Action |
|---|---------|-------|-------|--------|
| 1 | `tr_service_request_status_change` | AFTER UPDATE | `service_requests` | Creates notification when status changes to approved/rejected |
| 2 | `tr_like_insert` | AFTER INSERT | `post_likes` | Increments `community_posts.like_count` |
| 3 | `tr_like_delete` | AFTER DELETE | `post_likes` | Decrements `community_posts.like_count` |
| 4 | `tr_comment_insert` | AFTER INSERT | `post_comments` | Increments `community_posts.comment_count` |
| 5 | `tr_comment_delete` | AFTER DELETE | `post_comments` | Decrements `community_posts.comment_count` |
| 6 | `tr_land_mutation_audit_update` | AFTER UPDATE | `land_mutations_v2` | Writes JSON old/new values to `audit_log` |
| 7 | `tr_land_mutation_audit_insert` | AFTER INSERT | `land_mutations_v2` | Logs new mutation to `audit_log` |
| 8 | `tr_member_join_notify` | AFTER INSERT | `community_members` | Notifies group creator when a new member joins |
| 9 | `tr_sync_user_info` | AFTER UPDATE | `reg_info` | Syncs changed fields to `user_info` table |
| 10 | `tr_document_upload_log` | AFTER INSERT | `govt_user_documents` | Creates `service_requests` entry on document upload |
| 11 | `tr_order_placed_notify` | AFTER INSERT | `Ordered_item` | Creates notification when order is placed |
| 12 | `tr_clear_cart_on_order` | AFTER INSERT | `Ordered_item` | Clears user's cart after order placement |
| 13 | `tr_shop_order_audit_insert` | AFTER INSERT | `Ordered_item` | Logs new order to `audit_log` |
| 14 | `after_mutation_approval` | AFTER UPDATE | `land_mutations_v2` | Transfers land ownership to buyer on approval |

### Detailed Trigger: Land Mutation Approval (Most Complex)

```
TRIGGER: after_mutation_approval
EVENT:   AFTER UPDATE on land_mutations_v2
CONDITION: NEW.status = 'Approved' AND OLD.status != 'Approved'

FLOW:
  1. Find buyer in reg_info by buyer_nid
  2. INSERT new my_land_record for buyer
     (copies land details from mutation)
  3. Check if full or partial transfer:
     a. Full → DELETE seller's my_land_record
     b. Partial → UPDATE seller's land_size
  4. UPDATE service_requests to 'approved'
```

### Detailed Trigger: Like Counter

```sql
-- Increment on like
CREATE TRIGGER tr_like_insert AFTER INSERT ON post_likes
FOR EACH ROW
    UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;

-- Decrement on unlike
CREATE TRIGGER tr_like_delete AFTER DELETE ON post_likes
FOR EACH ROW
    UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
```

---

## 10. Stored Procedures (4)

### Procedure 1: `sp_get_user_report(p_user_id)`

Returns **6 result sets** in one call:

```sql
CALL sp_get_user_report(1);

-- Result Set 1: User basic info (name, email, nid, age, registration date)
-- Result Set 2: All documents (NID, Passport, Tax with statuses)
-- Result Set 3: Land records with division/district/upazila resolved
-- Result Set 4: Service request history with counts
-- Result Set 5: Login history (last 50 entries)
-- Result Set 6: Community activity (groups, posts, likes given)
```

### Procedure 2: `sp_process_land_mutation(p_mutation_id, p_new_status, p_admin_notes)`

Transaction-controlled land mutation processing:

```
BEGIN TRANSACTION
  │
  ├── IF p_new_status = 'Approved':
  │   ├── Find buyer by NID in reg_info
  │   ├── INSERT into my_land_record (new owner)
  │   ├── UPDATE/DELETE seller's my_land_record
  │   ├── INSERT notification for buyer
  │   ├── INSERT notification for seller
  │   └── INSERT into audit_log
  │
  ├── ELSE IF p_new_status = 'Rejected':
  │   ├── INSERT notification for applicant
  │   └── INSERT into audit_log
  │
  └── UPDATE land_mutations_v2 SET status = p_new_status
COMMIT
```

### Procedure 3: `sp_monthly_statistics(p_year, p_month)`

Returns **6 result sets** of monthly analytics:

```sql
CALL sp_monthly_statistics(2026, 1);

-- Result Set 1: User registrations (new vs total)
-- Result Set 2: Service requests by type (counts + approval rates)
-- Result Set 3: Land mutations by division (value totals)
-- Result Set 4: Community activity (new groups, posts, engagement)
-- Result Set 5: Document submissions (by category)
-- Result Set 6: Daily trend (registrations + requests per day)
```

### Procedure 4: `sp_search_citizens(p_name, p_nid, p_email, p_mobile, p_division_id, p_limit)`

Flexible multi-criteria search with dynamic WHERE:

```sql
CALL sp_search_citizens('Rahman', NULL, NULL, NULL, NULL, 20);
-- Returns matching citizens with service_count and land_count
```

---

## 11. Complex Queries (12)

### Query 1: Hierarchical Location Report with ROLLUP

```sql
SELECT 
    COALESCE(d.name, '=== GRAND TOTAL ===') AS division,
    COALESCE(dist.name, '--- Division Total ---') AS district,
    COUNT(DISTINCT m.id) AS total_mutations,
    SUM(m.land_price) AS total_value,
    GROUP_CONCAT(DISTINCT m.tracking_number) AS tracking_numbers
FROM divisions d
LEFT JOIN districts dist ON d.id = dist.division_id
LEFT JOIN land_mutations_v2 m ON dist.id = m.district_id
GROUP BY d.name, dist.name WITH ROLLUP;
```

**Techniques:** `WITH ROLLUP` (automatic subtotals/grand totals), `GROUP_CONCAT`, `COALESCE` for null-label substitution.

### Query 2: Running Totals with Window Functions

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
    RANK() OVER (PARTITION BY DATE(created_at) ORDER BY COUNT(*) DESC) AS daily_rank,
    LAG(COUNT(*)) OVER (PARTITION BY service_type ORDER BY DATE(created_at)) AS prev_day_count,
    AVG(COUNT(*)) OVER (
        PARTITION BY service_type 
        ORDER BY DATE(created_at) 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7day
FROM service_requests
GROUP BY DATE(created_at), service_type;
```

**Techniques:** `SUM() OVER`, `RANK() OVER`, `LAG()`, 7-day moving average.

### Query 3: User Engagement Score with Multi-CTE

```sql
WITH 
login_stats AS (...),
service_stats AS (...),
community_stats AS (...),
document_stats AS (...),
land_stats AS (...),
todo_stats AS (...),
combined AS (
    SELECT u.id, u.name,
        COALESCE(ls.login_count, 0) * 1 +
        COALESCE(ss.service_count, 0) * 3 +
        COALESCE(cs.post_count, 0) * 5 +
        COALESCE(cs.comment_count, 0) * 2 AS engagement_score
    FROM reg_info u
    LEFT JOIN login_stats ls ON u.id = ls.user_id
    LEFT JOIN service_stats ss ON u.id = ss.user_id
    LEFT JOIN community_stats cs ON u.id = cs.user_id
)
SELECT *,
    NTILE(4) OVER (ORDER BY engagement_score DESC) AS quartile,
    PERCENT_RANK() OVER (ORDER BY engagement_score) AS percentile,
    ROW_NUMBER() OVER (ORDER BY engagement_score DESC) AS rank
FROM combined;
```

**Techniques:** 7 chained CTEs, `NTILE()`, `PERCENT_RANK()`, `ROW_NUMBER()`, weighted scoring.

### Query 4: Document Expiry Alert System

```sql
SELECT name, 'NID' AS doc_type, expiry_date,
    DATEDIFF(expiry_date, CURDATE()) AS days_until_expiry,
    CASE 
        WHEN expiry_date < CURDATE() THEN 'EXPIRED'
        WHEN DATEDIFF(expiry_date, CURDATE()) <= 30 THEN 'CRITICAL'
        WHEN DATEDIFF(expiry_date, CURDATE()) <= 90 THEN 'WARNING'
        ELSE 'OK'
    END AS alert_level
FROM reg_info u JOIN govt_user_documents g ON u.id = g.user_id
WHERE g.doc_category = 'NID'
UNION ALL
SELECT name, 'Passport', expiry_date, ...
ORDER BY days_until_expiry ASC;
```

**Techniques:** `UNION ALL`, multi-level `CASE`, date arithmetic.

### Query 5: Monthly Service Pivot Table

```sql
SELECT 
    COALESCE(service_type, '=== TOTAL ===') AS service_type,
    SUM(CASE WHEN MONTH(created_at) = 1 THEN 1 ELSE 0 END) AS Jan,
    SUM(CASE WHEN MONTH(created_at) = 2 THEN 1 ELSE 0 END) AS Feb,
    SUM(CASE WHEN MONTH(created_at) = 3 THEN 1 ELSE 0 END) AS Mar,
    -- ... (all 12 months)
    COUNT(*) AS Total
FROM service_requests
GROUP BY service_type WITH ROLLUP;
```

**Techniques:** Manual pivot via conditional `SUM(CASE)`, `WITH ROLLUP` for totals.

### Query 6: Recursive CTE — Location Hierarchy

```sql
WITH RECURSIVE location_tree AS (
    SELECT id, name, 'Division' AS level, 0 AS depth,
           CAST(name AS CHAR(500)) AS path
    FROM divisions
    UNION ALL
    SELECT d.id, d.name, 'District', lt.depth + 1,
           CONCAT(lt.path, ' > ', d.name)
    FROM districts d JOIN location_tree lt ON d.division_id = lt.id
    WHERE lt.level = 'Division'
    UNION ALL
    SELECT u.id, u.name, 'Upazila', lt.depth + 1,
           CONCAT(lt.path, ' > ', u.name)
    FROM upazilas u JOIN location_tree lt ON u.district_id = lt.id
    WHERE lt.level = 'District'
)
SELECT *, (SELECT COUNT(*) FROM land_mutations_v2 m WHERE m.upazila_id = location_tree.id
           AND level = 'Upazila') AS mutation_count
FROM location_tree ORDER BY path;
```

**Techniques:** `WITH RECURSIVE`, path building, correlated subquery.

### Query 7: Top Performers per Community Group

Uses `ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY activity DESC)` to find top 3 active users per group.

### Query 8: Division Performance Dashboard

Multi-level CTE with `RANK()` functions for land value, user count, and services per division.

### Query 9: Shop Sales Analytics

2 CTEs with running totals, `LAG()` for trend detection, 7-day moving average.

### Query 10: Product Performance with ROLLUP

`WITH ROLLUP` across 3 dimensions (product × payment_status × payment_method).

### Query 11: Customer Purchase Pattern

`ROW_NUMBER()`, `LAG()`, cumulative spend, `NTILE(4)` for spending quartiles.

### Query 12: Revenue Trend Pivot

Monthly revenue pivot by payment method with `WITH ROLLUP`.

---

## 12. REST API — All 327 Endpoints

### Authentication (`/api/auth`) — 4 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register new citizen |
| POST | `/api/auth/login` | Public | Login, receive JWT |
| POST | `/api/auth/send-reset-otp` | Public | Send OTP to email |
| POST | `/api/auth/reset-password-verify` | Public | Verify OTP & reset password |

### User Profile (`/api/user`) — 3 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/profile` | JWT | Get own profile |
| PUT | `/api/user/profile` | JWT | Update profile fields |
| POST | `/api/user/profile/photo` | JWT + Multer | Upload profile photo |

### Dashboard (`/api/dashboard`) — 18 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard/summary` | JWT | Dashboard stats & profile |
| GET | `/api/dashboard/todos` | JWT | Get Kanban tasks |
| POST | `/api/dashboard/todos` | JWT | Create task |
| PUT | `/api/dashboard/todos/:id/move` | JWT | Move task status |
| DELETE | `/api/dashboard/todos/:id` | JWT | Delete task |
| GET | `/api/dashboard/departments` | JWT | List government departments |
| POST | `/api/dashboard/services/request` | JWT | Submit service request |
| GET | `/api/dashboard/services/active` | JWT | Active service requests |
| PUT | `/api/dashboard/services/status` | JWT | Approve/reject request |
| GET | `/api/dashboard/services/completed` | JWT | Completed tasks |
| GET | `/api/dashboard/notifications` | JWT | All notifications |
| PUT | `/api/dashboard/notifications/:id/read` | JWT | Mark notification read |
| GET | `/api/dashboard/documents` | JWT | Official documents |
| POST | `/api/dashboard/documents/upload-official` | JWT + Multer | Upload official doc |
| POST | `/api/dashboard/documents/upload` | JWT + Multer | Upload personal doc |
| GET | `/api/dashboard/documents/user` | JWT | User documents |
| PUT | `/api/dashboard/documents/update/:id` | JWT + Multer | Update document |
| GET | `/api/dashboard/history` | JWT | Service request history |

### NID Wing (`/api/nid`) — 33 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/nid/centers` | Public | List collection centers |
| GET | `/api/nid/fees` | Public | NID fee schedule |
| POST | `/api/nid/verify-public` | Public | Public NID verification |
| GET | `/api/nid/locations/divisions` | JWT | Division list |
| GET | `/api/nid/locations/districts/:divId` | JWT | Districts by division |
| GET | `/api/nid/locations/upazilas/:distId` | JWT | Upazilas by district |
| GET | `/api/nid/dashboard` | JWT | NID dashboard stats |
| GET | `/api/nid/profile` | JWT | NID profile |
| POST | `/api/nid/profile` | JWT + Upload | Create/update NID profile |
| GET | `/api/nid/corrections` | JWT | My correction requests |
| POST | `/api/nid/corrections` | JWT + Upload | Submit correction |
| GET | `/api/nid/corrections/:requestNo` | JWT | Track correction |
| GET | `/api/nid/reissue` | JWT | My reissue requests |
| POST | `/api/nid/reissue` | JWT + Upload | Submit reissue |
| GET | `/api/nid/smart-card` | JWT | Smart card requests |
| POST | `/api/nid/smart-card` | JWT | Apply for smart card |
| GET | `/api/nid/address-change` | JWT | Address change requests |
| POST | `/api/nid/address-change` | JWT + Upload | Submit address change |
| GET | `/api/nid/verifications` | JWT | My verifications |
| POST | `/api/nid/verify` | JWT | Request NID verification |
| GET | `/api/nid/appointments` | JWT | My appointments |
| POST | `/api/nid/appointments` | JWT | Book appointment |
| GET | `/api/nid/appointments/slots/:centerId/:date` | JWT | Available slots |
| GET | `/api/nid/family` | JWT | Family members |
| POST | `/api/nid/family` | JWT | Add family member |
| DELETE | `/api/nid/family/:id` | JWT | Remove family member |
| GET | `/api/nid/activity-log` | JWT | Activity history |
| GET | `/api/nid/all-applications` | JWT | All NID applications |
| GET | `/api/nid/track/:refNo` | JWT | Track by reference |
| GET | `/api/nid/admin/stats` | Admin | NID statistics |
| GET | `/api/nid/admin/applications` | Admin | All applications |
| GET | `/api/nid/admin/application/:refNo` | Admin | Application detail |
| POST | `/api/nid/admin/update-status` | Admin | Update application status |

### Passport (`/api/passport`) — 23 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/passport/offices` | Public | Regional passport offices |
| GET | `/api/passport/fees` | Public | Fee schedule |
| GET | `/api/passport/fee/calculate` | Public | Calculate fee |
| POST | `/api/passport/payment/success/:tran_id` | SSLCommerz | Payment success callback |
| POST | `/api/passport/payment/fail/:tran_id` | SSLCommerz | Payment failure callback |
| POST | `/api/passport/payment/cancel/:tran_id` | SSLCommerz | Payment cancel callback |
| GET | `/api/passport/locations/*` | JWT | Location lookups (3 routes) |
| POST | `/api/passport/apply` | JWT | Submit application |
| POST | `/api/passport/upload-documents/:appId` | JWT + Upload | Upload documents |
| GET | `/api/passport/my-applications` | JWT | My applications |
| GET | `/api/passport/application/:id` | JWT | Application detail |
| GET | `/api/passport/track/:appNumber` | JWT | Track by number |
| PUT | `/api/passport/application/:id/cancel` | JWT | Cancel application |
| POST | `/api/passport/payment/init` | JWT | Initialize payment |
| POST | `/api/passport/application/:id/payment` | JWT | Record payment |
| GET | `/api/passport/stats` | JWT | My passport stats |
| GET | `/api/passport/recent-activity` | JWT | Recent activity |
| GET | `/api/passport/admin/applications` | Admin | All applications |
| GET | `/api/passport/admin/application/:id` | Admin | Application detail |
| PUT | `/api/passport/admin/application/:id/status` | Admin | Update status |
| GET | `/api/passport/admin/stats` | Admin | System statistics |

### Tax / NBR (`/api/tax`) — 14 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tax/dashboard` | JWT | Tax dashboard summary |
| POST | `/api/tax/tin/apply` | JWT | Apply for TIN |
| GET | `/api/tax/tin/status` | JWT | TIN application status |
| POST | `/api/tax/returns/file` | JWT | File tax return |
| GET | `/api/tax/returns` | JWT | My tax returns |
| POST | `/api/tax/payments/pay` | JWT | Make tax payment |
| GET | `/api/tax/payments` | JWT | Payment history |
| POST | `/api/tax/vat/register` | JWT | Register for VAT |
| GET | `/api/tax/vat/status` | JWT | VAT status |
| GET | `/api/tax/zones` | JWT | Tax zone list |
| GET | `/api/tax/notices` | JWT | My tax notices |
| PUT | `/api/tax/notices/:id/read` | JWT | Mark notice read |
| POST | `/api/tax/challan` | JWT | Generate challan |
| GET | `/api/tax/challan` | JWT | My challans |

### Health (`/api/health`) — 40 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health/hospitals/browse` | Public | Browse hospitals |
| GET | `/api/health/locations/*` | JWT | Location lookups (3 routes) |
| GET | `/api/health/my-stats` | JWT | Health dashboard stats |
| GET | `/api/health/my-activity` | JWT | Recent health activity |
| POST | `/api/health/health-card/apply` | JWT | Apply for health card |
| GET | `/api/health/health-card/my` | JWT | My health card |
| POST | `/api/health/vaccination/register` | JWT | Register for vaccine |
| GET | `/api/health/vaccination/my` | JWT | My vaccinations |
| GET | `/api/health/hospitals` | JWT | Hospital list |
| GET | `/api/health/hospitals/:id` | JWT | Hospital detail |
| POST | `/api/health/appointment/book` | JWT | Book appointment |
| GET | `/api/health/appointment/my` | JWT | My appointments |
| PUT | `/api/health/appointment/cancel/:id` | JWT | Cancel appointment |
| POST | `/api/health/ambulance/request` | JWT | Request ambulance |
| GET | `/api/health/ambulance/my` | JWT | My ambulance requests |
| POST | `/api/health/complaint/submit` | JWT | Submit complaint |
| GET | `/api/health/complaint/my` | JWT | My complaints |
| GET | `/api/health/admin/stats` | Admin | Health statistics |
| GET/PUT | `/api/health/admin/health-cards/*` | Admin | Manage health cards (3 routes) |
| GET/PUT | `/api/health/admin/vaccinations/*` | Admin | Manage vaccinations (3 routes) |
| GET/PUT | `/api/health/admin/appointments/*` | Admin | Manage appointments (3 routes) |
| GET/PUT | `/api/health/admin/ambulance/*` | Admin | Manage ambulance (3 routes) |
| GET/PUT | `/api/health/admin/complaints/*` | Admin | Manage complaints (3 routes) |
| CRUD | `/api/health/admin/hospitals/*` | Admin | Hospital CRUD (5 routes) |

### Water (`/api/water`) — 33 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/water/projects/browse` | Public | Browse water projects |
| GET | `/api/water/locations/*` | JWT | Location lookups (3 routes) |
| GET | `/api/water/my-stats` | JWT | Water dashboard |
| GET | `/api/water/my-activity` | JWT | Recent water activity |
| POST | `/api/water/connection/apply` | JWT | Apply for connection |
| GET | `/api/water/connection/my-connections` | JWT | My connections |
| POST | `/api/water/bill/pay` | JWT | Pay water bill |
| GET | `/api/water/bill/my-bills` | JWT | My bills |
| POST | `/api/water/quality/report` | JWT | Report water quality |
| GET | `/api/water/quality/my-reports` | JWT | My quality reports |
| POST | `/api/water/complaint/submit` | JWT | Submit complaint |
| GET | `/api/water/complaint/my-complaints` | JWT | My complaints |
| GET | `/api/water/projects/list` | JWT | Project listing |
| CRUD | `/api/water/admin/connections/*` | Admin | Manage connections (3 routes) |
| CRUD | `/api/water/admin/bills/*` | Admin | Manage bills (3 routes) |
| CRUD | `/api/water/admin/quality/*` | Admin | Manage quality reports (3 routes) |
| CRUD | `/api/water/admin/complaints/*` | Admin | Manage complaints (3 routes) |
| CRUD | `/api/water/admin/projects/*` | Admin | Project CRUD (5 routes) |

### Agriculture (`/api/agriculture`) — 30 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/agriculture/market/browse` | Public | Browse market |
| GET | `/api/agriculture/training/programs` | Public | Training catalog |
| GET | `/api/agriculture/locations/*` | JWT | Location lookups (3 routes) |
| POST | `/api/agriculture/subsidy/apply` | JWT | Apply for subsidy |
| GET | `/api/agriculture/subsidy/my-history` | JWT | Subsidy history |
| POST | `/api/agriculture/crop-report/submit` | JWT | Submit crop report |
| GET | `/api/agriculture/crop-report/*` | JWT | Crop report views (2 routes) |
| POST | `/api/agriculture/expert/ask` | JWT | Ask expert question |
| GET | `/api/agriculture/expert/my-queries` | JWT | My expert queries |
| POST | `/api/agriculture/market/listing` | JWT | Create market listing |
| GET | `/api/agriculture/market/my-listings` | JWT | My listings |
| POST | `/api/agriculture/training/register/:programId` | JWT | Register for training |
| GET | `/api/agriculture/training/my-registrations` | JWT | My registrations |
| GET | `/api/agriculture/stats` | JWT | Agriculture stats |
| GET | `/api/agriculture/recent-activity` | JWT | Recent activity |
| CRUD | `/api/agriculture/admin/*` | JWT | Admin management (12 routes) |

### Education (`/api/education`) — 5 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/education/boards` | Public | All education boards |
| GET | `/api/education/results/:examType/:year/:roll` | Public | Look up JSC/SSC/HSC result |
| GET | `/api/education/years` | Public | Available exam years |
| GET | `/api/education/institutions/:boardId` | Public | Institutions by board |
| GET | `/api/education/institutions` | Public | All institutions |

### University Admission (`/api/university`) — 11 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/university/admissions` | Public | Active admission posts |
| GET | `/api/university/admissions/:id` | Public | Admission detail |
| GET | `/api/university/universities` | Public | University list |
| GET | `/api/university/verify-hsc/:roll/:year` | Public | Verify HSC result |
| POST | `/api/university/apply` | Public | Submit application |
| POST | `/api/university/payment/init` | Public | Initialize payment |
| POST | `/api/university/payment/success` | SSLCommerz | Payment success |
| POST | `/api/university/payment/fail` | SSLCommerz | Payment failure |
| POST | `/api/university/payment/cancel` | SSLCommerz | Payment cancel |
| GET | `/api/university/application/:id` | Public | Application status |
| GET | `/api/university/my-applications/:roll/:year` | Public | My applications |

### Community (`/api/community`) — 18 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/community/groups` | JWT | All approved groups |
| GET | `/api/community/my-groups` | JWT | My groups |
| POST | `/api/community/groups` | JWT + Upload | Create group |
| GET | `/api/community/groups/:id` | JWT | Group detail with posts |
| PUT | `/api/community/groups/:id` | JWT + Upload | Update group |
| POST | `/api/community/groups/:id/join` | JWT | Join group |
| POST | `/api/community/groups/:id/leave` | JWT | Leave group |
| POST | `/api/community/groups/:id/posts` | JWT + Upload | Create post |
| PUT | `/api/community/posts/:id` | JWT + Upload | Edit post |
| POST | `/api/community/posts/:id/like` | JWT | Toggle like |
| GET | `/api/community/posts/:id/comments` | JWT | Get comments |
| POST | `/api/community/posts/:id/comments` | JWT | Add comment |
| PUT | `/api/community/comments/:id` | JWT | Edit comment |
| DELETE | `/api/community/comments/:id` | JWT | Delete comment |
| GET | `/api/community/admin/groups` | JWT | Admin: all groups |
| PUT | `/api/community/admin/groups/:id` | JWT | Admin: approve/reject group |
| GET | `/api/community/admin/posts` | JWT | Admin: all posts |
| PUT | `/api/community/admin/posts/:id` | JWT | Admin: approve/reject post |

### Shop (`/api/shop`) — 13 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/shop/payment/success/:orderId` | SSLCommerz | Payment success |
| POST | `/api/shop/payment/fail/:orderId` | SSLCommerz | Payment failure |
| POST | `/api/shop/payment/cancel/:orderId` | SSLCommerz | Payment cancel |
| POST | `/api/shop/payment/ipn` | SSLCommerz | IPN callback |
| GET | `/api/shop/market-prices` | Public | Market prices |
| GET | `/api/shop/market-prices/categories` | Public | Price categories |
| GET | `/api/shop/items` | JWT | Shop items |
| GET | `/api/shop/cart` | JWT | My cart |
| POST | `/api/shop/cart` | JWT | Add to cart |
| DELETE | `/api/shop/cart/:id` | JWT | Remove from cart |
| POST | `/api/shop/order` | JWT | Place order |
| POST | `/api/shop/complaints` | JWT | Submit complaint |
| GET | `/api/shop/complaints/my` | JWT | My complaints |

### Departments (`/api/departments`) — 29 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/departments/agriculture/subsidy` | JWT | Agriculture subsidy |
| POST | `/api/departments/agriculture/report` | JWT | Agriculture report |
| GET | `/api/departments/agriculture/*` | JWT | Agriculture data (5 more) |
| GET/POST | `/api/departments/land/*` | JWT | Land services (7 routes) |
| GET/POST | `/api/departments/tax/*` | JWT | Tax services (3 routes) |
| POST | `/api/departments/nid/correction` | JWT | NID correction |
| POST | `/api/departments/nid/reissue` | JWT | NID reissue |
| GET/POST | `/api/departments/health/*` | JWT | Health services (2 routes) |
| GET/POST | `/api/departments/water/*` | JWT | Water services (2 routes) |
| GET/POST | `/api/departments/edu/*` | JWT | Education services (2 routes) |
| GET | `/api/departments/locations/*` | JWT | Locations (3 routes) |

### Reports (`/api/reports`) — 15 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reports/citizen-profile/:userId` | Admin | Citizen profile report |
| GET | `/api/reports/my-profile` | Admin | Current user profile |
| GET | `/api/reports/land-by-location` | Admin | Land by geographic hierarchy |
| GET | `/api/reports/community-analytics` | Admin | Community engagement report |
| GET | `/api/reports/service-dashboard` | Admin | Service request analytics |
| GET | `/api/reports/user-activity` | Admin | User activity scores |
| GET | `/api/reports/user-engagement-scores` | Admin | Engagement rankings |
| GET | `/api/reports/land-rollup` | Admin | ROLLUP land report |
| GET | `/api/reports/user-land-details` | Admin | User land summary |
| GET | `/api/reports/service-pivot` | Admin | Monthly pivot table |
| GET | `/api/reports/running-totals` | Admin | Running totals |
| GET | `/api/reports/division-performance` | Admin | Division dashboard |
| GET | `/api/reports/top-group-performers` | Admin | Top community users |
| GET | `/api/reports/audit-log` | Admin | Full audit trail |
| GET | `/api/reports/summary` | Admin | System-wide summary |

### Admin Auth (`/api/admin`) — 3 routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/register` | Public | Admin registration (pending approval) |
| POST | `/api/admin/login` | Public | Admin login |
| GET | `/api/admin/me` | Admin JWT | Current admin profile |

### Admin Management (`/api/admin`) — 55 routes

All routes require `adminMiddleware`. Key groups:

| Category | Routes | Description |
|----------|--------|-------------|
| Users | 2 | List users, new users |
| Service Requests | 2 | Approve/reject service requests |
| Land Mutations | 2 | Approve/reject mutations |
| Community Groups | 2 | Approve/reject groups |
| Community Posts | 2 | Approve/reject posts |
| Shop Items | 4 | CRUD shop products |
| Stipends | 4 | CRUD stipends + applications |
| Orders | 2 | List + update order status |
| Market Prices | 4 | CRUD market prices |
| Complaints | 2 | View + respond to complaints |
| Education | 7 | Boards, institutions, results CRUD |
| Universities | 7 | Universities, admissions, applications |
| Tax | 10 | Tax returns, TIN, payments, notices |

### Other Routes

| Route Group | Routes | Auth | Description |
|-------------|--------|------|-------------|
| `/api/stipends` | 3 | JWT | List stipends, my applications, apply |
| `/api/contact` | 1 | JWT | Submit contact message |
| `/api/notices` | 6 | Mixed | Public notices + admin CRUD |
| `/api/payment` | 3 | Public | Land tax SSLCommerz callbacks |

---

## 13. Authentication & Security

### Authentication Flow

```
┌──────────┐                    ┌──────────┐                 ┌──────────┐
│  Client  │                    │  Server  │                 │  MySQL   │
└─────┬────┘                    └─────┬────┘                 └─────┬────┘
      │                               │                            │
      │  POST /api/auth/register      │                            │
      │  {name, email, nid, password} │                            │
      │──────────────────────────────▶│                            │
      │                               │  bcrypt.hash(password, 10) │
      │                               │───────────────────────────▶│
      │                               │  INSERT reg_info + user_info
      │                               │◀───────────────────────────│
      │  { token: JWT, user: {...} }  │                            │
      │◀──────────────────────────────│                            │
      │                               │                            │
      │  POST /api/auth/login         │                            │
      │  {email, password}            │                            │
      │──────────────────────────────▶│                            │
      │                               │  SELECT * FROM reg_info    │
      │                               │  bcrypt.compare()          │
      │                               │  INSERT login_logs         │
      │                               │  jwt.sign({id, nid, email})│
      │  { token: JWT }              │                            │
      │◀──────────────────────────────│                            │
      │                               │                            │
      │  GET /api/dashboard/summary   │                            │
      │  Authorization: Bearer <JWT>  │                            │
      │──────────────────────────────▶│                            │
      │                               │  jwt.verify(token, SECRET) │
      │                               │  req.user = decoded        │
      │                               │  → Controller → MySQL      │
      │  { profile, stats }          │                            │
      │◀──────────────────────────────│                            │
```

### Password Reset Flow

```
User ──▶ POST /send-reset-otp {email, nid}
         │
         ├── Verify email + nid match in reg_info
         ├── Generate 6-digit OTP
         ├── Store OTP + expiry (5 min) in reg_info
         └── Send OTP via Nodemailer (Ethereal test)
         
User ──▶ POST /reset-password-verify {email, otp, newPassword}
         │
         ├── Verify OTP matches and not expired
         ├── bcrypt.hash(newPassword, 10)
         ├── UPDATE reg_info SET password, clear OTP
         └── Return success
```

### Security Layers

| Layer | Implementation | Details |
|-------|---------------|---------|
| **Helmet** | CSP, HSTS, X-Frame | Content Security Policy with whitelist |
| **CORS** | `cors()` | All origins allowed (development) |
| **Rate Limiting** | 100 req / 15 min per IP | Applied to `/api/*` |
| **JWT (User)** | `authMiddleware.js` | `Bearer` token, decoded to `req.user` |
| **JWT (Admin)** | `adminMiddleware.js` | Checks `isAdmin` flag + approval status |
| **Password Hashing** | bcrypt, 10 rounds | Applied on register + reset |
| **File Upload** | Multer, 5MB limit | Image-only filter (jpg/png/gif/webp) |
| **Input Validation** | express-validator | On auth routes (register/login) |

---

## 14. Module-Wise Feature Documentation

### Module 1: NID Registration Wing (জাতীয় পরিচয় নিবন্ধন)

**14 tables | 33 API endpoints | Full NID lifecycle**

Features:
- Full NID profile (Bengali + English) with photo, signature, biometrics
- New NID application with 10-stage status workflow
- Correction requests with document upload
- Reissue for lost/damaged/expired cards
- Smart card upgrade
- Address change requests
- NID verification service
- Biometric appointment booking with slot availability
- Family member linkage
- Activity logging
- Collection center directory with daily capacity
- Fee schedule management
- Admin dashboard with stats and application management

### Module 2: e-Passport System (Department of Immigration & Passports)

**5 tables | 23 API endpoints | SSLCommerz payments**

Features:
- 15 Regional Passport Office directory with Bengali names
- Dynamic fee calculator (type × pages × validity × delivery)
- Full passport application (60+ fields)
- 15-stage status tracking (Submitted → Delivered)
- SSLCommerz payment gateway integration
- Document upload (photo, NID scan, birth cert, old passport)
- Application tracking by number
- Passport book issuance
- Status history audit trail
- Admin review and status update

### Module 3: Land Records & Mutations

**3 tables | 7+ API endpoints | Trigger-based ownership transfer**

Features:
- Land record management (khatian, dag, mouza, jl_no)
- Land mutation application with buyer/seller details
- Tracking number generation
- Automated land transfer on mutation approval (trigger)
- Land tax payment via SSLCommerz
- Geographic hierarchy integration (division/district/upazila)
- Land search by khatian/dag/owner

### Module 4: Tax / NBR (National Board of Revenue)

**7 tables | 14 API endpoints**

Features:
- TIN (Tax Identification Number) registration
- Annual tax return filing with income brackets
- Tax payment processing with receipt generation
- VAT/BIN registration for businesses
- Tax zone directory
- Tax notice system (sent by admin, read by user)
- Challan generation for bank deposits

### Module 5: Health Services (DGHS)

**6 tables | 40 API endpoints | Full admin panel**

Features:
- Hospital registry (name, type, specializations, beds, emergency)
- Digital health card with card number, blood group, emergency contact
- Vaccination tracking with dose numbers
- Doctor appointment booking with hospital selection
- Emergency ambulance request system
- Health service complaint system
- Full admin CRUD for all health entities

### Module 6: Water Services (WASA)

**5 tables | 33 API endpoints | Full admin panel**

Features:
- Water connection application (Residential/Commercial/Industrial)
- Bill payment tracking by billing month
- Water quality reporting (source, color, odor, test result)
- Complaint system for water issues
- Infrastructure project tracking
- Admin management for connections, bills, quality, complaints, projects

### Module 7: Agriculture (DAE)

**6 tables | 30 API endpoints**

Features:
- Subsidy applications for farmers (with geographic data)
- Crop yield reporting by season and location
- Expert Q&A system (farmer asks, admin answers)
- Farmer marketplace (sell products with pricing)
- Training program catalog with registration
- Admin management for all agriculture services

### Module 8: Education Board Results

**5 tables | 5 API endpoints**

Features:
- 11 education boards (Dhaka, Rajshahi, Comilla, etc.)
- JSC, SSC, HSC exam result lookup by roll + year
- Institution directory by board
- GPA, marks by subject, grade distribution

### Module 9: University Admission

**3 tables | 11 API endpoints | SSLCommerz payments**

Features:
- University directory (Public/Private/National)
- Admission circular posting with deadlines
- HSC result verification before application
- Online application with SSLCommerz payment
- Application tracking

### Module 10: Community Platform

**5 tables | 18 API endpoints | Trigger-based counters**

Features:
- Group creation with cover image and approval workflow
- Member join/leave with role-based access
- Post creation with image upload
- Like/unlike toggle with automatic counter (triggers)
- Comment CRUD with automatic counter (triggers)
- Notification on member join (trigger)
- Admin moderation for groups and posts

### Module 11: Government e-Shop

**4-6 tables | 13 API endpoints | SSLCommerz payments**

Features:
- Product catalog with images and stock
- Shopping cart management
- Order placement with delivery address
- SSLCommerz payment integration (COD + Online)
- Cart auto-clear on order (trigger)
- Order notification (trigger)
- Order audit logging (trigger)
- Market price monitoring with categories

### Module 12: Admin Panel

**55+ API endpoints | Dedicated admin middleware**

Features:
- Admin registration with approval workflow
- JWT-based admin authentication
- User management (view all, new users)
- Service request approval/rejection
- Land mutation processing
- Community moderation
- Shop product CRUD
- Stipend management
- Order management
- Market price management
- Complaint handling
- Education result management
- University admission management
- Tax administration (returns, TIN, payments, notices)

---

## 15. Data Flow Diagrams

### Citizen Registration Data Flow

```
┌───────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser  │     │  Express │     │Controller│     │  MySQL   │
│ register  │     │  Router  │     │  Auth    │     │  Pool    │
│  .html    │     │          │     │          │     │          │
└─────┬─────┘     └─────┬────┘     └─────┬────┘     └─────┬────┘
      │                 │               │               │
      │  POST /api/auth/register       │               │
      │  {name,email,nid,password,...} │               │
      │────────────────▶│               │               │
      │                 │               │               │
      │                 │  Validate     │               │
      │                 │  (express-    │               │
      │                 │   validator)  │               │
      │                 │──────────────▶│               │
      │                 │               │               │
      │                 │               │ bcrypt.hash() │
      │                 │               │               │
      │                 │               │ INSERT INTO   │
      │                 │               │ reg_info      │
      │                 │               │──────────────▶│
      │                 │               │               │
      │                 │               │ INSERT INTO   │
      │                 │               │ user_info     │
      │                 │               │──────────────▶│
      │                 │               │               │
      │                 │               │ jwt.sign()    │
      │                 │               │               │
      │  {token, user}  │               │               │
      │◀────────────────│◀──────────────│               │
```

### Passport Application Data Flow

```
┌────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│Citizen │   │  Router  │   │  Route   │   │  MySQL   │   │SSLCommerz│
│Browser │   │middleware│   │ Handler  │   │   DB     │   │ Gateway  │
└───┬────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
    │             │              │              │              │
    │ POST /api/passport/apply  │              │              │
    │────────────▶│              │              │              │
    │             │  JWT verify  │              │              │
    │             │─────────────▶│              │              │
    │             │              │ Calculate    │              │
    │             │              │ fee from     │              │
    │             │              │ fee_schedule │              │
    │             │              │─────────────▶│              │
    │             │              │              │              │
    │             │              │ INSERT INTO  │              │
    │             │              │ passport_    │              │
    │             │              │ applications │              │
    │             │              │─────────────▶│              │
    │ {appId,     │              │              │              │
    │  appNumber} │              │              │              │
    │◀────────────│◀─────────────│              │              │
    │             │              │              │              │
    │ POST /api/passport/payment/init          │              │
    │────────────▶│              │              │              │
    │             │              │ SSLCommerz   │              │
    │             │              │ init()       │              │
    │             │              │─────────────────────────────▶│
    │             │              │              │   GatewayURL│
    │             │              │◀─────────────────────────────│
    │ {GatewayURL}│              │              │              │
    │◀────────────│              │              │              │
    │             │              │              │              │
    │ Redirect to SSLCommerz payment page           │              │
    │─────────────────────────────────────────────────────────▶│
    │             │              │              │              │
    │ POST /payment/success/:tran_id (callback)     │              │
    │             │              │──────────────│              │
    │             │              │ UPDATE       │              │
    │             │              │ payment_     │              │
    │             │              │ status       │              │
    │             │              │─────────────▶│              │
    │ Redirect    │              │              │              │
    │ to success  │              │              │              │
    │ page        │              │              │              │
    │◀────────────│              │              │              │
```

### Land Mutation Approval Flow

```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────────┐
│  Admin  │    │  Admin  │    │  MySQL   │    │   Trigger    │
│ Browser │    │  Route  │    │   DB     │    │after_mutation│
│         │    │ Handler │    │          │    │  _approval   │
└────┬────┘    └────┬────┘    └────┬─────┘    └──────┬───────┘
     │              │              │                  │
     │ PUT /admin/  │              │                  │
     │ land-mutations│             │                  │
     │ /:id/approve │              │                  │
     │─────────────▶│              │                  │
     │              │              │                  │
     │              │ UPDATE       │                  │
     │              │ land_        │                  │
     │              │ mutations_v2 │                  │
     │              │ SET status = │                  │
     │              │ 'Approved'   │                  │
     │              │─────────────▶│                  │
     │              │              │                  │
     │              │              │  TRIGGER FIRES   │
     │              │              │─────────────────▶│
     │              │              │                  │
     │              │              │  1. Find buyer   │
     │              │              │     by NID       │
     │              │              │  2. INSERT new   │
     │              │              │     my_land_     │
     │              │              │     record       │
     │              │              │     (for buyer)  │
     │              │              │  3. DELETE/UPDATE │
     │              │              │     seller's     │
     │              │              │     record       │
     │              │              │  4. UPDATE       │
     │              │              │     service_     │
     │              │              │     requests     │
     │              │              │◀─────────────────│
     │              │              │                  │
     │              │  Also:       │                  │
     │              │  INSERT      │                  │
     │              │  admin_      │                  │
     │              │  actions_log │                  │
     │              │─────────────▶│                  │
     │              │              │                  │
     │  {success}   │              │                  │
     │◀─────────────│              │                  │
```

---

## 16. Business Logic Flows

### Service Request Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                SERVICE REQUEST LIFECYCLE                      │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Citizen  │    │ req_*    │    │ service_ │              │
│  │ submits  │───▶│ table    │───▶│ requests │              │
│  │ form     │    │ INSERT   │    │ INSERT   │              │
│  └──────────┘    └──────────┘    └─────┬────┘              │
│                                        │                     │
│                              ┌─────────▼─────────┐          │
│                              │  status: pending   │          │
│                              └─────────┬─────────┘          │
│                                        │                     │
│                                  Admin Reviews               │
│                                        │                     │
│                        ┌───────────────┼──────────────┐      │
│                        ▼                              ▼      │
│               ┌────────────────┐            ┌──────────────┐ │
│               │status: approved│            │status:rejected│ │
│               └───────┬────────┘            └──────┬───────┘ │
│                       │                            │         │
│  ┌────────────────────▼───┐    ┌───────────────────▼───┐     │
│  │ INSERT completed_tasks │    │ TRIGGER fires         │     │
│  │ + unique_number        │    │ → INSERT notification │     │
│  └────────────────────────┘    │   for user            │     │
│                                └───────────────────────┘     │
│                                                              │
│  Special Case: Land Mutation Approval                        │
│  ─────────────────────────────────                          │
│  If service_type contains 'land':                            │
│    → Transfer land records from seller to buyer              │
│    → Create new my_land_record for buyer                     │
│    → Delete/update seller's my_land_record                   │
└─────────────────────────────────────────────────────────────┘
```

### Passport Status Workflow

```
Submitted ──▶ Payment Verified ──▶ Under Review ──▶ Biometric Scheduled
                                                          │
                                                          ▼
Delivered ◀── Dispatched ◀── Printing ◀── Approved ◀── Police Verification
    │                                        │
    │                                        ├── Biometric Enrolled
    │                                        │
    └── Ready for Delivery                   └── Police Verification Completed

                    Rejected ◀── (any stage)
                    On Hold ◀── (any stage)
                    Cancelled ◀── (citizen request)
```

### NID Application Workflow

```
Draft ──▶ Submitted ──▶ Under Review ──▶ Biometric Pending
                                              │
                                              ▼
Delivered ◀── Ready for Collection ◀── Card Printing ◀── Approved ◀── Verified
                                                             │
                                                        Rejected
```

---

## 17. Installation & Setup

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18+ |
| MySQL | 8.0+ |
| npm | 9+ |
| XAMPP (optional) | Latest |

### Step 1: Clone & Install

```bash
git clone <repository-url>
cd central-govt
npm install
```

### Step 2: Configure Environment

Create `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=central_govt_db
JWT_SECRET=your-super-secret-key
PORT=3000
```

### Step 3: Initialize Database

```sql
CREATE DATABASE IF NOT EXISTS central_govt_db
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then execute SQL files in order:

```bash
# 1. Core schema
mysql -u root central_govt_db < src/database/schema_full.sql

# 2. Module schemas (if not included in schema_full)
mysql -u root central_govt_db < src/database/nid_schema.sql
mysql -u root central_govt_db < src/database/passport_schema.sql
mysql -u root central_govt_db < src/database/health_schema.sql
mysql -u root central_govt_db < src/database/water_schema.sql
mysql -u root central_govt_db < src/database/nbr_schema.sql
mysql -u root central_govt_db < src/database/agriculture_schema.sql
mysql -u root central_govt_db < src/database/education_schema.sql
mysql -u root central_govt_db < src/database/university_admission_schema.sql
mysql -u root central_govt_db < src/database/market_schema.sql
mysql -u root central_govt_db < src/database/shop_schema.sql
mysql -u root central_govt_db < src/database/notices_schema.sql
mysql -u root central_govt_db < src/database/stipend_schema.sql
mysql -u root central_govt_db < src/database/admin_schema.sql

# 3. Normalization
mysql -u root central_govt_db < src/database/schema_normalized.sql

# 4. Views, Triggers, Procedures
mysql -u root central_govt_db < src/database/views.sql
mysql -u root central_govt_db < src/database/triggers.sql
mysql -u root central_govt_db < src/database/procedures.sql
mysql -u root central_govt_db < src/database/land_mutation_trigger.sql
```

### Step 4: Start the Server

```bash
npm start
# or
node src/app.js
```

Server runs at: **http://localhost:3000**

---

## 18. Technical Specifications

### Backend Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express.js | 5.x |
| Database Driver | mysql2/promise | 3.16 |
| Authentication | jsonwebtoken | 9.0 |
| Password Hashing | bcrypt / bcryptjs | 6.0 / 3.0 |
| File Upload | multer | 2.0 |
| Security | helmet | 8.1 |
| Rate Limiting | express-rate-limit | 8.2 |
| Validation | express-validator | 7.3 |
| CORS | cors | 2.8 |
| Email | nodemailer | 7.0 |
| Payment Gateway | sslcommerz-lts | 1.2 |
| HTTP Client | axios | 1.13 |
| Environment | dotenv | 17.2 |

### Database Specifications

| Specification | Value |
|---------------|-------|
| DBMS | MySQL 8.0+ |
| Storage Engine | InnoDB |
| Character Set | utf8mb4 |
| Collation | utf8mb4_unicode_ci |
| Database Name | central_govt_db |
| Total Tables | 80+ |
| Total Views | 16 |
| Total Triggers | 14 (11 active + 3 dropped) |
| Total Stored Procedures | 4 |
| Total Complex Queries | 12 |
| Connection Pool | 10 connections |
| FK Support | Enabled (InnoDB) |

### Frontend Stack

| Component | Technology |
|-----------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (custom, no framework) |
| JavaScript | Vanilla JS (ES6+) |
| HTTP Client | Fetch API |
| Icons | Font Awesome (CDN) |
| Fonts | Google Fonts (CDN) |
| Charts | Chart.js (CDN) |

### API Statistics

| Metric | Count |
|--------|-------|
| Total API Endpoints | **327** |
| Route Files | 21 |
| Public Endpoints | ~30 |
| JWT-Protected Endpoints | ~230 |
| Admin-Only Endpoints | ~67 |
| SSLCommerz Callbacks | ~12 |
| File Upload Endpoints | ~15 |

### Security Features

| Feature | Implementation |
|---------|---------------|
| Content Security Policy | Helmet CSP with script/style/font whitelists |
| Rate Limiting | 100 requests per 15 minutes per IP |
| JWT Token | HS256 algorithm, configurable expiry |
| Password Security | bcrypt with 10 salt rounds |
| File Validation | Image-only (jpg/png/gif/webp), 5MB max |
| SQL Injection Prevention | Parameterized queries via mysql2 |
| Input Validation | express-validator on auth endpoints |
| Admin Isolation | Separate admin JWT with `isAdmin` flag |

---

*Project: Central Government System of Bangladesh — Full Stack DBMS Application*
*Total Database Objects: 150+ tables, 16 views, 14 triggers, 4 stored procedures, 12 complex queries*
*Total API Endpoints: 327 across 21 route files*