-- ================================================================
-- Nepo Corp Backend Mock Data Script
-- Inserts sample data for testing and development
-- ================================================================

-- ================================================================
-- Password Hashing Configuration
-- Note: Replace {{HASH_SECRET}} and {{HASH_SALT}} with actual values from .env
-- ================================================================

-- Set MySQL variables for hashing (replace with actual .env values)
SET @hash_secret = '{{HASH_SECRET}}';  -- Replace with actual HASH_SECRET from .env
SET @hash_salt = '{{HASH_SALT}}';      -- Replace with actual HASH_SALT from .env

-- Insert mock users with properly hashed passwords
-- Password format: HEX(SHA256(password + salt + secret))
-- This matches the first step of Go backend's HashPassword function
INSERT IGNORE INTO users (id, username, email, password, name, role, is_active, last_updated_by) VALUES
(1, 'admin', 'admin@nepocorp.com', 
   HEX(SHA2(CONCAT('admin123', @hash_salt, @hash_secret), 256)), 
   'Administrator', 'admin', TRUE, 'Administrator (@admin)'),
(2, 'manager1', 'manager1@nepocorp.com', 
   HEX(SHA2(CONCAT('manager123', @hash_salt, @hash_secret), 256)), 
   'Nguyễn Văn A', 'manager', TRUE, 'Administrator (@admin)'),
(3, 'driver1', 'driver1@nepocorp.com', 
   HEX(SHA2(CONCAT('driver123', @hash_salt, @hash_secret), 256)), 
   'Trần Văn B', 'driver', TRUE, 'Administrator (@admin)'),
(4, 'driver2', 'driver2@nepocorp.com', 
   HEX(SHA2(CONCAT('driver123', @hash_salt, @hash_secret), 256)), 
   'Lê Thị C', 'driver', TRUE, 'Administrator (@admin)'),
(5, 'mechanic1', 'mechanic1@nepocorp.com', 
   HEX(SHA2(CONCAT('mechanic123', @hash_salt, @hash_secret), 256)), 
   'Phạm Văn D', 'mechanic', TRUE, 'Administrator (@admin)');

-- ================================================================
-- Password Hash Verification (for debugging - can be commented out)
-- ================================================================
/*
-- To verify password hashes are generated correctly, uncomment and run:
SELECT 'Password Hash Verification' AS info;

SELECT 'admin' AS username, 'admin123' AS plaintext_password,
       HEX(SHA2(CONCAT('admin123', @hash_salt, @hash_secret), 256)) AS password_hash
UNION ALL
SELECT 'manager1', 'manager123',
       HEX(SHA2(CONCAT('manager123', @hash_salt, @hash_secret), 256))
UNION ALL
SELECT 'driver1', 'driver123', 
       HEX(SHA2(CONCAT('driver123', @hash_salt, @hash_secret), 256))
UNION ALL
SELECT 'driver2', 'driver123',
       HEX(SHA2(CONCAT('driver123', @hash_salt, @hash_secret), 256))
UNION ALL
SELECT 'mechanic1', 'mechanic123',
       HEX(SHA2(CONCAT('mechanic123', @hash_salt, @hash_secret), 256));
*/

-- Insert mock expense categories
INSERT IGNORE INTO expense_categories (id, name, last_updated_by) VALUES
(1, 'Bảo dưỡng', 'Administrator (@admin)'),
(2, 'Bảo hiểm', 'Administrator (@admin)'),
(3, 'Lương', 'Administrator (@admin)'),
(4, 'Nhiên liệu', 'Administrator (@admin)'),
(5, 'Phụ tùng', 'Administrator (@admin)');

-- Insert mock containers
INSERT IGNORE INTO containers (id, category, last_updated_by) VALUES
(1, '20ft', 'Administrator (@admin)'),
(2, '40ft', 'Administrator (@admin)'),
(3, '40ft-HC', 'Administrator (@admin)'),
(4, '45ft', 'Administrator (@admin)'),
(5, 'Tank', 'Administrator (@admin)');

-- Insert mock tractors
INSERT IGNORE INTO tractors (id, license_plate, description, last_updated_by) VALUES
(1, '51A-12345', 'Xe đầu kéo Hyundai 2020', 'Administrator (@admin)'),
(2, '51B-67890', 'Xe đầu kéo Hino 2019', 'Administrator (@admin)'),
(3, '51C-11111', 'Xe đầu kéo Isuzu 2021', 'Administrator (@admin)'),
(4, '51D-22222', 'Xe đầu kéo Mitsubishi 2018', 'Administrator (@admin)'),
(5, '51E-33333', 'Xe đầu kéo Daewoo 2022', 'Administrator (@admin)');

-- Insert mock trailers  
INSERT IGNORE INTO trailers (id, license_plate, description, last_updated_by) VALUES
(1, '51R-11111', 'Rơ moóc container 40ft', 'Administrator (@admin)'),
(2, '51R-22222', 'Rơ moóc container 20ft', 'Administrator (@admin)'),
(3, '51R-33333', 'Rơ moóc sàn 45ft', 'Administrator (@admin)'),
(4, '51R-44444', 'Rơ moóc tank chở xăng', 'Administrator (@admin)'),
(5, '51R-55555', 'Rơ moóc thùng kín', 'Administrator (@admin)');

-- Insert mock expenses for tractors
INSERT IGNORE INTO expenses (id, tractor_id, trailer_id, vendor_name, expense_category_id, subtotal, tax_rate, total, payment_status, currency, remark, created_by, last_updated_by) VALUES
(1, 1, NULL, 'Garage Minh Tuấn', 1, 2000000, 10, 2200000, 'PAID', 'VND', 'Bảo dưỡng định kỳ 10,000km', 2, 'Nguyễn Văn A (@manager1)'),
(2, 2, NULL, 'Xưởng Hùng Vương', 1, 1500000, 10, 1650000, 'PENDING', 'VND', 'Thay dầu và lọc', 2, 'Nguyễn Văn A (@manager1)'),
(3, 3, NULL, 'Bảo hiểm PTI', 2, 5000000, 0, 5000000, 'PAID', 'VND', 'Bảo hiểm xe 1 năm', 1, 'Administrator (@admin)'),
(4, 1, NULL, 'Cửa hàng phụ tùng ABC', 5, 800000, 10, 880000, 'DRAFT', 'VND', 'Thay phanh trước', 3, 'Trần Văn B (@driver1)'),
(5, 4, NULL, 'Garage Thành Đạt', 1, 3000000, 10, 3300000, 'PAID', 'VND', 'Sửa chữa động cơ', 2, 'Nguyễn Văn A (@manager1)');

-- Insert mock expenses for trailers
INSERT IGNORE INTO expenses (id, tractor_id, trailer_id, vendor_name, expense_category_id, subtotal, tax_rate, total, payment_status, currency, remark, created_by, last_updated_by) VALUES
(6, NULL, 1, 'Xưởng Hoàng Gia', 1, 1200000, 10, 1320000, 'PAID', 'VND', 'Bảo dưỡng hệ thống phanh', 2, 'Nguyễn Văn A (@manager1)'),
(7, NULL, 2, 'Garage Việt Nam', 1, 900000, 10, 990000, 'PENDING', 'VND', 'Thay lốp xe', 2, 'Nguyễn Văn A (@manager1)'),
(8, NULL, 3, 'Bảo hiểm Bảo Việt', 2, 3000000, 0, 3000000, 'PAID', 'VND', 'Bảo hiểm rơ moóc', 1, 'Administrator (@admin)'),
(9, NULL, 4, 'Cửa hàng Minh Châu', 5, 600000, 10, 660000, 'DRAFT', 'VND', 'Thay van an toàn', 3, 'Trần Văn B (@driver1)'),
(10, NULL, 5, 'Xưởng sơn Tấn Phát', 1, 2500000, 10, 2750000, 'PAID', 'VND', 'Sơn lại thùng xe', 2, 'Nguyễn Văn A (@manager1)');

-- Insert mock expense items
INSERT IGNORE INTO expense_items (id, expense_id, item_name, price, quantity, total, install_date, expiry_date) VALUES
-- For expense 1 (Tractor maintenance)
(1, 1, 'Dầu động cơ Shell 15W40', 300000, 4, 1200000, '2024-01-15', NULL),
(2, 1, 'Lọc dầu Toyota', 150000, 2, 300000, '2024-01-15', '2024-07-15'),
(3, 1, 'Lọc gió', 200000, 1, 200000, '2024-01-15', '2024-07-15'),
(4, 1, 'Chi phí công', 500000, 1, 500000, '2024-01-15', NULL),

-- For expense 2 (Tractor oil change)
(5, 2, 'Dầu động cơ Castrol', 350000, 3, 1050000, '2024-02-01', NULL),
(6, 2, 'Lọc dầu Hino', 180000, 1, 180000, '2024-02-01', '2024-08-01'),
(7, 2, 'Chi phí công', 420000, 1, 420000, '2024-02-01', NULL),

-- For expense 3 (Insurance)
(8, 3, 'Bảo hiểm vật chất', 5000000, 1, 5000000, '2024-01-01', '2024-12-31'),

-- For expense 4 (Brake parts)
(9, 4, 'Má phanh trước', 400000, 2, 800000, '2024-02-10', '2025-02-10'),

-- For expense 5 (Engine repair)
(10, 5, 'Bộ piston', 1500000, 1, 1500000, '2024-01-20', NULL),
(11, 5, 'Găng tay bảo hộ', 50000, 2, 100000, '2024-01-20', NULL),
(12, 5, 'Chi phí sửa chữa', 1700000, 1, 1700000, '2024-01-20', NULL),

-- For expense 6 (Trailer brake maintenance)
(13, 6, 'Dầu phanh DOT4', 200000, 3, 600000, '2024-02-05', NULL),
(14, 6, 'Má phanh rơ moóc', 400000, 2, 800000, '2024-02-05', '2025-02-05'),

-- For expense 7 (Tire replacement)
(15, 7, 'Lốp xe Bridgestone 11.00R20', 900000, 1, 900000, '2024-02-15', NULL),

-- For expense 8 (Trailer insurance)
(16, 8, 'Bảo hiểm rơ moóc', 3000000, 1, 3000000, '2024-01-01', '2024-12-31'),

-- For expense 9 (Safety valve)
(17, 9, 'Van an toàn khí nén', 600000, 1, 600000, '2024-02-20', '2025-02-20'),

-- For expense 10 (Paint job)
(18, 10, 'Sơn Nippon Paint', 800000, 1, 800000, '2024-01-25', NULL),
(19, 10, 'Chi phí thi công', 1950000, 1, 1950000, '2024-01-25', NULL);

-- Insert mock maintenance records
INSERT IGNORE INTO maintenance (id, expense_id, license_plate, vendor_name, item_name, price, quantity, tax_rate, total, install_date, expiry_date, last_updated_by) VALUES
(1, 1, '51A-12345', 'Garage Minh Tuấn', 'Bảo dưỡng định kỳ 10,000km', 2000000, 1, 10.0, 2200000, '2024-01-15', '2024-07-15', 'Nguyễn Văn A (@manager1)'),
(2, 2, '51B-67890', 'Xưởng Hùng Vương', 'Thay dầu và lọc động cơ', 1500000, 1, 10.0, 1650000, '2024-02-01', '2024-08-01', 'Nguyễn Văn A (@manager1)'),
(3, 4, '51A-12345', 'Cửa hàng phụ tùng ABC', 'Thay má phanh trước', 800000, 1, 10.0, 880000, '2024-02-10', '2025-02-10', 'Trần Văn B (@driver1)'),
(4, 5, '51D-22222', 'Garage Thành Đạt', 'Sửa chữa động cơ', 3000000, 1, 10.0, 3300000, '2024-01-20', NULL, 'Nguyễn Văn A (@manager1)'),
(5, 6, '51R-11111', 'Xưởng Hoàng Gia', 'Bảo dưỡng hệ thống phanh', 1200000, 1, 10.0, 1320000, '2024-02-05', '2025-02-05', 'Nguyễn Văn A (@manager1)'),
(6, 7, '51R-22222', 'Garage Việt Nam', 'Thay lốp xe rơ moóc', 900000, 1, 10.0, 990000, '2024-02-15', NULL, 'Nguyễn Văn A (@manager1)'),
(7, 9, '51R-44444', 'Cửa hàng Minh Châu', 'Thay van an toàn khí nén', 600000, 1, 10.0, 660000, '2024-02-20', '2025-02-20', 'Trần Văn B (@driver1)'),
(8, 10, '51R-55555', 'Xưởng sơn Tấn Phát', 'Sơn lại thùng xe', 2500000, 1, 10.0, 2750000, '2024-01-25', NULL, 'Nguyễn Văn A (@manager1)');

-- Insert mock settings
INSERT IGNORE INTO settings (id, `key`, `value`, last_updated_by) VALUES
(1, 'tax_rate', '10', 'Administrator (@admin)'),
(2, 'company_name', 'Nepo Corporation', 'Administrator (@admin)'),
(3, 'company_address', '123 Đường ABC, Quận 1, TP.HCM', 'Administrator (@admin)'),
(4, 'company_phone', '028-1234-5678', 'Administrator (@admin)'),
(5, 'maintenance_reminder_days', '30', 'Administrator (@admin)'),
(6, 'fuel_price_default', '25000', 'Administrator (@admin)'),
(7, 'insurance_renewal_reminder_days', '60', 'Administrator (@admin)');

-- Insert mock activity logs
INSERT IGNORE INTO activity_logs (id, user_id, action, resource, resource_id, ip_address, user_agent, response_status) VALUES
(1, 1, 'LOGIN', 'auth', '1', '192.168.1.100', 'Mozilla/5.0', 200),
(2, 2, 'CREATE', 'expense', '1', '192.168.1.101', 'Mozilla/5.0', 201),
(3, 2, 'UPDATE', 'expense', '1', '192.168.1.101', 'Mozilla/5.0', 200),
(4, 3, 'CREATE', 'maintenance', '1', '192.168.1.102', 'Mozilla/5.0', 201),
(5, 1, 'DELETE', 'tractor', '99', '192.168.1.100', 'Mozilla/5.0', 200),
(6, 2, 'VIEW', 'expense', '2', '192.168.1.101', 'Mozilla/5.0', 200),
(7, 4, 'LOGIN', 'auth', '4', '192.168.1.103', 'Mozilla/5.0', 200),
(8, 5, 'CREATE', 'maintenance', '2', '192.168.1.104', 'Mozilla/5.0', 201);

-- ================================================================
-- Summary of Mock Data
-- ================================================================
-- Users: 5 (1 admin, 1 manager, 2 drivers, 1 mechanic)
-- Expense Categories: 5 categories
-- Containers: 5 different types
-- Tractors: 5 vehicles with license plates
-- Trailers: 5 trailers with license plates  
-- Expenses: 10 total (5 for tractors, 5 for trailers)
-- Expense Items: 19 line items across all expenses
-- Maintenance Records: 8 maintenance entries
-- Settings: 7 system settings
-- Activity Logs: 8 sample log entries
-- ================================================================