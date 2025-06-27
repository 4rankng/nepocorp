-- ================================================================
-- Vietnamese Text Encoding Fix Script (Simplified)
-- Fixes double-encoded UTF-8 Vietnamese characters in the database
-- ================================================================

-- Set connection charset to ensure proper encoding
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix Vietnamese characters in tractors table
UPDATE tractors SET description = 'Xe đầu kéo Hyundai 2020' WHERE id = 1;
UPDATE tractors SET description = 'Xe đầu kéo Hino 2019' WHERE id = 2;
UPDATE tractors SET description = 'Xe đầu kéo Isuzu 2021' WHERE id = 3;
UPDATE tractors SET description = 'Xe đầu kéo Mitsubishi 2018' WHERE id = 4;
UPDATE tractors SET description = 'Xe đầu kéo Daewoo 2022' WHERE id = 5;

-- Fix Vietnamese characters in trailers table
UPDATE trailers SET description = 'Rơ moóc container 40ft' WHERE id = 1;
UPDATE trailers SET description = 'Rơ moóc container 20ft' WHERE id = 2;
UPDATE trailers SET description = 'Rơ moóc sàn 45ft' WHERE id = 3;
UPDATE trailers SET description = 'Rơ moóc tank chở xăng' WHERE id = 4;
UPDATE trailers SET description = 'Rơ moóc thùng kín' WHERE id = 5;

-- Fix Vietnamese characters in expense_categories table
UPDATE expense_categories SET name = 'Bảo dưỡng' WHERE id = 1;
UPDATE expense_categories SET name = 'Bảo hiểm' WHERE id = 2;
UPDATE expense_categories SET name = 'Lương' WHERE id = 3;
UPDATE expense_categories SET name = 'Nhiên liệu' WHERE id = 4;
UPDATE expense_categories SET name = 'Phụ tùng' WHERE id = 5;

-- Fix Vietnamese characters in users table (names)
UPDATE users SET name = 'Nguyễn Văn A' WHERE id = 2;
UPDATE users SET name = 'Trần Văn B' WHERE id = 3;
UPDATE users SET name = 'Lê Thị C' WHERE id = 4;
UPDATE users SET name = 'Phạm Văn D' WHERE id = 5;

-- Fix Vietnamese characters in expenses table
UPDATE expenses SET vendor_name = 'Garage Minh Tuấn' WHERE id = 1;
UPDATE expenses SET vendor_name = 'Xưởng Hùng Vương' WHERE id = 2;
UPDATE expenses SET vendor_name = 'Bảo hiểm PTI' WHERE id = 3;
UPDATE expenses SET vendor_name = 'Cửa hàng phụ tùng ABC' WHERE id = 4;
UPDATE expenses SET vendor_name = 'Garage Thành Đạt' WHERE id = 5;
UPDATE expenses SET vendor_name = 'Xưởng Hoàng Gia' WHERE id = 6;
UPDATE expenses SET vendor_name = 'Garage Việt Nam' WHERE id = 7;
UPDATE expenses SET vendor_name = 'Bảo hiểm Bảo Việt' WHERE id = 8;
UPDATE expenses SET vendor_name = 'Cửa hàng Minh Châu' WHERE id = 9;
UPDATE expenses SET vendor_name = 'Xưởng sơn Tấn Phát' WHERE id = 10;

-- Fix remarks in expenses table
UPDATE expenses SET remark = 'Bảo dưỡng định kỳ 10,000km' WHERE id = 1;
UPDATE expenses SET remark = 'Thay dầu và lọc' WHERE id = 2;
UPDATE expenses SET remark = 'Bảo hiểm xe 1 năm' WHERE id = 3;
UPDATE expenses SET remark = 'Thay phanh trước' WHERE id = 4;
UPDATE expenses SET remark = 'Sửa chữa động cơ' WHERE id = 5;
UPDATE expenses SET remark = 'Bảo dưỡng hệ thống phanh' WHERE id = 6;
UPDATE expenses SET remark = 'Thay lốp xe' WHERE id = 7;
UPDATE expenses SET remark = 'Bảo hiểm rơ moóc' WHERE id = 8;
UPDATE expenses SET remark = 'Thay van an toàn' WHERE id = 9;
UPDATE expenses SET remark = 'Sơn lại thùng xe' WHERE id = 10;

-- Fix Vietnamese characters in maintenance table
UPDATE maintenance SET vendor_name = 'Garage Minh Tuấn' WHERE id = 1;
UPDATE maintenance SET vendor_name = 'Xưởng Hùng Vương' WHERE id = 2;
UPDATE maintenance SET vendor_name = 'Cửa hàng phụ tùng ABC' WHERE id = 3;
UPDATE maintenance SET vendor_name = 'Garage Thành Đạt' WHERE id = 4;
UPDATE maintenance SET vendor_name = 'Xưởng Hoàng Gia' WHERE id = 5;
UPDATE maintenance SET vendor_name = 'Garage Việt Nam' WHERE id = 6;
UPDATE maintenance SET vendor_name = 'Cửa hàng Minh Châu' WHERE id = 7;
UPDATE maintenance SET vendor_name = 'Xưởng sơn Tấn Phát' WHERE id = 8;

UPDATE maintenance SET item_name = 'Bảo dưỡng định kỳ 10,000km' WHERE id = 1;
UPDATE maintenance SET item_name = 'Thay dầu và lọc động cơ' WHERE id = 2;
UPDATE maintenance SET item_name = 'Thay má phanh trước' WHERE id = 3;
UPDATE maintenance SET item_name = 'Sửa chữa động cơ' WHERE id = 4;
UPDATE maintenance SET item_name = 'Bảo dưỡng hệ thống phanh' WHERE id = 5;
UPDATE maintenance SET item_name = 'Thay lốp xe rơ moóc' WHERE id = 6;
UPDATE maintenance SET item_name = 'Thay van an toàn khí nén' WHERE id = 7;
UPDATE maintenance SET item_name = 'Sơn lại thùng xe' WHERE id = 8;

-- Fix Vietnamese characters in expense_items table
UPDATE expense_items SET item_name = 'Dầu động cơ Shell 15W40' WHERE id = 1;
UPDATE expense_items SET item_name = 'Lọc dầu Toyota' WHERE id = 2;
UPDATE expense_items SET item_name = 'Lọc gió' WHERE id = 3;
UPDATE expense_items SET item_name = 'Chi phí công' WHERE id = 4;
UPDATE expense_items SET item_name = 'Dầu động cơ Castrol' WHERE id = 5;
UPDATE expense_items SET item_name = 'Lọc dầu Hino' WHERE id = 6;
UPDATE expense_items SET item_name = 'Chi phí công' WHERE id = 7;
UPDATE expense_items SET item_name = 'Bảo hiểm vật chất' WHERE id = 8;
UPDATE expense_items SET item_name = 'Má phanh trước' WHERE id = 9;
UPDATE expense_items SET item_name = 'Bộ piston' WHERE id = 10;
UPDATE expense_items SET item_name = 'Găng tay bảo hộ' WHERE id = 11;
UPDATE expense_items SET item_name = 'Chi phí sửa chữa' WHERE id = 12;
UPDATE expense_items SET item_name = 'Dầu phanh DOT4' WHERE id = 13;
UPDATE expense_items SET item_name = 'Má phanh rơ moóc' WHERE id = 14;
UPDATE expense_items SET item_name = 'Lốp xe Bridgestone 11.00R20' WHERE id = 15;
UPDATE expense_items SET item_name = 'Bảo hiểm rơ moóc' WHERE id = 16;
UPDATE expense_items SET item_name = 'Van an toàn khí nén' WHERE id = 17;
UPDATE expense_items SET item_name = 'Sơn Nippon Paint' WHERE id = 18;
UPDATE expense_items SET item_name = 'Chi phí thi công' WHERE id = 19;

-- Fix Vietnamese characters in settings table
UPDATE settings SET value = 'Nepo Corporation' WHERE `key` = 'company_name';
UPDATE settings SET value = '123 Đường ABC, Quận 1, TP.HCM' WHERE `key` = 'company_address';

-- Verification queries
SELECT 'Tractors Fixed' as status, id, license_plate, description FROM tractors WHERE id <= 5;
SELECT 'Trailers Fixed' as status, id, license_plate, description FROM trailers WHERE id <= 5;
SELECT 'Categories Fixed' as status, id, name FROM expense_categories WHERE id <= 5;
SELECT 'Users Fixed' as status, id, username, name FROM users WHERE id BETWEEN 2 AND 5;

-- Success message
SELECT 'Vietnamese encoding fix completed successfully!' as result;