-- ================================================================
-- Nepo Corp Backend Database Schema
-- Single consolidated initialization script
-- ================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'driver',
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

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create containers table
CREATE TABLE IF NOT EXISTS containers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create tractors table
CREATE TABLE IF NOT EXISTS tractors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    license_plate VARCHAR(50) NOT NULL,
    description TEXT,
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
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255),
    UNIQUE KEY uk_trailers_license_plate (license_plate),
    KEY idx_trailers_license_plate (license_plate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create expenses table (unified for both tractors and trailers)
CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    expense_category_id BIGINT UNSIGNED NOT NULL,
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
    FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_expense_category_id (expense_category_id),
    INDEX idx_payment_status (payment_status)
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

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(255) NOT NULL,
    address TEXT,
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

-- ================================================================
-- Initial Data
-- ================================================================

-- Insert default admin user (password should be hashed in production)
INSERT IGNORE INTO users (username, email, password, name, role, is_active)
VALUES ('admin', 'admin@nepocorp.com', '$2a$10$example_hash', 'Administrator', 'admin', TRUE);

-- Insert default tax_rate setting
INSERT IGNORE INTO settings (`key`, `value`, last_updated_by)
VALUES ('tax_rate', '10', 'Administrator (@admin)');

-- Insert default expense categories
INSERT IGNORE INTO expense_categories (name) VALUES
('Bảo dưỡng'),
('Bảo hiểm'),
('Lương');

-- ================================================================
-- Views for reporting (optional)
-- ================================================================

-- Views removed to simplify schema - can be recreated as needed
