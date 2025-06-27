-- ================================================================
-- Insert Correct Vietnamese Data
-- Ensures proper UTF-8 encoding from the start
-- ================================================================

-- Set connection to UTF-8
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;

-- Insert expense categories with proper Vietnamese
INSERT INTO expense_categories (id, name, last_updated_by) VALUES
(1, 'Bảo dưỡng', 'Administrator (@admin)'),
(2, 'Bảo hiểm', 'Administrator (@admin)'),
(3, 'Lương', 'Administrator (@admin)'),
(4, 'Nhiên liệu', 'Administrator (@admin)'),
(5, 'Phụ tùng', 'Administrator (@admin)');

-- Insert tractors with proper Vietnamese descriptions
INSERT INTO tractors (id, license_plate, description, last_updated_by) VALUES
(1, '51A-12345', 'Xe đầu kéo Hyundai 2020', 'Administrator (@admin)'),
(2, '51B-67890', 'Xe đầu kéo Hino 2019', 'Administrator (@admin)'),
(3, '51C-11111', 'Xe đầu kéo Isuzu 2021', 'Administrator (@admin)'),
(4, '51D-22222', 'Xe đầu kéo Mitsubishi 2018', 'Administrator (@admin)'),
(5, '51E-33333', 'Xe đầu kéo Daewoo 2022', 'Administrator (@admin)');

-- Insert trailers with proper Vietnamese descriptions
INSERT INTO trailers (id, license_plate, description, last_updated_by) VALUES
(1, '51R-11111', 'Rơ moóc container 40ft', 'Administrator (@admin)'),
(2, '51R-22222', 'Rơ moóc container 20ft', 'Administrator (@admin)'),
(3, '51R-33333', 'Rơ moóc sàn 45ft', 'Administrator (@admin)'),
(4, '51R-44444', 'Rơ moóc tank chở xăng', 'Administrator (@admin)'),
(5, '51R-55555', 'Rơ moóc thùng kín', 'Administrator (@admin)');

-- Verify the data
SELECT 'VERIFICATION RESULTS' as section;
SELECT 'Tractors' as table_name, id, license_plate, description FROM tractors ORDER BY id;
SELECT 'Trailers' as table_name, id, license_plate, description FROM trailers ORDER BY id;
SELECT 'Categories' as table_name, id, name FROM expense_categories ORDER BY id;