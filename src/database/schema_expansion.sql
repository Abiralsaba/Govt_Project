-- ==========================================
-- 14. GOVERNMENT HR & PAYROLL
-- ==========================================
CREATE TABLE IF NOT EXISTS govt_ministries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(100),
    name_bn VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS govt_departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ministry_id INT,
    name_en VARCHAR(100),
    name_bn VARCHAR(100),
    FOREIGN KEY (ministry_id) REFERENCES govt_ministries(id)
);

CREATE TABLE IF NOT EXISTS pay_scales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grade_name VARCHAR(20), -- Grade-1, Grade-2
    basic_salary DECIMAL(10,2),
    house_rent_percent DECIMAL(5,2)
);

CREATE TABLE IF NOT EXISTS designations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT,
    title VARCHAR(100),
    class_level ENUM('1st', '2nd', '3rd', '4th'),
    pay_scale_id INT,
    FOREIGN KEY (department_id) REFERENCES govt_departments(id),
    FOREIGN KEY (pay_scale_id) REFERENCES pay_scales(id)
);

CREATE TABLE IF NOT EXISTS govt_employees (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE, -- Linked to auth
    citizen_id BIGINT,
    designation_id INT,
    posting_district_id INT,
    joining_date DATE,
    retirement_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (citizen_id) REFERENCES citizens(id),
    FOREIGN KEY (designation_id) REFERENCES designations(id),
    FOREIGN KEY (posting_district_id) REFERENCES districts(id)
);

CREATE TABLE IF NOT EXISTS employee_attendance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT,
    date DATE,
    check_in_time TIME,
    check_out_time TIME,
    status ENUM('Present', 'Absent', 'Late', 'Leave'),
    FOREIGN KEY (employee_id) REFERENCES govt_employees(id)
);

CREATE TABLE IF NOT EXISTS leave_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50), -- Casual, Medical, Earned
    max_days_per_year INT
);

CREATE TABLE IF NOT EXISTS leave_applications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT,
    leave_type_id INT,
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status ENUM('Pending', 'Approved', 'Rejected'),
    approved_by_employee_id BIGINT,
    FOREIGN KEY (employee_id) REFERENCES govt_employees(id),
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
);

CREATE TABLE IF NOT EXISTS payroll_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT,
    month_year VARCHAR(10),
    basic_amount DECIMAL(10,2),
    allowances DECIMAL(10,2),
    deductions DECIMAL(10,2),
    net_payable DECIMAL(10,2),
    disbursed_date DATE,
    FOREIGN KEY (employee_id) REFERENCES govt_employees(id)
);

CREATE TABLE IF NOT EXISTS service_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT,
    from_designation_id INT,
    to_designation_id INT,
    transfer_date DATE,
    order_number VARCHAR(50),
    FOREIGN KEY (employee_id) REFERENCES govt_employees(id)
);

-- ==========================================
-- 15. PUBLIC WORKS & TENDERS
-- ==========================================
CREATE TABLE IF NOT EXISTS development_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ministry_id INT,
    title VARCHAR(200),
    budget DECIMAL(20,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50),
    FOREIGN KEY (ministry_id) REFERENCES govt_ministries(id)
);

CREATE TABLE IF NOT EXISTS contractors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(150),
    trade_license_number VARCHAR(50),
    tin_number VARCHAR(50),
    owner_citizen_id BIGINT,
    FOREIGN KEY (owner_citizen_id) REFERENCES citizens(id)
);

CREATE TABLE IF NOT EXISTS tenders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    title VARCHAR(200),
    description TEXT,
    publish_date DATE,
    closing_date DATE,
    base_price DECIMAL(15,2),
    FOREIGN KEY (project_id) REFERENCES development_projects(id)
);

CREATE TABLE IF NOT EXISTS tender_bids (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tender_id INT,
    contractor_id INT,
    bid_amount DECIMAL(15,2),
    submission_date TIMESTAMP,
    status ENUM('Submitted', 'Accepted', 'Rejected'),
    FOREIGN KEY (tender_id) REFERENCES tenders(id),
    FOREIGN KEY (contractor_id) REFERENCES contractors(id)
);

CREATE TABLE IF NOT EXISTS project_milestones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    name VARCHAR(150),
    target_date DATE,
    completion_date DATE,
    status VARCHAR(50),
    FOREIGN KEY (project_id) REFERENCES development_projects(id)
);

-- ==========================================
-- 16. AGRICULTURE & FARMERS
-- ==========================================
CREATE TABLE IF NOT EXISTS crop_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50), -- Rice, Wheat, Jute
    season VARCHAR(50) -- Rabi, Kharif
);

CREATE TABLE IF NOT EXISTS farmers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    citizen_id BIGINT,
    agriculture_card_number VARCHAR(50) UNIQUE,
    land_area_acres DECIMAL(10,2),
    FOREIGN KEY (citizen_id) REFERENCES citizens(id)
);

CREATE TABLE IF NOT EXISTS agricultural_subsidies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    amount_per_farmer DECIMAL(10,2),
    fiscal_year_id INT,
    FOREIGN KEY (fiscal_year_id) REFERENCES tax_fiscal_years(id)
);

CREATE TABLE IF NOT EXISTS subsidy_disbursements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_id BIGINT,
    subsidy_id INT,
    disbursement_date DATE,
    mobile_banking_number VARCHAR(15),
    transaction_id VARCHAR(50),
    FOREIGN KEY (farmer_id) REFERENCES farmers(id),
    FOREIGN KEY (subsidy_id) REFERENCES agricultural_subsidies(id)
);

CREATE TABLE IF NOT EXISTS crop_production_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_id BIGINT,
    crop_type_id INT,
    year INT,
    production_metric_tons DECIMAL(10,2),
    FOREIGN KEY (farmer_id) REFERENCES farmers(id),
    FOREIGN KEY (crop_type_id) REFERENCES crop_types(id)
);
