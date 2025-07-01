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
    last_updated_by VARCHAR(255) DEFAULT 'system',
    UNIQUE INDEX idx_username (username),
    UNIQUE INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_data JSON,
    response_status INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user),
    INDEX idx_created_at (created_at),
    INDEX idx_action (action),
    INDEX idx_resource (resource),
    INDEX idx_resource_id (resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(255) NOT NULL UNIQUE,
    `value` TEXT NOT NULL,
    last_updated_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings (id, `key`, `value`, last_updated_by) VALUES
(1, 'tax_rate', '10', 'system'),
(2, 'company_name', 'CÔNG TY TNHH NEPO', 'system'),
(3, 'company_address', 'Số 26/63/36 đường Vạn Mỹ, phường Vạn Mỹ, quận Ngô Quyền, thành phố Hải Phòng', 'system'),


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
    last_updated_by VARCHAR(255) DEFAULT 'system',
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
    last_updated_by VARCHAR(255) DEFAULT 'system',
    UNIQUE INDEX idx_partners_tax_code (tax_code)
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
    type VARCHAR(255) COMMENT 'eg 20FT, 40FT',
    make VARCHAR(100) NULL COMMENT 'Manufacturer of the trailer',
    model VARCHAR(100) NULL COMMENT 'Model of the trailer',
    year_of_manufacture YEAR NULL,

    -- Timestamps and Audit
    remark TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS fuel_by_km (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tractor_license_plate VARCHAR(255) NOT NULL,
    trailer_license_plate VARCHAR(255) NOT NULL,
    weight_category VARCHAR(255) NOT NULL COMMENT 'eg trên 20t, dưới 20t',
    load_condition VARCHAR(255) NOT NULL COMMENT 'eg vỏ rỗng, hàng',
    l_100km DECIMAL(10, 2) NOT NULL COMMENT 'Lít nhiên liệu tiêu thụ trên 100km',
    remark VARCHAR(255) NULL COMMENT 'Any additional notes or remarks',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255) DEFAULT 'system',
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO fuel_by_km (tractor_license_plate, trailer_license_plate, weight_category, load_condition, l_100km) VALUES
('15C-136.31', '15R067.95', '>20t', 'vỏ rỗng', 25),
('15C-136.31', '15R067.95', '<=20t', 'vỏ rỗng', 25),
('15C-136.31', '15R067.95', '>20t', 'chở hàng', 43),
('15C-136.31', '15R067.95', '<=20t', 'chở hàng', 39),
('15C-139.82', '15R070.51', '>20t', 'vỏ rỗng', 25),
('15C-139.82', '15R070.51', '<=20t', 'vỏ rỗng', 25),
('15C-139.82', '15R070.51', '>20t', 'chở hàng', 43),
('15C-139.82', '15R070.51', '<=20t', 'chở hàng', 39),
('15C-119.57', '15R-050.37', '>20t', 'vỏ rỗng', 27),
('15C-119.57', '15R-050.37', '<=20t', 'vỏ rỗng', 27),
('15C-119.57', '15R-050.37', '>20t', 'chở hàng', 45),
('15C-119.57', '15R-050.37', '<=20t', 'chở hàng', 41),
('15C-070.63', '15R-128.07', '>20t', 'vỏ rỗng', 24),
('15C-070.63', '15R-128.07', '<=20t', 'vỏ rỗng', 24),
('15C-070.63', '15R-128.07', '>20t', 'chở hàng', 42),
('15C-070.63', '15R-128.07', '<=20t', 'chở hàng', 38);

CREATE TABLE IF NOT EXISTS fuel_by_routes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tractor_license_plate VARCHAR(255) NOT NULL,
    trailer_license_plate VARCHAR(255) NOT NULL,
    routes VARCHAR(500) NOT NULL COMMENT 'Mộc Châu, Sơn La',
    l DECIMAL(10, 2) NOT NULL COMMENT 'Lít nhiên liệu tiêu thụ bổ sung cho mỗi chuyến đi',
    remark VARCHAR(255) NULL COMMENT 'Any additional notes or remarks',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255) DEFAULT 'system',
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO fuel_by_route (tractor_license_plate, trailer_license_plate, routes, l) VALUES
('15C-136.31', '15R067.95', 'Mộc Châu, Sơn La', 3),
('15C-139.82', '15R070.51', 'Mộc Châu, Sơn La', 3),
('15C-119.57', '15R-050.37', 'Mộc Châu, Sơn La', 2),
('15C-070.63', '15R-128.07', 'Mộc Châu, Sơn La', 3);


CREATE TABLE IF NOT EXISTS allowance_by_routes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    routes VARCHAR(500) NOT NULL COMMENT 'Mộc Châu, Sơn La',
    trailer_type VARCHAR(255) NOT NULL COMMENT 'eg 20FT, 40FT',
    cash BIGINT UNSIGNED NOT NULL COMMENT 'Số tiền trợ cấp cho mỗi chuyến đi',
    currency VARCHAR(50) NOT NULL DEFAULT 'VND' COMMENT 'Đơn vị tiền tệ, mặc định là VND',
    remark VARCHAR(255) NULL COMMENT 'Any additional notes or remarks',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255) DEFAULT 'system',
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO allowance_by_routes (trailer_type, cash, routes) VALUES
('40FT', 2740000, 'Hải Phòng - Mộc Châu, Sơn La'),
('20FT', 2470000, 'Hải Phòng - Mộc Châu, Sơn La'),
('40FT', 3820000, 'Hải Phòng - TP. Sơn La'),
('20FT', 3550000, 'Hải Phòng - TP. Sơn La'),
('40FT', 4800000, 'Hải Phòng - Sa Pa'),
('40FT', 4280000, 'Hải Phòng - Lào Cai'),
('20FT', 3300000, 'Hải Phòng - Lào Cai'),
('40FT', 6780000, 'Hải Phòng - CK Ma Lù Thàng, Lai Châu'),
('40FT', 5300000, 'Hải Phòng - TP. Lai Châu'),
('20FT', 4300000, 'Hải Phòng - TP. Lai Châu'),
('40FT', 1890000, 'Hải Phòng - TP. Tuyên Quang'),
('20FT', 1720000, 'Hải Phòng - TP. Tuyên Quang'),
('40FT', 1650000, 'Hải Phòng - Đoan Hùng, Phú Thọ (đi QL2)'),
('20FT', 1350000, 'Hải Phòng - Đoan Hùng, Phú Thọ (đi QL2)'),
('40FT', 1150000, 'Hải Phòng - Hà Nội/ Như Quỳnh, Hưng Yên (2 trạm vé) (đi QL5)'),
('20FT', 930000, 'Hải Phòng - Hà Nội/ Như Quỳnh, Hưng Yên (2 trạm vé) (đi QL5)'),
('40FT', 1150000, 'Hải Phòng - Bắc Ninh/ Bắc Giang (đi QL18, QL39, QL1)'),
('20FT', 930000, 'Hải Phòng - Bắc Ninh/ Bắc Giang (đi QL18, QL39, QL1)'),
('40FT', 790000, 'Hải Phòng - Phủ Lý, Hà Nam/ Ninh Bình/ Thái Bình (hàng 1 chiều, đi QL10)'),
('20FT', 680000, 'Hải Phòng - Phủ Lý, Hà Nam/ Ninh Bình/ Thái Bình (hàng 1 chiều, đi QL10)'),
('40FT', 1150000, 'Hải Phòng - KCN Đồng Văn (đi cầu Yên Lệnh)'),
('20FT', 930000, 'Hải Phòng - KCN Đồng Văn (đi cầu Yên Lệnh)'),
('40FT', 790000, 'Hải Phòng - Hưng Yên (1 trạm vé)'),
('20FT', 690000, 'Hải Phòng - Hưng Yên (1 trạm vé)'),
('40FT', 700000, 'Hải Phòng - Hải Dương'),
('20FT', 600000, 'Hải Phòng - Hải Dương'),
('40FT', 1780000, 'Hải Phòng - Bắc Ninh/ Bắc Giang - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('20FT', 1500000, 'Hải Phòng - Bắc Ninh/ Bắc Giang - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('40FT', 1510000, 'Hải Phòng - Hà Nội/ Thái Nguyên - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('20FT', 1320000, 'Hải Phòng - Hà Nội/ Thái Nguyên - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('40FT', 1870000, 'Hải Phòng - TP. Hòa Bình - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('20FT', 1570000, 'Hải Phòng - TP. Hòa Bình - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('40FT', 1630000, 'Hải Phòng - Vĩnh Phúc - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('20FT', 1400000, 'Hải Phòng - Vĩnh Phúc - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('40FT', 1870000, 'Hải Phòng - Việt Trì/ Phú Thọ (QL32) - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('20FT', 1750000, 'Hải Phòng - Việt Trì/ Phú Thọ (QL32) - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('40FT', 2090000, 'Hải Phòng - Việt Trì/ Phú Thọ (QL2 + cao tốc NBLC) - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('20FT', 1750000, 'Hải Phòng - Việt Trì/ Phú Thọ (QL2 + cao tốc NBLC) - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('40FT', 1160000, 'Hải Phòng - Hải Dương/ Hưng Yên - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('20FT', 1050000, 'Hải Phòng - Hải Dương/ Hưng Yên - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('40FT', 1100000, 'Hải Phòng - Thái Bình/ Nam Định/ Hà Nam/ Ninh Bình - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('20FT', 990000, 'Hải Phòng - Thái Bình/ Nam Định/ Hà Nam/ Ninh Bình - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('40FT', 1240000, 'Hải Phòng - Thanh Hóa - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('20FT', 1130000, 'Hải Phòng - Thanh Hóa - Hà Nam/ Ninh Bình (hàng kết hợp 2 chiều)'),
('40FT', 1890000, 'Hải Phòng - Văn Chấn, Yên Bái'),
('20FT', 1720000, 'Hải Phòng - Văn Chấn, Yên Bái'),
('40FT', 1150000, 'Hải Phòng - Vĩnh Phúc'),
('20FT', 930000, 'Hải Phòng - Vĩnh Phúc'),
('40FT', 1550000, 'Hải Phòng - Việt Trì/ Phú Thọ (đi QL2 + cao tốc Nội Bài Lào Cai)'),
('20FT', 1250000, 'Hải Phòng - Việt Trì/ Phú Thọ (đi QL2 + cao tốc Nội Bài Lào Cai)'),
('40FT', 1550000, 'Hải Phòng - Việt Trì/ Phú Thọ (đi QL32 + cầu Văn Lang)'),
('20FT', 1250000, 'Hải Phòng - Việt Trì/ Phú Thọ (đi QL32 + cầu Văn Lang)'),
('40FT', 1190000, 'Hải Phòng - Thái Nguyên'),
('20FT', 1020000, 'Hải Phòng - Thái Nguyên'),
('40FT', 2320000, 'Hải Phòng - Hà Giang'),
('20FT', 2270000, 'Hải Phòng - Hà Giang'),
('40FT', 2120000, 'Hải Phòng - Chiêm Hóa, Tuyên Quang'),
('20FT', 2070000, 'Hải Phòng - Chiêm Hóa, Tuyên Quang'),
('40FT', 1720000, 'Hải Phòng - TP. Vinh/ Nghệ An'),
('20FT', 1610000, 'Hải Phòng - TP. Vinh/ Nghệ An'),
('40FT', 790000, 'Hải Phòng - Hạ Long, Quảng Ninh'),
('20FT', 680000, 'Hải Phòng - Hạ Long, Quảng Ninh'),
('40FT', 1600000, 'Hải Phòng - Móng Cái, Quảng Ninh'),
('20FT', 1380000, 'Hải Phòng - Móng Cái, Quảng Ninh'),
('40FT', 1500000, 'Hải Phòng - KCN Hải Hà, Móng Cái'),
('20FT', 1280000, 'Hải Phòng - KCN Hải Hà, Móng Cái'),
('40FT', 3500000, 'Hải Phòng - Đồng Hới, Quảng Bình'),
('20FT', 3000000, 'Hải Phòng - Đồng Hới, Quảng Bình'),
('40FT', 300000, 'Hải Phòng - Ngoại thành (R> 20 km)'),
('20FT', 300000, 'Hải Phòng - Ngoại thành (R> 20 km)'),
('40FT', 200000, 'Hải Phòng - Nội thành (R<20 km)'),
('20FT', 200000, 'Hải Phòng - Nội thành (R<20 km)'),
('40FT', 2200000, 'Hải Phòng - CK Hữu Nghị, Lạng Sơn'),
('20FT', 1900000, 'Hải Phòng - CK Hữu Nghị, Lạng Sơn'),
('40FT', 1000000, 'Hải Phòng - Thanh Hóa'),
('20FT', 890000, 'Hải Phòng - Thanh Hóa');


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
    container_number VARCHAR(50) NULL,
    description TEXT NOT NULL,
    distance_km INT UNSIGNED NULL,
    revenue DECIMAL(15, 2) DEFAULT 0.00,
    status ENUM('DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PLANNED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255) DEFAULT 'system',
    FOREIGN KEY (tractor_id) REFERENCES tractors(id),
    FOREIGN KEY (trailer_id) REFERENCES trailers(id),
    FOREIGN KEY (user_id_driver) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_job_date (job_date),
    INDEX idx_tractor_id (tractor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- V. EXPENSE MANAGEMENT TABLES
-- ================================================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tên hạng mục chi phí bằng tiếng Việt',
    description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Mô tả chi tiết về hạng mục chi phí',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255) DEFAULT 'system',
    UNIQUE KEY uk_expense_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ các hạng mục chi phí vận tải (đã đơn giản hóa)';

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
    last_updated_by VARCHAR(255) DEFAULT 'system',
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
    last_updated_by VARCHAR(255) DEFAULT 'system',
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
    last_updated_by VARCHAR(255) DEFAULT 'system',
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
    name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tên hạng mục hóa đơn bằng tiếng Việt',
    description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Mô tả chi tiết về hạng mục hóa đơn',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255) DEFAULT 'system',
    UNIQUE KEY uk_invoice_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lưu trữ các hạng mục hóa đơn';

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
    last_updated_by VARCHAR(255) DEFAULT 'system',
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
    last_updated_by VARCHAR(255) DEFAULT 'system',
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
    last_updated_by VARCHAR(255) DEFAULT 'system',
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (partner_id) REFERENCES partners(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_customer_id (customer_id),
    INDEX idx_partner_id (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


