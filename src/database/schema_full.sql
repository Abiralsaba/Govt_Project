-- ==========================================
-- AUTHENTICATION & SECURITY DOMAIN
-- ==========================================
CREATE TABLE IF NOT EXISTS reg_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nid VARCHAR(50) UNIQUE NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    dob DATE NOT NULL,
    address TEXT,
    gender VARCHAR(20),
    photo_url VARCHAR(255),
    reset_otp VARCHAR(10),
    reset_otp_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- DASHBOARD DEPENDENCIES
-- ==========================================

-- KANBAN TODO
CREATE TABLE IF NOT EXISTS todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    status ENUM('todo', 'done') DEFAULT 'todo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SERVICE REQUESTS
CREATE TABLE IF NOT EXISTS service_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    details TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CITIZEN CORE (Simplified)
CREATE TABLE IF NOT EXISTS citizens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE, -- Linked to auth user if they have an account
    full_name_en VARCHAR(100) NOT NULL,
    full_name_bn VARCHAR(100),
    nid_number VARCHAR(20) UNIQUE,
    tin_number VARCHAR(20) UNIQUE,
    passport_number VARCHAR(20) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- DOCUMENTS (NID, Passport, Tax, Land)
CREATE TABLE IF NOT EXISTS nid_cards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    citizen_id BIGINT UNIQUE,
    nid_number VARCHAR(20) UNIQUE NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    smart_card_status BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS passport_books (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    passport_number VARCHAR(15) UNIQUE NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(100) DEFAULT 'DIP, Dhaka'
);

CREATE TABLE IF NOT EXISTS tax_payers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    citizen_id BIGINT,
    tin_number VARCHAR(20) UNIQUE NOT NULL,
    registration_date DATE,
    tax_payer_status ENUM('Individual', 'Company', 'Partnership')
);

CREATE TABLE IF NOT EXISTS land_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    citizen_id BIGINT, -- Owner
    khatian_no VARCHAR(50),
    dag_no VARCHAR(50),
    area_acres DECIMAL(10,4),
    last_tax_paid_year INT
);

-- ==========================================
-- USER PROFILE & EDIT HISTORY
-- ==========================================

CREATE TABLE IF NOT EXISTS user_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL, -- Links to reg_info.id
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL, -- Can check uniqueness if we want, but might be redundant if user_id is unique
    nid VARCHAR(50) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    dob DATE NOT NULL,
    address TEXT,
    gender VARCHAR(20),
    profile_image VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS edit_req (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    edited_by VARCHAR(255), -- Name or ID of who edited
    edited_fields TEXT, -- JSON or description of what changed
    old_values TEXT, -- JSON of old values
    new_values TEXT, -- JSON of new values
    edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES reg_info(id) ON DELETE CASCADE
);
