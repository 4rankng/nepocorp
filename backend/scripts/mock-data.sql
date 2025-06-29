-- ================================================================
-- Nepo Corp Backend Mock Data Script
-- Inserts sample data for testing and development - ALL TABLES
-- CHARSET: UTF-8
-- ================================================================

-- Ensure proper UTF-8 encoding for the session
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ================================================================
-- Password Hashing Configuration
-- Note: Replace {{HASH_SECRET}} and {{HASH_SALT}} with actual values from .env
-- ================================================================

-- Set MySQL variables for hashing (replace with actual .env values)
SET @hash_secret = '{{HASH_SECRET}}';  -- Replace with actual HASH_SECRET from .env
SET @hash_salt = '{{HASH_SALT}}';      -- Replace with actual HASH_SALT from .env

-- ================================================================
-- I. CORE SYSTEM TABLES
-- ================================================================

-- Insert mock users with properly hashed passwords
INSERT IGNORE INTO users (id, username, email, password, name, role, is_active, last_updated_by) VALUES
(1, 'admin', 'admin@nepocorp.com',
   HEX(SHA2(CONCAT('admin', @hash_salt, @hash_secret), 256)),
   'Administrator', 'admin', TRUE, 'Administrator (@admin)'),
(2, 'manager1', 'manager1@nepocorp.com',
   HEX(SHA2(CONCAT('manager', @hash_salt, @hash_secret), 256)),
   'Nguyễn Văn A', 'manager', TRUE, 'Administrator (@admin)'),
(3, 'driver1', 'driver1@nepocorp.com',
   HEX(SHA2(CONCAT('driver', @hash_salt, @hash_secret), 256)),
   'Trần Văn B', 'driver', TRUE, 'Administrator (@admin)'),
(4, 'driver2', 'driver2@nepocorp.com',
   HEX(SHA2(CONCAT('driver', @hash_salt, @hash_secret), 256)),
   'Lê Thị C', 'driver', TRUE, 'Administrator (@admin)'),
(5, 'mechanic1', 'mechanic1@nepocorp.com',
   HEX(SHA2(CONCAT('mechanic', @hash_salt, @hash_secret), 256)),
   'Phạm Văn D', 'mechanic', TRUE, 'Administrator (@admin)');

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
-- II. MASTER DATA TABLES
-- ================================================================

-- Insert mock customers
INSERT IGNORE INTO customers (id, name, tax_code, address, contact_person, contact_phone, contact_email, notes) VALUES
(1, 'Công ty TNHH Vận tải Sài Gòn', '0123456789', '456 Đường DEF, Quận 3, TP.HCM', 'Nguyễn Văn E', '0901234567', 'contact@saigontrans.com', 'Khách hàng VIP - ưu tiên thanh toán'),
(2, 'Tổng công ty Hàng hải Việt Nam', '0987654321', '789 Đường GHI, Quận 7, TP.HCM', 'Trần Thị F', '0912345678', 'info@vinalines.vn', 'Khách hàng lớn - hợp đồng dài hạn'),
(3, 'Công ty CP Logistics Miền Nam', '0555666777', '321 Đường JKL, Quận Bình Thạnh, TP.HCM', 'Lê Văn G', '0923456789', 'sales@southlogistics.com', 'Khách hàng thường xuyên'),
(4, 'Công ty TNHH Container Việt', '0444555666', '654 Đường MNO, Quận 2, TP.HCM', 'Phạm Thị H', '0934567890', 'orders@vietnamcontainer.com', 'Chuyên container 40ft'),
(5, 'Tập đoàn Vận tải Đông Nam Á', '0333444555', '987 Đường PQR, Quận 1, TP.HCM', 'Hoàng Văn I', '0945678901', 'business@seatrans.vn', 'Khách hàng xuất nhập khẩu');

-- Insert mock partners
INSERT IGNORE INTO partners (id, name, tax_code, address) VALUES
(1, 'Công ty TNHH Logistics Hà Nội', '0111222333', '123 Phố Huế, Hai Bà Trưng, Hà Nội'),
(2, 'Công ty CP Vận tải Đà Nẵng', '0222333444', '456 Trần Phú, Hải Châu, Đà Nẵng'),
(3, 'Công ty TNHH Container Cần Thơ', '0333444555', '789 Đại lộ Hòa Bình, Ninh Kiều, Cần Thơ'),
(4, 'Tổng công ty Cảng Hải Phòng', '0444555666', '321 Lạch Tray, Ngô Quyền, Hải Phòng'),
(5, 'Công ty CP Logistics Vũng Tàu', '0555666777', '654 Thùy Vân, Vũng Tàu');

-- Insert mock containers
INSERT IGNORE INTO containers (id, category, last_updated_by) VALUES
(1, '20ft', 'Administrator (@admin)'),
(2, '40ft', 'Administrator (@admin)'),
(3, '40ft-HC', 'Administrator (@admin)'),
(4, '45ft', 'Administrator (@admin)'),
(5, 'Tank', 'Administrator (@admin)');

-- ================================================================
-- III. VEHICLE MANAGEMENT TABLES
-- ================================================================

-- Insert mock tractors
INSERT IGNORE INTO tractors (id, license_plate, engine_type, description, purchase_cost, initial_valuation, purchase_date, last_updated_by) VALUES
(1, '51A-12345', 'Euro 5 Diesel', 'Xe đầu kéo Hyundai HD1000 2020', 1200000000.00, 1200000000.00, '2020-03-15', 'Administrator (@admin)'),
(2, '51B-67890', 'Euro 4 Diesel', 'Xe đầu kéo Hino 700 Series 2019', 1100000000.00, 900000000.00, '2019-08-20', 'Administrator (@admin)'),
(3, '51C-11111', 'Euro 5 Diesel', 'Xe đầu kéo Isuzu Giga 2021', 1300000000.00, 1300000000.00, '2021-01-10', 'Administrator (@admin)'),
(4, '51D-22222', 'Euro 4 Diesel', 'Xe đầu kéo Mitsubishi Fuso 2018', 1000000000.00, 800000000.00, '2018-12-05', 'Administrator (@admin)'),
(5, '51E-33333', 'Euro 5 Diesel', 'Xe đầu kéo Daewoo Prima 2022', 1400000000.00, 1400000000.00, '2022-05-25', 'Administrator (@admin)');

-- Insert mock trailers
INSERT IGNORE INTO trailers (id, license_plate, trailer_number, type, description, valuation, last_updated_by) VALUES
(1, '51R-11111', 'TR001', '40ft', 'Rơ moóc container 40ft Doosung', 300000000.00, 'Administrator (@admin)'),
(2, '51R-22222', 'TR002', '20ft', 'Rơ moóc container 20ft Cimc', 250000000.00, 'Administrator (@admin)'),
(3, '51R-33333', 'TR003', 'other', 'Rơ moóc sàn 45ft Hyundai', 350000000.00, 'Administrator (@admin)'),
(4, '51R-44444', 'TR004', 'other', 'Rơ moóc tank chở xăng 30m3', 400000000.00, 'Administrator (@admin)'),
(5, '51R-55555', 'TR005', '40ft', 'Rơ moóc thùng kín 40ft', 320000000.00, 'Administrator (@admin)');

-- Insert mock routes
INSERT IGNORE INTO routes (id, name, base_fee_40ft, base_fee_20ft, surcharge, discount, is_two_way_combined, notes) VALUES
(1, 'TP.HCM - Hà Nội', 15000000.00, 12000000.00, 500000.00, 0.00, TRUE, 'Tuyến đường chính Bắc Nam'),
(2, 'TP.HCM - Đà Nẵng', 8000000.00, 6500000.00, 300000.00, 200000.00, FALSE, 'Tuyến miền Trung phổ biến'),
(3, 'TP.HCM - Cần Thơ', 3000000.00, 2500000.00, 100000.00, 0.00, FALSE, 'Tuyến ngắn đồng bằng sông Cửu Long'),
(4, 'TP.HCM - Vũng Tàu', 2000000.00, 1800000.00, 50000.00, 100000.00, FALSE, 'Tuyến cảng Vũng Tàu'),
(5, 'Cát Lái - Tân Cảng', 1500000.00, 1200000.00, 0.00, 0.00, FALSE, 'Tuyến nội thành cảng');

-- Insert mock fuel standards
INSERT IGNORE INTO fuel_standards (id, tractor_id, trailer_type, load_category, consumption_rate, surcharge_rate_mountain, notes) VALUES
(1, 1, '40ft', 'under_20t', 28.50, 3.00, 'Hyundai HD1000 container 40ft tải nhẹ'),
(2, 1, '40ft', 'over_20t', 32.00, 4.00, 'Hyundai HD1000 container 40ft tải nặng'),
(3, 1, '40ft', 'empty', 25.00, 2.00, 'Hyundai HD1000 container 40ft rỗng'),
(4, 2, '20ft', 'under_20t', 26.00, 2.50, 'Hino 700 container 20ft tải nhẹ'),
(5, 2, '20ft', 'over_20t', 29.50, 3.50, 'Hino 700 container 20ft tải nặng'),
(6, 2, '20ft', 'empty', 23.00, 2.00, 'Hino 700 container 20ft rỗng'),
(7, 3, '40ft', 'under_20t', 27.00, 3.00, 'Isuzu Giga container 40ft tải nhẹ'),
(8, 3, '40ft', 'over_20t', 31.00, 4.00, 'Isuzu Giga container 40ft tải nặng'),
(9, 4, '40ft', 'empty', 24.50, 2.00, 'Mitsubishi Fuso container 40ft rỗng'),
(10, 5, '40ft', 'under_20t', 29.00, 3.50, 'Daewoo Prima container 40ft tải nhẹ');

-- ================================================================
-- IV. OPERATIONS TABLES
-- ================================================================

-- Insert mock jobs
INSERT IGNORE INTO jobs (id, job_date, tractor_id, trailer_id, user_id_driver, customer_id, route_id, container_number, description, distance_km, revenue, status) VALUES
(1, '2024-01-15', 1, 1, 3, 1, 1, 'TCLU1234567', 'Vận chuyển container 40ft từ Cát Lái đi Hà Nội', 1720, 15000000.00, 'COMPLETED'),
(2, '2024-01-20', 2, 2, 4, 2, 2, 'MSKU9876543', 'Vận chuyển container 20ft từ TP.HCM đi Đà Nẵng', 950, 6500000.00, 'COMPLETED'),
(3, '2024-02-01', 3, 3, 3, 3, 3, 'HLBU5555555', 'Vận chuyển hàng sàn từ TP.HCM đi Cần Thơ', 170, 3000000.00, 'COMPLETED'),
(4, '2024-02-10', 4, 4, 4, 4, 4, 'TANK001', 'Vận chuyển xăng từ TP.HCM đi Vũng Tàu', 125, 2000000.00, 'IN_PROGRESS'),
(5, '2024-02-15', 5, 5, 3, 5, 5, 'CSVU7777777', 'Vận chuyển container 40ft nội thành', 45, 1500000.00, 'PLANNED'),
(6, '2024-02-20', 1, 1, 4, 1, 1, 'TCLU2468135', 'Vận chuyển container 40ft rỗng về TP.HCM', 1720, 12000000.00, 'PLANNED'),
(7, '2024-02-25', 2, 2, 3, 2, 2, 'MSKU1357924', 'Vận chuyển container 20ft có hàng', 950, 8000000.00, 'DRAFT'),
(8, '2024-03-01', 3, 1, 4, 3, 1, 'HLBU8888888', 'Vận chuyển container 40ft xuất khẩu', 1720, 15500000.00, 'DRAFT');

-- ================================================================
-- V. EXPENSE MANAGEMENT TABLES
-- ================================================================

-- Insert mock expense categories
INSERT IGNORE INTO expense_categories (id, name, last_updated_by) VALUES
(1, 'MAINTENANCE', 'Administrator (@admin)'),
(2, 'INSURANCE', 'Administrator (@admin)'),
(3, 'DRIVER_SALARY', 'Administrator (@admin)'),
(4, 'FUEL', 'Administrator (@admin)'),
(5, 'REPAIRS', 'Administrator (@admin)'),
(6, 'ROAD_FEES', 'Administrator (@admin)'),
(7, 'TIRES', 'Administrator (@admin)'),
(8, 'PARKING', 'Administrator (@admin)'),
(9, 'REGISTRATION', 'Administrator (@admin)'),
(10, 'OTHER', 'Administrator (@admin)');

-- Insert mock expenses (with tractor associations)
INSERT IGNORE INTO expenses (id, expense_date, job_id, tractor_id, vendor_name, expense_category_id, total, payment_status, currency, remark, created_by, last_updated_by) VALUES
(1, '2024-01-15', 1, 1, 'Garage Minh Tuấn', 1, 2200000, 'PAID', 'VND', 'Bảo dưỡng định kỳ 10,000km', 2, 'Nguyễn Văn A (@manager1)'),
(2, '2024-02-01', 2, 2, 'Xưởng Hùng Vương', 1, 1650000, 'PENDING', 'VND', 'Thay dầu và lọc', 2, 'Nguyễn Văn A (@manager1)'),
(3, '2024-01-01', NULL, 3, 'Bảo hiểm PTI', 2, 5000000, 'PAID', 'VND', 'Bảo hiểm xe 1 năm', 1, 'Administrator (@admin)'),
(4, '2024-02-10', 4, 1, 'Cửa hàng phụ tùng ABC', 5, 880000, 'DRAFT', 'VND', 'Thay phanh trước', 3, 'Trần Văn B (@driver1)'),
(5, '2024-01-20', NULL, 4, 'Garage Thành Đạt', 5, 3300000, 'PAID', 'VND', 'Sửa chữa động cơ', 2, 'Nguyễn Văn A (@manager1)'),
(6, '2024-02-05', NULL, 1, 'Xưởng Hoàng Gia', 1, 1320000, 'PAID', 'VND', 'Bảo dưỡng hệ thống phanh', 2, 'Nguyễn Văn A (@manager1)'),
(7, '2024-02-15', 3, 2, 'Garage Việt Nam', 7, 990000, 'PENDING', 'VND', 'Thay lốp xe', 2, 'Nguyễn Văn A (@manager1)'),
(8, '2024-01-01', NULL, 3, 'Bảo hiểm Bảo Việt', 2, 3000000, 'PAID', 'VND', 'Bảo hiểm rơ moóc', 1, 'Administrator (@admin)'),
(9, '2024-02-20', 5, 4, 'Cửa hàng Minh Châu', 5, 660000, 'DRAFT', 'VND', 'Thay van an toàn', 3, 'Trần Văn B (@driver1)'),
(10, '2024-01-25', NULL, 5, 'Xưởng sơn Tấn Phát', 1, 2750000, 'PAID', 'VND', 'Sơn lại thùng xe', 2, 'Nguyễn Văn A (@manager1)');

-- Insert mock expense items with license_plate and tax_rate
INSERT IGNORE INTO expense_items (id, expense_id, license_plate, item_name, price, quantity, tax_rate, subtotal, total, install_date, expiry_date) VALUES
-- For expense 1 (Tractor maintenance - 51A-12345)
(1, 1, '51A-12345', 'Dầu động cơ Shell 15W40', 300000, 4, 10.0, 1200000, 1320000, '2024-01-15', NULL),
(2, 1, '51A-12345', 'Lọc dầu Toyota', 150000, 2, 10.0, 300000, 330000, '2024-01-15', '2024-07-15'),
(3, 1, '51A-12345', 'Lọc gió', 200000, 1, 10.0, 200000, 220000, '2024-01-15', '2024-07-15'),
(4, 1, '51A-12345', 'Chi phí công', 500000, 1, 10.0, 500000, 550000, '2024-01-15', NULL),

-- For expense 2 (Tractor oil change - 51B-67890)
(5, 2, '51B-67890', 'Dầu động cơ Castrol', 350000, 3, 10.0, 1050000, 1155000, '2024-02-01', NULL),
(6, 2, '51B-67890', 'Lọc dầu Hino', 180000, 1, 10.0, 180000, 198000, '2024-02-01', '2024-08-01'),
(7, 2, '51B-67890', 'Chi phí công', 420000, 1, 10.0, 420000, 462000, '2024-02-01', NULL),

-- For expense 3 (Insurance - 51C-11111)
(8, 3, '51C-11111', 'Bảo hiểm vật chất', 5000000, 1, 0.0, 5000000, 5000000, '2024-01-01', '2024-12-31'),

-- For expense 4 (Brake parts - 51A-12345)
(9, 4, '51A-12345', 'Má phanh trước', 400000, 2, 10.0, 800000, 880000, '2024-02-10', '2025-02-10'),

-- For expense 5 (Engine repair - 51D-22222)
(10, 5, '51D-22222', 'Bộ piston', 1500000, 1, 10.0, 1500000, 1650000, '2024-01-20', NULL),
(11, 5, '51D-22222', 'Găng tay bảo hộ', 50000, 2, 10.0, 100000, 110000, '2024-01-20', NULL),
(12, 5, '51D-22222', 'Chi phí sửa chữa', 1700000, 1, 10.0, 1700000, 1870000, '2024-01-20', NULL),

-- For expense 6 (Trailer brake maintenance - 51R-11111)
(13, 6, '51R-11111', 'Dầu phanh DOT4', 200000, 3, 10.0, 600000, 660000, '2024-02-05', NULL),
(14, 6, '51R-11111', 'Má phanh rơ moóc', 400000, 2, 10.0, 800000, 880000, '2024-02-05', '2025-02-05'),

-- For expense 7 (Tire replacement - 51R-22222)
(15, 7, '51R-22222', 'Lốp xe Bridgestone 11.00R20', 900000, 1, 10.0, 900000, 990000, '2024-02-15', NULL),

-- For expense 8 (Trailer insurance - 51R-33333)
(16, 8, '51R-33333', 'Bảo hiểm rơ moóc', 3000000, 1, 0.0, 3000000, 3000000, '2024-01-01', '2024-12-31'),

-- For expense 9 (Safety valve - 51R-44444)
(17, 9, '51R-44444', 'Van an toàn khí nén', 600000, 1, 10.0, 600000, 660000, '2024-02-20', '2025-02-20'),

-- For expense 10 (Paint job - 51R-55555)
(18, 10, '51R-55555', 'Sơn Nippon Paint', 800000, 1, 10.0, 800000, 880000, '2024-01-25', NULL),
(19, 10, '51R-55555', 'Chi phí thi công', 1950000, 1, 10.0, 1950000, 2145000, '2024-01-25', NULL);

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

-- ================================================================
-- VI. INVOICE MANAGEMENT TABLES
-- ================================================================

-- Insert mock invoice categories
INSERT IGNORE INTO invoice_categories (id, name, last_updated_by) VALUES
(1, 'TRANSPORTATION', 'Administrator (@admin)'),
(2, 'LOGISTICS_SERVICE', 'Administrator (@admin)'),
(3, 'PORT_FEES', 'Administrator (@admin)'),
(4, 'FUEL_SURCHARGE', 'Administrator (@admin)'),
(5, 'OTHER', 'Administrator (@admin)');

-- Insert mock invoices
INSERT IGNORE INTO invoices (id, customer_id, invoice_category_id, total, payment_status, currency, remark, created_by, last_updated_by) VALUES
(1, 1, 1, 15000000, 'PAID', 'VND', 'Hóa đơn vận chuyển container 40ft TP.HCM - Hà Nội', 2, 'Nguyễn Văn A (@manager1)'),
(2, 2, 1, 6500000, 'PENDING', 'VND', 'Hóa đơn vận chuyển container 20ft TP.HCM - Đà Nẵng', 2, 'Nguyễn Văn A (@manager1)'),
(3, 3, 1, 3000000, 'PAID', 'VND', 'Hóa đơn vận chuyển hàng sàn TP.HCM - Cần Thơ', 2, 'Nguyễn Văn A (@manager1)'),
(4, 4, 1, 2000000, 'DRAFT', 'VND', 'Hóa đơn vận chuyển tank TP.HCM - Vũng Tàu', 2, 'Nguyễn Văn A (@manager1)'),
(5, 5, 1, 1500000, 'DRAFT', 'VND', 'Hóa đơn vận chuyển container nội thành', 2, 'Nguyễn Văn A (@manager1)'),
(6, 1, 2, 500000, 'PAID', 'VND', 'Phí dịch vụ logistics bổ sung', 2, 'Nguyễn Văn A (@manager1)'),
(7, 2, 3, 800000, 'PENDING', 'VND', 'Phí cảng và xếp dỡ container', 2, 'Nguyễn Văn A (@manager1)'),
(8, 3, 4, 300000, 'PAID', 'VND', 'Phụ thu nhiên liệu tháng 2/2024', 2, 'Nguyễn Văn A (@manager1)');

-- Insert mock invoice items
INSERT IGNORE INTO invoice_items (id, invoice_id, license_plate, item_name, price, quantity, tax_rate, subtotal, total, service_date, notes) VALUES
-- For invoice 1 (Transportation TP.HCM - Hà Nội)
(1, 1, '51A-12345', 'Vận chuyển container 40ft', 15000000, 1, 10.0, 15000000, 16500000, '2024-01-15', 'Container TCLU1234567'),
(2, 1, '51A-12345', 'Giảm giá khách hàng VIP', -1500000, 1, 0.0, -1500000, -1500000, '2024-01-15', 'Chiết khấu 10%'),

-- For invoice 2 (Transportation TP.HCM - Đà Nẵng)
(3, 2, '51B-67890', 'Vận chuyển container 20ft', 6500000, 1, 10.0, 6500000, 7150000, '2024-01-20', 'Container MSKU9876543'),
(4, 2, '51B-67890', 'Giảm giá hợp đồng', -650000, 1, 0.0, -650000, -650000, '2024-01-20', 'Chiết khấu 10%'),

-- For invoice 3 (Transportation TP.HCM - Cần Thơ)
(5, 3, '51C-11111', 'Vận chuyển hàng sàn', 3000000, 1, 10.0, 3000000, 3300000, '2024-02-01', 'Container HLBU5555555'),
(6, 3, '51C-11111', 'Giảm giá thanh toán sớm', -300000, 1, 0.0, -300000, -300000, '2024-02-01', 'Chiết khấu 10%'),

-- For invoice 4 (Tank transportation)
(7, 4, '51D-22222', 'Vận chuyển tank xăng', 2000000, 1, 10.0, 2000000, 2200000, '2024-02-10', 'Tank TANK001'),
(8, 4, '51D-22222', 'Giảm giá', -200000, 1, 0.0, -200000, -200000, '2024-02-10', 'Chiết khấu 10%'),

-- For invoice 5 (Local transportation)
(9, 5, '51E-33333', 'Vận chuyển nội thành', 1500000, 1, 10.0, 1500000, 1650000, '2024-02-15', 'Container CSVU7777777'),
(10, 5, '51E-33333', 'Giảm giá', -150000, 1, 0.0, -150000, -150000, '2024-02-15', 'Chiết khấu 10%'),

-- For invoice 6 (Logistics service)
(11, 6, '51A-12345', 'Dịch vụ logistics', 500000, 1, 10.0, 500000, 550000, '2024-01-16', 'Dịch vụ bổ sung'),

-- For invoice 7 (Port fees)
(12, 7, '51B-67890', 'Phí cảng', 800000, 1, 10.0, 800000, 880000, '2024-01-21', 'Phí xếp dỢ container'),

-- For invoice 8 (Fuel surcharge)
(13, 8, '51C-11111', 'Phụ thu nhiên liệu', 300000, 1, 10.0, 300000, 330000, '2024-02-01', 'Phụ thu tháng 2/2024');

-- ================================================================
-- VII. FINANCIAL MANAGEMENT TABLES
-- ================================================================

-- Insert mock financial ledger entries
INSERT IGNORE INTO financial_ledgers (id, transaction_date, customer_id, partner_id, job_id, transaction_type, debit, credit, reference_number, notes) VALUES
-- Customer receivables
(1, '2024-01-15', 1, NULL, 1, 'INVOICE', 15000000.00, 0.00, 'INV-001', 'Hóa đơn vận chuyển container TCLU1234567'),
(2, '2024-01-20', 1, NULL, 1, 'PAYMENT_RECEIVED', 0.00, 15000000.00, 'PAY-001', 'Thu tiền hóa đơn INV-001'),
(3, '2024-01-20', 2, NULL, 2, 'INVOICE', 6500000.00, 0.00, 'INV-002', 'Hóa đơn vận chuyển container MSKU9876543'),
(4, '2024-02-01', 3, NULL, 3, 'INVOICE', 3000000.00, 0.00, 'INV-003', 'Hóa đơn vận chuyển hàng sàn HLBU5555555'),
(5, '2024-02-05', 3, NULL, 3, 'PAYMENT_RECEIVED', 0.00, 3000000.00, 'PAY-003', 'Thu tiền hóa đơn INV-003'),
(6, '2024-02-10', 4, NULL, 4, 'INVOICE', 2000000.00, 0.00, 'INV-004', 'Hóa đơn vận chuyển tank TANK001'),
(7, '2024-02-15', 5, NULL, 5, 'INVOICE', 1500000.00, 0.00, 'INV-005', 'Hóa đơn vận chuyển nội thành CSVU7777777'),

-- Partner payables
(8, '2024-01-15', NULL, 1, 1, 'PARTNER_INVOICE', 0.00, 2000000.00, 'PINV-001', 'Chi phí đối tác tuyến Hà Nội'),
(9, '2024-01-25', NULL, 1, 1, 'PARTNER_PAYMENT', 2000000.00, 0.00, 'PPAY-001', 'Thanh toán đối tác PINV-001'),
(10, '2024-01-20', NULL, 2, 2, 'PARTNER_INVOICE', 0.00, 1500000.00, 'PINV-002', 'Chi phí đối tác tuyến Đà Nẵng'),
(11, '2024-02-01', NULL, 3, 3, 'PARTNER_INVOICE', 0.00, 800000.00, 'PINV-003', 'Chi phí đối tác tuyến Cần Thơ'),
(12, '2024-02-10', NULL, 4, 4, 'PARTNER_INVOICE', 0.00, 600000.00, 'PINV-004', 'Chi phí đối tác tuyến Vũng Tàu'),

-- Opening balances
(13, '2024-01-01', 1, NULL, NULL, 'OPENING_BALANCE', 5000000.00, 0.00, 'OB-001', 'Số dư đầu kỳ khách hàng Vận tải Sài Gòn'),
(14, '2024-01-01', 2, NULL, NULL, 'OPENING_BALANCE', 2000000.00, 0.00, 'OB-002', 'Số dư đầu kỳ khách hàng Hàng hải Việt Nam'),
(15, '2024-01-01', NULL, 1, NULL, 'OPENING_BALANCE', 0.00, 1000000.00, 'OB-003', 'Số dư đầu kỳ đối tác Logistics Hà Nội'),

-- Adjustments
(16, '2024-02-01', 1, NULL, NULL, 'ADJUSTMENT', 0.00, 100000.00, 'ADJ-001', 'Điều chỉnh giảm công nợ khách hàng'),
(17, '2024-02-10', NULL, 2, NULL, 'ADJUSTMENT', 50000.00, 0.00, 'ADJ-002', 'Điều chỉnh tăng công nợ đối tác');

-- ================================================================
-- Summary of Mock Data - ALL TABLES
-- ================================================================
-- Users: 5 (1 admin, 1 manager, 2 drivers, 1 mechanic)
-- Settings: 7 system settings
-- Activity Logs: 8 sample log entries
-- Customers: 5 different companies
-- Partners: 5 partner companies
-- Containers: 5 different types
-- Tractors: 5 vehicles with full details
-- Trailers: 5 trailers with specifications
-- Routes: 5 standard routes with pricing
-- Fuel Standards: 10 fuel consumption standards
-- Jobs: 8 transport jobs with different statuses
-- Expense Categories: 10 categories
-- Expenses: 10 total expenses with job associations
-- Expense Items: 19 line items across all expenses
-- Maintenance Records: 8 maintenance entries
-- Invoice Categories: 5 categories
-- Invoices: 8 invoices for different services
-- Invoice Items: 13 invoice line items
-- Financial Ledgers: 17 financial transactions
-- ================================================================
