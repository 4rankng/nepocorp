-- ================================================================
-- Nepo Corp Transportation Management System (TMS)
-- Consolidated Database Schema
-- ================================================================

-- Set character set and collation for Vietnamese language support
SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;
SET collation_connection = 'utf8mb4_unicode_ci';

-- ================================================================
-- I. CORE SYSTEM TABLES
-- ================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    last_updated_by VARCHAR(255),
    UNIQUE INDEX idx_username (username),
    UNIQUE INDEX idx_email (email),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_data JSON,
    response_status INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_action (action),
    INDEX idx_resource (resource),
    INDEX idx_resource_id (resource_id),
    CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(255) NOT NULL UNIQUE,
    `value` TEXT NOT NULL,
    last_updated_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- II. MASTER DATA TABLES
-- ================================================================

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(255) NOT NULL,
    address TEXT,
    contact_person VARCHAR(255) NULL,
    contact_phone VARCHAR(50) NULL,
    contact_email VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_customers_tax_code (tax_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create partners table
CREATE TABLE IF NOT EXISTS partners (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_partners_tax_code (tax_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create containers table
CREATE TABLE IF NOT EXISTS containers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- III. VEHICLE MANAGEMENT TABLES
-- ================================================================

-- Create tractors table
CREATE TABLE IF NOT EXISTS tractors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    license_plate VARCHAR(50) NOT NULL,
    engine_type VARCHAR(100) NULL,
    description TEXT,
    purchase_cost DECIMAL(15, 2) DEFAULT 0.00,
    initial_valuation DECIMAL(15, 2) DEFAULT 0.00,
    purchase_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255),
    UNIQUE KEY uk_tractors_license_plate (license_plate),
    KEY idx_tractors_license_plate (license_plate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create trailers table
CREATE TABLE IF NOT EXISTS trailers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    license_plate VARCHAR(50) NOT NULL,
    trailer_number VARCHAR(20) NULL,
    type ENUM('20ft', '40ft', 'other') DEFAULT 'other',
    description TEXT,
    valuation DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255),
    UNIQUE KEY uk_trailers_license_plate (license_plate),
    KEY idx_trailers_license_plate (license_plate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create routes table for standard pricing
CREATE TABLE IF NOT EXISTS routes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    base_fee_40ft DECIMAL(15, 2) DEFAULT 0.00,
    base_fee_20ft DECIMAL(15, 2) DEFAULT 0.00,
    surcharge DECIMAL(15, 2) DEFAULT 0.00,
    discount DECIMAL(15, 2) DEFAULT 0.00,
    is_two_way_combined BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create fuel consumption standards
CREATE TABLE IF NOT EXISTS fuel_standards (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tractor_id BIGINT UNSIGNED NOT NULL,
    trailer_type ENUM('20ft', '40ft') NOT NULL,
    load_category ENUM('under_20t', 'over_20t', 'empty') NOT NULL,
    consumption_rate DECIMAL(5, 2) NOT NULL,
    surcharge_rate_mountain DECIMAL(5, 2) DEFAULT 0.00,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tractor_id) REFERENCES tractors(id),
    UNIQUE KEY uk_fuel_standard (tractor_id, trailer_type, load_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- IV. OPERATIONS TABLES
-- ================================================================

-- Create jobs table for tracking individual transport orders
CREATE TABLE IF NOT EXISTS jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_date DATE NOT NULL,
    tractor_id BIGINT UNSIGNED NOT NULL,
    trailer_id BIGINT UNSIGNED NULL,
    user_id_driver BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,
    route_id BIGINT UNSIGNED NULL,
    container_number VARCHAR(50) NULL,
    description TEXT NOT NULL,
    distance_km INT UNSIGNED NULL,
    revenue DECIMAL(15, 2) DEFAULT 0.00,
    status ENUM('DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PLANNED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tractor_id) REFERENCES tractors(id),
    FOREIGN KEY (trailer_id) REFERENCES trailers(id),
    FOREIGN KEY (user_id_driver) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (route_id) REFERENCES routes(id),
    INDEX idx_job_date (job_date),
    INDEX idx_tractor_id (tractor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- V. EXPENSE MANAGEMENT TABLES
-- ================================================================

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create expenses table (unified for all expense types)
CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    expense_date DATE NOT NULL,
    job_id BIGINT UNSIGNED NULL,
    tractor_id BIGINT UNSIGNED NULL,
    vendor_name VARCHAR(255) NOT NULL,
    expense_category_id BIGINT UNSIGNED NOT NULL,
    total BIGINT NOT NULL,
    amount DECIMAL(15, 2) NULL,
    quantity DECIMAL(10, 2) NULL,
    unit_price DECIMAL(15, 2) NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    payment_proof VARCHAR(500),
    currency VARCHAR(50) NOT NULL DEFAULT 'VND',
    remark TEXT,
    description TEXT NULL,
    cancel_reason TEXT,
    created_by BIGINT UNSIGNED NOT NULL,
    last_updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (tractor_id) REFERENCES tractors(id),
    FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_expense_date (expense_date),
    INDEX idx_expense_category_id (expense_category_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_tractor_id (tractor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create expense_items table
CREATE TABLE IF NOT EXISTS expense_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    expense_id BIGINT UNSIGNED NOT NULL,
    license_plate VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    tax_rate FLOAT NOT NULL DEFAULT 0,
    subtotal BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL,
    install_date DATETIME DEFAULT NULL,
    expiry_date DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    INDEX idx_expense_id (expense_id),
    INDEX idx_license_plate (license_plate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create maintenance table
CREATE TABLE IF NOT EXISTS maintenance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    expense_id BIGINT UNSIGNED NOT NULL,
    license_plate VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
    quantity INT NOT NULL,
    tax_rate FLOAT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL,
    install_date DATETIME NULL,
    expiry_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255),
    INDEX idx_expense_id (expense_id),
    INDEX idx_license_plate (license_plate),
    INDEX idx_vendor_name (vendor_name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- VI. INVOICE MANAGEMENT TABLES
-- ================================================================

-- Create invoice_categories table
CREATE TABLE IF NOT EXISTS invoice_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    invoice_category_id BIGINT UNSIGNED NOT NULL,
    total BIGINT NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    payment_proof VARCHAR(500),
    currency VARCHAR(50) NOT NULL DEFAULT 'VND',
    remark TEXT,
    cancel_reason TEXT,
    created_by BIGINT UNSIGNED NOT NULL,
    last_updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (invoice_category_id) REFERENCES invoice_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_customer_id (customer_id),
    INDEX idx_invoice_category_id (invoice_category_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT UNSIGNED NOT NULL,
    license_plate VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    tax_rate FLOAT NOT NULL DEFAULT 0,
    subtotal BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL,
    service_date DATETIME DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_license_plate (license_plate),
    INDEX idx_service_date (service_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- VII. FINANCIAL MANAGEMENT TABLES
-- ================================================================

-- Create financial_ledgers table for all financial transactions
CREATE TABLE IF NOT EXISTS financial_ledgers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_date DATE NOT NULL,
    customer_id BIGINT UNSIGNED NULL,
    partner_id BIGINT UNSIGNED NULL,
    job_id BIGINT UNSIGNED NULL,
    transaction_type ENUM('INVOICE', 'PAYMENT_RECEIVED', 'PARTNER_PAYMENT', 'PARTNER_INVOICE', 'OPENING_BALANCE', 'ADJUSTMENT') NOT NULL,
    debit DECIMAL(15, 2) DEFAULT 0.00,
    credit DECIMAL(15, 2) DEFAULT 0.00,
    reference_number VARCHAR(100) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (partner_id) REFERENCES partners(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_customer_id (customer_id),
    INDEX idx_partner_id (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- VIII. INITIAL DATA
-- ================================================================

-- Insert default admin user
INSERT IGNORE INTO users (username, email, password, name, role, is_active)
VALUES ('admin', 'admin@nepocorp.com', '$2a$10$example_hash', 'Administrator', 'admin', TRUE);

-- Insert default tax_rate setting
INSERT IGNORE INTO settings (`key`, `value`, last_updated_by)
VALUES ('tax_rate', '10', 'Administrator (@admin)');

-- Insert default expense categories
INSERT IGNORE INTO expense_categories (name, last_updated_by) VALUES
('FUEL', 'Administrator (@admin)'),
('ROAD_FEES', 'Administrator (@admin)'),
('REPAIRS', 'Administrator (@admin)'),
('TIRES', 'Administrator (@admin)'),
('DRIVER_SALARY', 'Administrator (@admin)'),
('PARKING', 'Administrator (@admin)'),
('MAINTENANCE', 'Administrator (@admin)'),
('INSURANCE', 'Administrator (@admin)'),
('REGISTRATION', 'Administrator (@admin)'),
('OTHER', 'Administrator (@admin)');

-- Insert default invoice categories
INSERT IGNORE INTO invoice_categories (name, last_updated_by) VALUES
('TRANSPORTATION', 'Administrator (@admin)'),
('LOGISTICS_SERVICE', 'Administrator (@admin)'),
('PORT_FEES', 'Administrator (@admin)'),
('OTHER', 'Administrator (@admin)');

-- ================================================================
-- End of consolidated migration
-- ================================================================