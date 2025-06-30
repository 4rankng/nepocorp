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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255),
    UNIQUE INDEX idx_username (username),
    UNIQUE INDEX idx_email (email)
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
    contact_person VARCHAR(255) NULL,
    contact_phone VARCHAR(50) NULL,
    contact_email VARCHAR(255) NULL,
    notes TEXT NULL,
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

   -- Core Asset Details
    make VARCHAR(100) NULL COMMENT 'Manufacturer, e.g., Howo, Freightliner',
    model VARCHAR(100) NULL COMMENT 'Tractor model',
    year_of_manufacture YEAR NULL COMMENT 'Year of manufacture',

 -- Compliance and Maintenance Tracking (derived from expense logs [1, 3])
    inspection_due_date DATE NULL COMMENT 'Due date for next vehicle inspection (đăng kiểm)',
    road_fee_due_date DATE NULL COMMENT 'Due date for next road maintenance fee payment (phí đường bộ)',
    insurance_policy_number VARCHAR(100) NULL,
    insurance_expiry_date DATE NULL COMMENT 'Date when the current insurance policy expires',

    -- Timestamps and Audit
    remark TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create trailers table
CREATE TABLE IF NOT EXISTS trailers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    license_plate VARCHAR(50) NOT NULL,

    -- Core Asset Details
    type VARCHAR(255) COMMENT 'Trailer type, critical for job pricing eg 20FT, 40FT',
    make VARCHAR(100) NULL COMMENT 'Manufacturer of the trailer',
    model VARCHAR(100) NULL COMMENT 'Model of the trailer',
    year_of_manufacture YEAR NULL,

    -- Timestamps and Audit
    remark TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create routes table for standard pricing
CREATE TABLE IF NOT EXISTS routes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    trailer_type VARCHAR(255) NOT NULL,
    base_fee DECIMAL(15, 2) DEFAULT 0.00,
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
    trailer_type VARCHAR(255) NOT NULL,
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
CREATE TABLE IF NOT EXISTS expense_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_key VARCHAR(100) NOT NULL COMMENT 'Khóa định danh duy nhất cho hệ thống (tiếng Anh, không dấu)',
    name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tên hạng mục chi phí bằng tiếng Việt',
    description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Mô tả chi tiết về hạng mục chi phí',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255),
    UNIQUE KEY uk_expense_categories_key (category_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ các hạng mục chi phí vận tải';

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




-- 2. Thêm danh sách lớn Khách hàng từ file công nợ [2]
-- Mã số thuế được tạo giả định vì không có trong file nguồn.
INSERT IGNORE INTO customers (name, tax_code) VALUES
('Mộc Sảng', 'MST-MOC-SANG-001'),
('Ligarden', 'MST-LIGARDEN-002'),
('Tân Lập MC', 'MST-TAN-LAP-MC-003'),
('Vista', 'MST-VISTA-004'),
('Vinatea MC', 'MST-VINATEA-MC-005'),
('Vietsun', 'MST-VIETSUN-006'),
('Tân Việt Hưng', 'MST-TAN-VIET-HUNG-007'),
('Chè Mỹ Lâm', 'MST-CHE-MY-LAM-008'),
('Phú Tài', 'MST-PHU-TAI-009'),
('Hải Đăng', 'MST-HAI-DANG-010'),
('An Khánh', 'MST-AN-KHANH-011'),
('Anh Đoàn Hồng Anh Phát', 'MST-ANH-DOAN-HAP-012'),
('Hưng Thuận', 'MST-HUNG-THUAN-013'),
('Nitoda', 'MST-NITODA-014'),
('Công ty AT-AT', 'MST-AT-AT-015'),
('Thịnh Vượng Phát', 'MST-THINH-VUONG-PHAT-016'),
('Indigo', 'MST-INDIGO-017'),
('ARI Việt Nam', 'MST-ARI-VN-018'),
('Công ty Phúc An', 'MST-PHUC-AN-019'),
('Bông sen vàng', 'MST-BONG-SEN-VANG-020'),
('Công ty Dahua', 'MST-DAHUA-021'),
('Tổng công ty chè Vinatea', 'MST-VINATEA-CORP-022'),
('Công ty Thuận Vũ', 'MST-THUAN-VU-023'),
('Công ty Lê Minh', 'MST-LE-MINH-024'),
('Công ty Nam Tùng', 'MST-NAM-TUNG-025'),
('Mr. Huân Vietsun', 'MST-HUAN-VS-026'),
('Mr. Huy Vietsun', 'MST-HUY-VS-027');

-- 3. Thêm các Tuyến đường và Bảng giá chuẩn (giữ nguyên từ lần trước)
-- (Script INSERT cho bảng 'routes' có thể được thêm vào đây nếu cần)



-- ================================================================
-- Bảng và Dữ liệu cho Hạng mục Chi phí (Expense Categories)
-- Mô tả: Script này tạo bảng và chèn dữ liệu gốc cho các
-- hạng mục chi phí vận tải bằng tiếng Việt.
-- ================================================================

-- Nhóm 1: Chi phí Vận hành Trực tiếp
INSERT IGNORE INTO expense_categories (category_key, name, description, last_updated_by) VALUES
('FUEL', 'Nhiên liệu (Dầu lade)', 'Chi phí dầu diesel tiêu thụ trong các chuyến đi.', 'system'),
('ROAD_FEES', 'Phí Cầu đường', 'Bao gồm tất cả các khoản phí tại trạm thu phí BOT, vé cầu, vé phà.', 'system');

-- Nhóm 2: Chi phí Sửa chữa & Bảo dưỡng
INSERT IGNORE INTO expense_categories (category_key, name, description, last_updated_by) VALUES
('GENERAL_REPAIRS', 'Sửa chữa chung', 'Chi phí sửa chữa đột xuất hoặc theo kế hoạch (sửa điện, máy, gầm, điều hòa).', 'system'),
('PERIODIC_MAINTENANCE', 'Bảo dưỡng định kỳ', 'Chi phí bảo dưỡng theo lịch trình (bơm mỡ, thay lọc, thay nước làm mát).', 'system'),
('TIRES', 'Lốp xe', 'Chi phí mua mới, thay thế, vá hoặc đảo lốp.', 'system'),
('LUBRICANTS_SUPPLIES', 'Dầu mỡ & Vật tư', 'Chi phí các loại dầu nhớt (dầu máy, dầu cầu), mỡ và các vật tư tiêu hao khác.', 'system'),
('ROADSIDE_ASSISTANCE', 'Cứu hộ', 'Chi phí phát sinh khi xe gặp sự cố trên đường và cần xe cứu hộ.', 'system');

-- Nhóm 3: Chi phí Nhân sự
INSERT IGNORE INTO expense_categories (category_key, name, description, last_updated_by) VALUES
('DRIVER_SALARY', 'Lương Lái xe', 'Tiền lương hàng tháng, thưởng và các khoản phúc lợi khác cho tài xế.', 'system'),
('DRIVER_BONUS', 'Thưởng Lễ/Tết', 'Các khoản thưởng cho lái xe vào các dịp đặc biệt như lễ, Tết.', 'system');

-- Nhóm 4: Chi phí Cố định & Hành chính
INSERT IGNORE INTO expense_categories (category_key, name, description, last_updated_by) VALUES
('PARKING_FEES', 'Phí Gửi xe', 'Chi phí đỗ xe, gửi xe tại bãi hàng tháng hoặc theo lượt.', 'system'),
('INSURANCE', 'Bảo hiểm', 'Phí mua bảo hiểm TNDS bắt buộc và bảo hiểm vật chất (thân vỏ) tự nguyện.', 'system'),
('ROAD_MAINTENANCE_FEES', 'Phí Bảo trì Đường bộ', 'Phí bắt buộc nộp hàng năm cho quỹ bảo trì đường bộ.', 'system'),
('INSPECTION_FEES', 'Phí Đăng kiểm', 'Lệ phí kiểm định an toàn kỹ thuật và bảo vệ môi trường cho xe cơ giới.', 'system'),
('INSPECTION_SERVICE_FEES', 'Phí Dịch vụ Đăng kiểm', 'Chi phí cho các dịch vụ hỗ trợ liên quan trong quá trình đăng kiểm.', 'system'),
('PERMITS_LICENSES', 'Phí Phù hiệu & Giấy tờ', 'Các chi phí làm phù hiệu xe tải, giấy phép và các thủ tục hành chính liên quan.', 'system'),
('GPS_SERVICE', 'Phí Định vị GPS', 'Chi phí dịch vụ giám sát hành trình GPS hàng năm.', 'system'),
('FINES_PENALTIES', 'Phạt vi phạm', 'Các khoản tiền phạt do vi phạm luật giao thông đường bộ.', 'system');

-- Nhóm 5: Chi phí Khác
INSERT IGNORE INTO expense_categories (category_key, name, description, last_updated_by) VALUES
('EQUIPMENT_UPGRADES', 'Trang bị & Nâng cấp', 'Chi phí lắp đặt thêm thiết bị như camera, âm thanh, hoặc nâng cấp các bộ phận xe.', 'system');

