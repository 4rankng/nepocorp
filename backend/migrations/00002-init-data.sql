

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
INSERT IGNORE INTO expense_categories (name, description, last_updated_by) VALUES
('Nhiên liệu (Dầu lade)', 'Chi phí dầu diesel tiêu thụ trong các chuyến đi.', 'system'),
('Phí Cầu đường', 'Bao gồm tất cả các khoản phí tại trạm thu phí BOT, vé cầu, vé phà.', 'system');

-- Nhóm 2: Chi phí Sửa chữa & Bảo dưỡng
INSERT IGNORE INTO expense_categories (name, description, last_updated_by) VALUES
('Sửa chữa chung', 'Chi phí sửa chữa đột xuất hoặc theo kế hoạch (sửa điện, máy, gầm, điều hòa).', 'system'),
('Bảo dưỡng định kỳ', 'Chi phí bảo dưỡng theo lịch trình (bơm mỡ, thay lọc, thay nước làm mát).', 'system'),
('Lốp xe', 'Chi phí mua mới, thay thế, vá hoặc đảo lốp.', 'system'),
('Dầu mỡ & Vật tư', 'Chi phí các loại dầu nhớt (dầu máy, dầu cầu), mỡ và các vật tư tiêu hao khác.', 'system'),
('Cứu hộ', 'Chi phí phát sinh khi xe gặp sự cố trên đường và cần xe cứu hộ.', 'system');

-- Nhóm 3: Chi phí Nhân sự
INSERT IGNORE INTO expense_categories (name, description, last_updated_by) VALUES
('Lương Lái xe', 'Tiền lương hàng tháng, thưởng và các khoản phúc lợi khác cho tài xế.', 'system'),
('Thưởng Lễ/Tết', 'Các khoản thưởng cho lái xe vào các dịp đặc biệt như lễ, Tết.', 'system');

-- Nhóm 4: Chi phí Cố định & Hành chính
INSERT IGNORE INTO expense_categories (name, description, last_updated_by) VALUES
('Phí Gửi xe', 'Chi phí đỗ xe, gửi xe tại bãi hàng tháng hoặc theo lượt.', 'system'),
('Bảo hiểm', 'Phí mua bảo hiểm TNDS bắt buộc và bảo hiểm vật chất (thân vỏ) tự nguyện.', 'system'),
('Phí Bảo trì Đường bộ', 'Phí bắt buộc nộp hàng năm cho quỹ bảo trì đường bộ.', 'system'),
('Phí Đăng kiểm', 'Lệ phí kiểm định an toàn kỹ thuật và bảo vệ môi trường cho xe cơ giới.', 'system'),
('Phí Dịch vụ Đăng kiểm', 'Chi phí cho các dịch vụ hỗ trợ liên quan trong quá trình đăng kiểm.', 'system'),
('Phí Phù hiệu & Giấy tờ', 'Các chi phí làm phù hiệu xe tải, giấy phép và các thủ tục hành chính liên quan.', 'system'),
('Phí Định vị GPS', 'Chi phí dịch vụ giám sát hành trình GPS hàng năm.', 'system'),
('Phạt vi phạm', 'Các khoản tiền phạt do vi phạm luật giao thông đường bộ.', 'system');

-- Nhóm 5: Chi phí Khác
INSERT IGNORE INTO expense_categories (name, description, last_updated_by) VALUES
('Trang bị & Nâng cấp', 'Chi phí lắp đặt thêm thiết bị như camera, âm thanh, hoặc nâng cấp các bộ phận xe.', 'system');


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
INSERT IGNORE INTO users (id, username, email, password, name, role, last_updated_by) VALUES
(1, 'admin', 'admin@nepocorp.com',
   HEX(SHA2(CONCAT('admin', @hash_salt, @hash_secret), 256)),
   'Administrator', 'admin', 'Administrator (@admin)'),
(2, 'manager1', 'manager1@nepocorp.com',
   HEX(SHA2(CONCAT('manager', @hash_salt, @hash_secret), 256)),
   'Nguyễn Văn A', 'manager', 'Administrator (@admin)'),
(3, 'driver1', 'driver1@nepocorp.com',
   HEX(SHA2(CONCAT('driver', @hash_salt, @hash_secret), 256)),
   'Trần Văn B', 'driver', 'Administrator (@admin)'),
(4, 'driver2', 'driver2@nepocorp.com',
   HEX(SHA2(CONCAT('driver', @hash_salt, @hash_secret), 256)),
   'Lê Thị C', 'driver', 'Administrator (@admin)'),
(5, 'mechanic1', 'mechanic1@nepocorp.com',
   HEX(SHA2(CONCAT('mechanic', @hash_salt, @hash_secret), 256)),
   'Phạm Văn D', 'mechanic', 'Administrator (@admin)');

-- Insert mock settings
INSERT IGNORE INTO settings (id, `key`, `value`, last_updated_by) VALUES
(1, 'tax_rate', '10', 'Administrator (@admin)'),
(2, 'company_name', 'Nepo Corporation', 'Administrator (@admin)'),
(3, 'company_address', '123 Đường ABC, Quận 1, TP.HCM', 'Administrator (@admin)'),
(4, 'company_phone', '028-1234-5678', 'Administrator (@admin)'),
(5, 'maintenance_reminder_days', '30', 'Administrator (@admin)'),
(6, 'fuel_price_default', '25000', 'Administrator (@admin)'),
(7, 'insurance_renewal_reminder_days', '60', 'Administrator (@admin)');

-- Activity logs will be populated automatically when users interact with the system

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
INSERT IGNORE INTO tractors (id, license_plate, make, model, year_of_manufacture, inspection_due_date, road_fee_due_date, insurance_policy_number, insurance_expiry_date, remark, last_updated_by) VALUES
(1, '51A-12345', 'Hyundai', 'HD1000', 2020, '2024-03-15', '2024-12-31', 'INS-HD1000-2024', '2024-12-31', 'Xe đầu kéo Hyundai HD1000 2020, Euro 5 Diesel', 'Administrator (@admin)'),
(2, '51B-67890', 'Hino', '700 Series', 2019, '2024-08-20', '2024-12-31', 'INS-HINO700-2024', '2024-12-31', 'Xe đầu kéo Hino 700 Series 2019, Euro 4 Diesel', 'Administrator (@admin)'),
(3, '51C-11111', 'Isuzu', 'Giga', 2021, '2024-01-10', '2024-12-31', 'INS-GIGA-2024', '2024-12-31', 'Xe đầu kéo Isuzu Giga 2021, Euro 5 Diesel', 'Administrator (@admin)'),
(4, '51D-22222', 'Mitsubishi', 'Fuso', 2018, '2024-12-05', '2024-12-31', 'INS-FUSO-2024', '2024-12-31', 'Xe đầu kéo Mitsubishi Fuso 2018, Euro 4 Diesel', 'Administrator (@admin)'),
(5, '51E-33333', 'Daewoo', 'Prima', 2022, '2024-05-25', '2024-12-31', 'INS-PRIMA-2024', '2024-12-31', 'Xe đầu kéo Daewoo Prima 2022, Euro 5 Diesel', 'Administrator (@admin)');

-- Insert mock trailers
INSERT IGNORE INTO trailers (id, license_plate, type, make, model, year_of_manufacture, remark, last_updated_by) VALUES
(1, '51R-11111', '40FT', 'Doosung', 'Container 40ft', 2020, 'Rơ moóc container 40ft Doosung', 'Administrator (@admin)'),
(2, '51R-22222', '20FT', 'Cimc', 'Container 20ft', 2019, 'Rơ moóc container 20ft Cimc', 'Administrator (@admin)'),
(3, '51R-33333', '45FT', 'Hyundai', 'Flatbed 45ft', 2021, 'Rơ moóc sàn 45ft Hyundai', 'Administrator (@admin)'),
(4, '51R-44444', 'TANK', 'Daehan', 'Tank 30m3', 2018, 'Rơ moóc tank chở xăng 30m3', 'Administrator (@admin)'),
(5, '51R-55555', '40FT', 'Hyundai', 'Box 40ft', 2022, 'Rơ moóc thùng kín 40ft', 'Administrator (@admin)');

-- Insert mock routes
INSERT IGNORE INTO routes (id, name, trailer_type, base_fee, surcharge, discount, is_two_way_combined, notes) VALUES
(1, 'TP.HCM - Hà Nội (40FT)', '40FT', 15000000.00, 500000.00, 0.00, TRUE, 'Tuyến đường chính Bắc Nam - Container 40ft'),
(2, 'TP.HCM - Hà Nội (20FT)', '20FT', 12000000.00, 500000.00, 0.00, TRUE, 'Tuyến đường chính Bắc Nam - Container 20ft'),
(3, 'TP.HCM - Đà Nẵng (40FT)', '40FT', 8000000.00, 300000.00, 200000.00, FALSE, 'Tuyến miền Trung phổ biến - Container 40ft'),
(4, 'TP.HCM - Đà Nẵng (20FT)', '20FT', 6500000.00, 300000.00, 200000.00, FALSE, 'Tuyến miền Trung phổ biến - Container 20ft'),
(5, 'TP.HCM - Cần Thơ (40FT)', '40FT', 3000000.00, 100000.00, 0.00, FALSE, 'Tuyến ngắn đồng bằng sông Cửu Long - Container 40ft'),
(6, 'TP.HCM - Cần Thơ (20FT)', '20FT', 2500000.00, 100000.00, 0.00, FALSE, 'Tuyến ngắn đồng bằng sông Cửu Long - Container 20ft'),
(7, 'TP.HCM - Vũng Tàu (40FT)', '40FT', 2000000.00, 50000.00, 100000.00, FALSE, 'Tuyến cảng Vũng Tàu - Container 40ft'),
(8, 'TP.HCM - Vũng Tàu (20FT)', '20FT', 1800000.00, 50000.00, 100000.00, FALSE, 'Tuyến cảng Vũng Tàu - Container 20ft'),
(9, 'Cát Lái - Tân Cảng (40FT)', '40FT', 1500000.00, 0.00, 0.00, FALSE, 'Tuyến nội thành cảng - Container 40ft'),
(10, 'Cát Lái - Tân Cảng (20FT)', '20FT', 1200000.00, 0.00, 0.00, FALSE, 'Tuyến nội thành cảng - Container 20ft');

-- Insert mock fuel standards
INSERT IGNORE INTO fuel_standards (id, tractor_id, trailer_type, load_category, consumption_rate, surcharge_rate_mountain, notes) VALUES
(1, 1, '40FT', 'under_20t', 28.50, 3.00, 'Hyundai HD1000 container 40ft tải nhẹ'),
(2, 1, '40FT', 'over_20t', 32.00, 4.00, 'Hyundai HD1000 container 40ft tải nặng'),
(3, 1, '40FT', 'empty', 25.00, 2.00, 'Hyundai HD1000 container 40ft rỗng'),
(4, 2, '20FT', 'under_20t', 26.00, 2.50, 'Hino 700 container 20ft tải nhẹ'),
(5, 2, '20FT', 'over_20t', 29.50, 3.50, 'Hino 700 container 20ft tải nặng'),
(6, 2, '20FT', 'empty', 23.00, 2.00, 'Hino 700 container 20ft rỗng'),
(7, 3, '40FT', 'under_20t', 27.00, 3.00, 'Isuzu Giga container 40ft tải nhẹ'),
(8, 3, '40FT', 'over_20t', 31.00, 4.00, 'Isuzu Giga container 40ft tải nặng'),
(9, 4, '40FT', 'empty', 24.50, 2.00, 'Mitsubishi Fuso container 40ft rỗng'),
(10, 5, '40FT', 'under_20t', 29.00, 3.50, 'Daewoo Prima container 40ft tải nhẹ');

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

-- Insert expense categories (Vietnamese structure from migration)
-- Nhóm 1: Chi phí Vận hành Trực tiếp
INSERT IGNORE INTO expense_categories (name, description, last_updated_by) VALUES
('Nhiên liệu (Dầu lade)', 'Chi phí dầu diesel tiêu thụ trong các chuyến đi.', 'system'),
('Phí Cầu đường', 'Bao gồm tất cả các khoản phí tại trạm thu phí BOT, vé cầu, vé phà.', 'system');

-- Nhóm 2: Chi phí Sửa chữa & Bảo dưỡng
INSERT IGNORE INTO expense_categories (name, description, last_updated_by) VALUES
('Sửa chữa chung', 'Chi phí sửa chữa đột xuất hoặc theo kế hoạch (sửa điện, máy, gầm, điều hòa).', 'system'),
('Bảo dưỡng định kỳ', 'Chi phí bảo dưỡng theo lịch trình (bơm mỡ, thay lọc, thay nước làm mát).', 'system'),
('Lốp xe', 'Chi phí mua mới, thay thế, vá hoặc đảo lốp.', 'system'),
('Dầu mỡ & Vật tư', 'Chi phí các loại dầu nhớt (dầu máy, dầu cầu), mỡ và các vật tư tiêu hao khác.', 'system'),
('Cứu hộ', 'Chi phí phát sinh khi xe gặp sự cố trên đường và cần xe cứu hộ.', 'system');

-- Nhóm 3: Chi phí Nhân sự
INSERT IGNORE INTO expense_categories (name, description, last_updated_by) VALUES
('Lương Lái xe', 'Tiền lương hàng tháng, thưởng và các khoản phúc lợi khác cho tài xế.', 'system'),
('Thưởng Lễ/Tết', 'Các khoản thưởng cho lái xe vào các dịp đặc biệt như lễ, Tết.', 'system');

-- Nhóm 4: Chi phí Cố định & Hành chính
INSERT IGNORE INTO expense_categories (name, description, last_updated_by) VALUES
('Phí Gửi xe', 'Chi phí đỗ xe, gửi xe tại bãi hàng tháng hoặc theo lượt.', 'system'),
('Bảo hiểm', 'Phí mua bảo hiểm TNDS bắt buộc và bảo hiểm vật chất (thân vỏ) tự nguyện.', 'system'),
('Phí Bảo trì Đường bộ', 'Phí bắt buộc nộp hàng năm cho quỹ bảo trì đường bộ.', 'system'),
('Phí Đăng kiểm', 'Lệ phí kiểm định an toàn kỹ thuật và bảo vệ môi trường cho xe cơ giới.', 'system'),
('Phí Dịch vụ Đăng kiểm', 'Chi phí cho các dịch vụ hỗ trợ liên quan trong quá trình đăng kiểm.', 'system'),
('Phí Phù hiệu & Giấy tờ', 'Các chi phí làm phù hiệu xe tải, giấy phép và các thủ tục hành chính liên quan.', 'system'),
('Phí Định vị GPS', 'Chi phí dịch vụ giám sát hành trình GPS hàng năm.', 'system'),
('Phạt vi phạm', 'Các khoản tiền phạt do vi phạm luật giao thông đường bộ.', 'system');

-- Nhóm 5: Chi phí Khác
INSERT IGNORE INTO expense_categories (name, description, last_updated_by) VALUES
('Trang bị & Nâng cấp', 'Chi phí lắp đặt thêm thiết bị như camera, âm thanh, hoặc nâng cấp các bộ phận xe.', 'system');

-- Insert mock expenses (with tractor associations)
INSERT IGNORE INTO expenses (id, expense_date, job_id, tractor_id, vendor_name, expense_category_id, total, payment_status, currency, remark, created_by, last_updated_by) VALUES
(1, '2024-01-15', 1, 1, 'Garage Minh Tuấn', (SELECT id FROM expense_categories WHERE name = 'Bảo dưỡng định kỳ'), 2200000, 'PAID', 'VND', 'Bảo dưỡng định kỳ 10,000km', 2, 'Nguyễn Văn A (@manager1)'),
(2, '2024-02-01', 2, 2, 'Xưởng Hùng Vương', (SELECT id FROM expense_categories WHERE name = 'Bảo dưỡng định kỳ'), 1650000, 'PENDING', 'VND', 'Thay dầu và lọc', 2, 'Nguyễn Văn A (@manager1)'),
(3, '2024-01-01', NULL, 3, 'Bảo hiểm PTI', (SELECT id FROM expense_categories WHERE name = 'Bảo hiểm'), 5000000, 'PAID', 'VND', 'Bảo hiểm xe 1 năm', 1, 'Administrator (@admin)'),
(4, '2024-02-10', 4, 1, 'Cửa hàng phụ tùng ABC', (SELECT id FROM expense_categories WHERE name = 'Sửa chữa chung'), 880000, 'DRAFT', 'VND', 'Thay phanh trước', 3, 'Trần Văn B (@driver1)'),
(5, '2024-01-20', NULL, 4, 'Garage Thành Đạt', (SELECT id FROM expense_categories WHERE name = 'Sửa chữa chung'), 3300000, 'PAID', 'VND', 'Sửa chữa động cơ', 2, 'Nguyễn Văn A (@manager1)'),
(6, '2024-02-05', NULL, 1, 'Xưởng Hoàng Gia', (SELECT id FROM expense_categories WHERE name = 'Bảo dưỡng định kỳ'), 1320000, 'PAID', 'VND', 'Bảo dưỡng hệ thống phanh', 2, 'Nguyễn Văn A (@manager1)'),
(7, '2024-02-15', 3, 2, 'Garage Việt Nam', (SELECT id FROM expense_categories WHERE name = 'Lốp xe'), 990000, 'PENDING', 'VND', 'Thay lốp xe', 2, 'Nguyễn Văn A (@manager1)'),
(8, '2024-01-01', NULL, 3, 'Bảo hiểm Bảo Việt', (SELECT id FROM expense_categories WHERE name = 'Bảo hiểm'), 3000000, 'PAID', 'VND', 'Bảo hiểm rơ moóc', 1, 'Administrator (@admin)'),
(9, '2024-02-20', 5, 4, 'Cửa hàng Minh Châu', (SELECT id FROM expense_categories WHERE name = 'Sửa chữa chung'), 660000, 'DRAFT', 'VND', 'Thay van an toàn', 3, 'Trần Văn B (@driver1)'),
(10, '2024-01-25', NULL, 5, 'Xưởng sơn Tấn Phát', (SELECT id FROM expense_categories WHERE name = 'Bảo dưỡng định kỳ'), 2750000, 'PAID', 'VND', 'Sơn lại thùng xe', 2, 'Nguyễn Văn A (@manager1)');

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
(1, 'Vận chuyển Container', 'Administrator (@admin)'),
(2, 'Dịch vụ Logistics', 'Administrator (@admin)'),
(3, 'Phí Cảng & Xếp dỡ', 'Administrator (@admin)'),
(4, 'Phụ thu Nhiên liệu', 'Administrator (@admin)'),
(5, 'Dịch vụ Khác', 'Administrator (@admin)');

-- Insert mock invoices
INSERT IGNORE INTO invoices (id, customer_id, invoice_category_id, total, payment_status, currency, remark, created_by, last_updated_by) VALUES
(1, 1, 1, 15000000, 'PAID', 'VND', 'Phiếu thu vận chuyển container 40ft TP.HCM - Hà Nội', 2, 'Nguyễn Văn A (@manager1)'),
(2, 2, 1, 6500000, 'PENDING', 'VND', 'Phiếu thu vận chuyển container 20ft TP.HCM - Đà Nẵng', 2, 'Nguyễn Văn A (@manager1)'),
(3, 3, 1, 3000000, 'PAID', 'VND', 'Phiếu thu vận chuyển hàng sàn TP.HCM - Cần Thơ', 2, 'Nguyễn Văn A (@manager1)'),
(4, 4, 1, 2000000, 'DRAFT', 'VND', 'Phiếu thu vận chuyển tank TP.HCM - Vũng Tàu', 2, 'Nguyễn Văn A (@manager1)'),
(5, 5, 1, 1500000, 'DRAFT', 'VND', 'Phiếu thu vận chuyển container nội thành', 2, 'Nguyễn Văn A (@manager1)'),
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
(1, '2024-01-15', 1, NULL, 1, 'INVOICE', 15000000.00, 0.00, 'INV-001', 'Phiếu thu vận chuyển container TCLU1234567'),
(2, '2024-01-20', 1, NULL, 1, 'PAYMENT_RECEIVED', 0.00, 15000000.00, 'PAY-001', 'Thu tiền phiếu thu INV-001'),
(3, '2024-01-20', 2, NULL, 2, 'INVOICE', 6500000.00, 0.00, 'INV-002', 'Phiếu thu vận chuyển container MSKU9876543'),
(4, '2024-02-01', 3, NULL, 3, 'INVOICE', 3000000.00, 0.00, 'INV-003', 'Phiếu thu vận chuyển hàng sàn HLBU5555555'),
(5, '2024-02-05', 3, NULL, 3, 'PAYMENT_RECEIVED', 0.00, 3000000.00, 'PAY-003', 'Thu tiền phiếu thu INV-003'),
(6, '2024-02-10', 4, NULL, 4, 'INVOICE', 2000000.00, 0.00, 'INV-004', 'Phiếu thu vận chuyển tank TANK001'),
(7, '2024-02-15', 5, NULL, 5, 'INVOICE', 1500000.00, 0.00, 'INV-005', 'Phiếu thu vận chuyển nội thành CSVU7777777'),

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



-- =================================================================
-- PHẦN II: DỮ LIỆU GIAO DỊCH VẬN HÀNH (JOBS & EXPENSES)
-- Trích xuất từ file Xe-15C-070.63.xlsx [3]
-- =================================================================

-- Đặt các biến dùng chung
SET @tractor_id = (SELECT id FROM tractors WHERE license_plate = '51A-12345');
SET @trailer_id = (SELECT id FROM trailers WHERE license_plate = '51R-11111');
SET @admin_user_id = 1; -- Giả định user admin có id=1

-- ------------- Dữ liệu Tháng 12/2020 -------------
-- Chuyến 1
INSERT INTO jobs (job_date, tractor_id, trailer_id, container_number, description, revenue, status) VALUES ('2020-12-01', @tractor_id, @trailer_id, 'DRYU3044197', 'Tr hàng NK sáng 01/12 ng hng KH - Minh Trí, Sóc Sơn, Hà Nội - Tiên Du, Bắc Ninh', 5200000, 'COMPLETED');
SET @last_job_id = LAST_INSERT_ID();
INSERT INTO expenses (expense_date, job_id, tractor_id, vendor_name, expense_category_id, total, description, created_by) VALUES
('2020-12-01', @last_job_id, @tractor_id, 'Trạm thu phí', (SELECT id FROM expense_categories WHERE name = 'Phí Cầu đường'), 1230000, 'Đi đường', @admin_user_id);

-- Chuyến 2
INSERT INTO jobs (job_date, tractor_id, trailer_id, container_number, description, revenue, status) VALUES ('2020-12-03', @tractor_id, @trailer_id, 'PASU0000258', 'Tr hàng NK sáng 02/12 - 03/12 - KCN VSIP, Bắc Ninh', 5500000, 'COMPLETED');
SET @last_job_id = LAST_INSERT_ID();
INSERT INTO expenses (expense_date, job_id, tractor_id, vendor_name, expense_category_id, total, description, created_by) VALUES
('2020-12-03', @last_job_id, @tractor_id, 'Trạm thu phí', (SELECT id FROM expense_categories WHERE name = 'Phí Cầu đường'), 1230000, 'Đi đường', @admin_user_id);

-- Chuyến 3
INSERT INTO jobs (job_date, tractor_id, trailer_id, container_number, description, revenue, status) VALUES ('2020-12-04', @tractor_id, @trailer_id, 'CBHU5551029', 'Tr hàng Vietsun sáng 04/12 - P. Đông Tân, TP. Thanh Hóa', 5509091, 'COMPLETED');
SET @last_job_id = LAST_INSERT_ID();
INSERT INTO expenses (expense_date, job_id, tractor_id, vendor_name, expense_category_id, total, description, created_by) VALUES
('2020-12-04', @last_job_id, @tractor_id, 'Cây xăng', (SELECT id FROM expense_categories WHERE name = 'Nhiên liệu (Dầu lade)'), 2400300, 'Dầu lade', @admin_user_id),
('2020-12-04', @last_job_id, @tractor_id, 'Trạm thu phí', (SELECT id FROM expense_categories WHERE name = 'Phí Cầu đường'), 890000, 'Đi đường', @admin_user_id);

-- (Thêm các chuyến còn lại của tháng 12/2020...)

-- Chi phí tổng hợp cuối tháng 12/2020
INSERT INTO expenses (expense_date, tractor_id, vendor_name, expense_category_id, total, description, created_by) VALUES
('2020-12-31', @tractor_id, 'Bãi xe', (SELECT id FROM expense_categories WHERE name = 'Phí Gửi xe'), 1200000, 'Phí gửi xe T12/2020', @admin_user_id),
('2020-12-31', @tractor_id, 'Gara', (SELECT id FROM expense_categories WHERE name = 'Lốp xe'), 10000000, 'Thanh toán tiền lốp 295/75R22.5 Deestone ngày 17/12', @admin_user_id),
('2020-12-31', @tractor_id, 'Gara', (SELECT id FROM expense_categories WHERE name = 'Sửa chữa chung'), 13200000, 'Sửa xe ngày 27/12 - Thay 2 bánh răng tống nhanh, chậm, 2 tháp số, đóng tống số', @admin_user_id),
('2020-12-31', @tractor_id, 'Gara', (SELECT id FROM expense_categories WHERE name = 'Sửa chữa chung'), 2400000, 'Sửa xe ngày 27/12 - Mua dầu rửa, gioăng, công thợ làm đóng tống, thay phớt bót lái', @admin_user_id),
('2020-12-31', @tractor_id, 'Lái xe', (SELECT id FROM expense_categories WHERE name = 'Lương Lái xe'), 9692308, 'Lương lái xe T12/2020', @admin_user_id);


-- ------------- Dữ liệu Tháng 01/2021 -------------
-- Chuyến 1
INSERT INTO jobs (job_date, tractor_id, trailer_id, container_number, description, revenue, status) VALUES ('2021-01-01', @tractor_id, @trailer_id, 'BSIU2599472', 'Tr hàng NK sáng 02/01 - TT Bích Động, Việt Yên, Bắc Giang', 4230000, 'COMPLETED');
SET @last_job_id = LAST_INSERT_ID();
INSERT INTO expenses (expense_date, job_id, tractor_id, vendor_name, expense_category_id, total, description, created_by) VALUES
('2021-01-01', @last_job_id, @tractor_id, 'Cây xăng', (SELECT id FROM expense_categories WHERE name = 'Nhiên liệu (Dầu lade)'), 2288450, 'Dầu lade', @admin_user_id),
('2021-01-01', @last_job_id, @tractor_id, 'Trạm thu phí', (SELECT id FROM expense_categories WHERE name = 'Phí Cầu đường'), 810000, 'Đi đường', @admin_user_id);

-- Chuyến 2
INSERT INTO jobs (job_date, tractor_id, trailer_id, container_number, description, revenue, status) VALUES ('2021-01-04', @tractor_id, @trailer_id, 'GAOU2132769', 'Tr hàng NK, đóng hàng kết hợp - Minh Trí, Sóc Sơn & KCN Khai Quang, Vĩnh Phúc', 5500000, 'COMPLETED');
SET @last_job_id = LAST_INSERT_ID();
INSERT INTO expenses (expense_date, job_id, tractor_id, vendor_name, expense_category_id, total, description, created_by) VALUES
('2021-01-04', @last_job_id, @tractor_id, 'Trạm thu phí', (SELECT id FROM expense_categories WHERE name = 'Phí Cầu đường'), 1110000, 'Đi đường', @admin_user_id);

-- (Thêm các chuyến còn lại của tháng 01/2021...)

-- Chi phí tổng hợp cuối tháng 01/2021
INSERT INTO expenses (expense_date, tractor_id, vendor_name, expense_category_id, total, description, created_by) VALUES
('2021-01-31', @tractor_id, 'Bãi xe', (SELECT id FROM expense_categories WHERE name = 'Phí Gửi xe'), 1200000, 'Phí gửi xe T01/2021', @admin_user_id),
('2021-01-31', @tractor_id, 'Cứu hộ', (SELECT id FROM expense_categories WHERE name = 'Cứu hộ'), 1100000, 'Cứu hộ xe tại Hà Nam, thay 1 mắt bơm hơi ngày 18/01', @admin_user_id),
('2021-01-31', @tractor_id, 'Gara', (SELECT id FROM expense_categories WHERE name = 'Sửa chữa chung'), 2200000, 'Tháo lắp thông két nước, thay hộp nhôm dưới, hàn 2 mép két nước ngày 10/01', @admin_user_id),
('2021-01-31', @tractor_id, 'Lái xe', (SELECT id FROM expense_categories WHERE name = 'Lương Lái xe'), 9000000, 'Lương lái xe T01/2021', @admin_user_id);


-- =================================================================
-- PHẦN III: DỮ LIỆU SỔ CÁI TÀI CHÍNH (FINANCIAL LEDGERS)
-- Trích xuất từ file CONG-NO-PHAI-THU-2025.xlsx [2]
-- =================================================================

-- ------------- Giao dịch Khách hàng: Mộc Sảng -------------
SET @customer_id_ms = (SELECT id FROM customers WHERE name = 'Mộc Sảng');
INSERT INTO financial_ledgers (transaction_date, customer_id, transaction_type, debit, credit, reference_number, notes) VALUES
('2019-06-06', @customer_id_ms, 'INVOICE', 26567900, 0, 'MS19001', 'Giấy báo nợ số MS19001'),
('2019-07-08', @customer_id_ms, 'PAYMENT_RECEIVED', 0, 26567000, 'MS19001', 'Công ty chè Mộc Sảng thanh toán tiền MS19001'),
('2019-07-31', @customer_id_ms, 'INVOICE', 26819450, 0, 'MS19002', 'Giấy báo nợ số MS19002'),
('2019-08-27', @customer_id_ms, 'PAYMENT_RECEIVED', 0, 26819450, 'MS19002', 'Công ty chè Mộc Sảng thanh toán tiền MS19002'),
('2020-04-28', @customer_id_ms, 'INVOICE', 26687400, 0, 'MS20001', 'GBN MS20001'),
('2020-06-01', @customer_id_ms, 'PAYMENT_RECEIVED', 0, 26687400, NULL, 'MS thanh toán'),
('2021-05-05', @customer_id_ms, 'INVOICE', 40225450, 0, 'MS21001', 'GBN MS21001'),
('2021-05-20', @customer_id_ms, 'PAYMENT_RECEIVED', 0, 40225450, NULL, 'MS thanh toán'),
('2022-08-30', @customer_id_ms, 'INVOICE', 57276950, 0, 'MS22001', 'GBN MS22001'),
('2022-09-23', @customer_id_ms, 'PAYMENT_RECEIVED', 0, 57276950, NULL, 'MS thanh toán'),
('2023-09-13', @customer_id_ms, 'INVOICE', 43241200, 0, 'MS23001', 'GBN MS23001'),
('2023-11-27', @customer_id_ms, 'PAYMENT_RECEIVED', 0, 105946550, NULL, 'MS thanh toán gộp nhiều GBN');


-- ------------- Giao dịch Khách hàng: Tân Lập MC -------------
SET @customer_id_tlmc = (SELECT id FROM customers WHERE name = 'Tân Lập MC');
INSERT INTO financial_ledgers (transaction_date, customer_id, transaction_type, debit, credit, reference_number, notes) VALUES
('2019-06-29', @customer_id_tlmc, 'INVOICE', 30932000, 0, NULL, 'Công nợ phát sinh trong T6/2019'),
('2019-07-10', @customer_id_tlmc, 'PAYMENT_RECEIVED', 0, 30932000, NULL, 'Tân Lập MC thanh toán tiền'),
('2020-03-31', @customer_id_tlmc, 'INVOICE', 16916000, 0, 'TLMC2003001', 'GBN TLMC2003001'),
('2020-04-14', @customer_id_tlmc, 'PAYMENT_RECEIVED', 0, 16916000, NULL, 'TLMC thanh toán'),
('2021-06-30', @customer_id_tlmc, 'INVOICE', 47288000, 0, 'TLMC2106002', 'GBN TLMC2106002'),
('2021-08-18', @customer_id_tlmc, 'PAYMENT_RECEIVED', 0, 47288000, NULL, 'TLMC thanh toán'),
('2022-06-29', @customer_id_tlmc, 'INVOICE', 71076800, 0, 'TLMC2206001', 'GBN TLMC2206001'),
('2022-07-25', @customer_id_tlmc, 'PAYMENT_RECEIVED', 0, 71076800, NULL, 'TLMC thanh toán');

-- ------------- Giao dịch Khách hàng: Vista -------------
SET @customer_id_vista = (SELECT id FROM customers WHERE name = 'Vista');
INSERT INTO financial_ledgers (transaction_date, customer_id, transaction_type, debit, credit, reference_number, notes) VALUES
('2021-12-30', @customer_id_vista, 'INVOICE', 7274000, 0, 'VTA211201', 'GBN VTA211201'),
('2022-01-17', @customer_id_vista, 'PAYMENT_RECEIVED', 0, 7274000, NULL, 'Vista thanh toán'),
('2022-03-30', @customer_id_vista, 'INVOICE', 15740800, 0, 'VAT2203001', 'GBN VAT2203001'),
('2022-04-18', @customer_id_vista, 'PAYMENT_RECEIVED', 0, 15740800, NULL, 'Vista thanh toán'),
('2023-01-31', @customer_id_vista, 'INVOICE', 16593408, 0, 'VTA2301001', 'GBN VTA2301001'),
('2023-02-16', @customer_id_vista, 'PAYMENT_RECEIVED', 0, 16593408, NULL, 'Vista thanh toán');

-- ------------- Giao dịch Khách hàng: Vietsun -------------
SET @customer_id_vs = (SELECT id FROM customers WHERE name = 'Vietsun');
INSERT INTO financial_ledgers (transaction_date, customer_id, transaction_type, debit, credit, reference_number, notes) VALUES
('2021-06-30', @customer_id_vs, 'INVOICE', 32018800, 0, NULL, 'Phat sinh cong no T6/2021'),
('2021-07-09', @customer_id_vs, 'PAYMENT_RECEIVED', 0, 32018800, NULL, 'Vietsun thanh toan T6/2021'),
('2022-06-30', @customer_id_vs, 'INVOICE', 92176800, 0, NULL, 'Phat sinh cong no T6/2022'),
('2022-07-08', @customer_id_vs, 'PAYMENT_RECEIVED', 0, 92176800, NULL, 'Vietsun thanh toan T6/2022'),
('2023-06-30', @customer_id_vs, 'INVOICE', 49915000, 0, NULL, 'Phat sinh cong no T6/2023'),
('2023-07-07', @customer_id_vs, 'PAYMENT_RECEIVED', 0, 49915000, NULL, 'Vietsun thanh toan T6/2023'),
('2024-06-30', @customer_id_vs, 'INVOICE', 61946160, 0, NULL, 'Phat sinh cong no T6/2024'),
('2024-07-05', @customer_id_vs, 'PAYMENT_RECEIVED', 0, 30984400, NULL, 'Vietsun thanh toan mot phan T6/2024');

