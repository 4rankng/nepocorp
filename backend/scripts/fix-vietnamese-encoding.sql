-- ================================================================
-- Vietnamese Text Encoding Fix Script
-- Fixes double-encoded UTF-8 Vietnamese characters in the database
-- ================================================================

-- Set connection charset to ensure proper encoding
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backup original data before fixing (optional - uncomment if you want backup)
/*
CREATE TABLE IF NOT EXISTS tractors_backup AS SELECT * FROM tractors;
CREATE TABLE IF NOT EXISTS trailers_backup AS SELECT * FROM trailers;
CREATE TABLE IF NOT EXISTS expense_categories_backup AS SELECT * FROM expense_categories;
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS expenses_backup AS SELECT * FROM expenses;
CREATE TABLE IF NOT EXISTS maintenance_backup AS SELECT * FROM maintenance;
CREATE TABLE IF NOT EXISTS expense_items_backup AS SELECT * FROM expense_items;
CREATE TABLE IF NOT EXISTS settings_backup AS SELECT * FROM settings;
*/

-- ================================================================
-- Fix Vietnamese characters in tractors table
-- ================================================================
UPDATE tractors SET 
    description = CASE 
        WHEN description LIKE '%Ä'áº§u kÃ©o%' THEN REPLACE(description, 'Ä'áº§u kÃ©o', 'đầu kéo')
        ELSE description
    END,
    description = CASE 
        WHEN description LIKE '%Xe %' AND description LIKE '%kÃ©o%' THEN 
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                description, 
                'Ä'', 'đ'), 
                'áº§', 'ầ'), 
                'kÃ©', 'ké'), 
                'Ã¡', 'á'), 
                'Ã ', 'à')
        ELSE description
    END
WHERE description REGEXP '(Ä'|áº|Ã©|Ã¡|Ã )';

-- More comprehensive Vietnamese character fixes for tractors
UPDATE tractors SET 
    description = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        description,
        'Ä'', 'đ'), 'Ä', 'Đ'),
        'áº§', 'ầ'), 'áº¥', 'ấ'), 'áº£', 'ả'), 'áº¡', 'ạ'), 'áº©', 'ẩ'), 'áº«', 'ẫ'),
        'Ã¡', 'á'), 'Ã ', 'à'), 'áº£', 'ả'), 'Ã£', 'ã'), 'áº¡', 'ạ'),
        'Ãª', 'ê'), 'Ã©', 'é'), 'Ã¨', 'è'), 'áº», 'ẻ'), 'áº½', 'ẽ'), 'áº¹', 'ẹ'),
        'Ã­', 'í'), 'Ã¬', 'ì')
WHERE description REGEXP '(Ä|áº|Ã)';

-- ================================================================
-- Fix Vietnamese characters in trailers table
-- ================================================================
UPDATE trailers SET 
    description = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        description,
        'Ä'', 'đ'), 'Ä', 'Đ'),
        'áº§', 'ầ'), 'áº¥', 'ấ'), 'áº£', 'ả'), 'áº¡', 'ạ'), 'áº©', 'ẩ'), 'áº«', 'ẫ'),
        'Ã¡', 'á'), 'Ã ', 'à'), 'áº£', 'ả'), 'Ã£', 'ã'), 'áº¡', 'ạ'),
        'Ãª', 'ê'), 'Ã©', 'é'), 'Ã¨', 'è'), 'áº», 'ẻ'), 'áº½', 'ẽ'), 'áº¹', 'ẹ'),
        'Ã­', 'í'), 'Ã¬', 'ì')
WHERE description REGEXP '(Ä|áº|Ã)';

-- Fix specific trailer terms
UPDATE trailers SET 
    description = CASE 
        WHEN description LIKE '%RÆ¡ moÃ³c%' THEN REPLACE(description, 'RÆ¡ moÃ³c', 'Rơ moóc')
        WHEN description LIKE '%rÆ¡ moÃ³c%' THEN REPLACE(description, 'rÆ¡ moÃ³c', 'rơ moóc')
        ELSE description
    END
WHERE description LIKE '%moÃ³c%';

-- ================================================================
-- Fix Vietnamese characters in expense_categories table
-- ================================================================
UPDATE expense_categories SET 
    name = CASE 
        WHEN name = 'Báº£o dÆ°á»ng' THEN 'Bảo dưỡng'
        WHEN name = 'Báº£o hiá»m' THEN 'Bảo hiểm'
        WHEN name = 'LÆ°Æ¡ng' THEN 'Lương'
        WHEN name = 'NhiÃªn liá»u' THEN 'Nhiên liệu'
        WHEN name = 'Phá»¥ tÃ¹ng' THEN 'Phụ tùng'
        ELSE name
    END
WHERE name REGEXP '(Ä|áº|Ã|Æ)';

-- More comprehensive fix for expense categories
UPDATE expense_categories SET 
    name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        name,
        'Ä'', 'đ'), 'Ä', 'Đ'),
        'áº§', 'ầ'), 'áº¥', 'ấ'), 'áº£', 'ả'), 'áº¡', 'ạ'), 'áº©', 'ẩ'), 'áº«', 'ẫ'),
        'Ã¡', 'á'), 'Ã ', 'à'), 'Ã£', 'ã'), 'áº¡', 'ạ'),
        'Ãª', 'ê'), 'Ã©', 'é'), 'Ã¨', 'è'), 'áº», 'ẻ'), 'áº½', 'ẽ'), 'áº¹', 'ẹ'),
        'Ã­', 'í'), 'Ã¬', 'ì'), 'Ã¬', 'ì'), 'á»', 'ị')
WHERE name REGEXP '(Ä|áº|Ã|Æ)';

-- Additional fixes for specific Vietnamese characters
UPDATE expense_categories SET 
    name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        name,
        'Æ°', 'ư'), 'Æ¡', 'ơ'), 'á»', 'ô'), 'á»', 'ơ'), 'á»', 'ư'), 'á»', 'ù')
WHERE name REGEXP 'Æ';

-- ================================================================
-- Fix Vietnamese characters in users table (names)
-- ================================================================
UPDATE users SET 
    name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        name,
        'Ä'', 'đ'), 'Ä', 'Đ'),
        'áº§', 'ầ'), 'áº¥', 'ấ'), 'áº£', 'ả'), 'áº¡', 'ạ'), 'áº©', 'ẩ'), 'áº«', 'ẫ'),
        'Ã¡', 'á'), 'Ã ', 'à'), 'Ã£', 'ã'), 'áº¡', 'ạ'),
        'Ãª', 'ê'), 'Ã©', 'é'), 'Ã¨', 'è'), 'áº», 'ẻ'), 'áº½', 'ẽ'), 'áº¹', 'ẹ'),
        'Ã­', 'í'), 'Ã¬', 'ì'), 'Ã¬', 'ì'), 'á»', 'ị')
WHERE name REGEXP '(Ä|áº|Ã|Æ)';

UPDATE users SET 
    name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        name,
        'Æ°', 'ư'), 'Æ¡', 'ơ'), 'á»', 'ô'), 'á»', 'ơ'), 'á»', 'ư'), 'á»', 'ù')
WHERE name REGEXP 'Æ';

-- ================================================================
-- Fix Vietnamese characters in expenses table
-- ================================================================
UPDATE expenses SET 
    vendor_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        vendor_name,
        'Ä'', 'đ'), 'Ä', 'Đ'),
        'áº§', 'ầ'), 'áº¥', 'ấ'), 'áº£', 'ả'), 'áº¡', 'ạ'), 'áº©', 'ẩ'), 'áº«', 'ẫ'),
        'Ã¡', 'á'), 'Ã ', 'à'), 'Ã£', 'ã'), 'áº¡', 'ạ'),
        'Ãª', 'ê'), 'Ã©', 'é'), 'Ã¨', 'è'), 'áº», 'ẻ'), 'áº½', 'ẽ'), 'áº¹', 'ẹ'),
        'Ã­', 'í'), 'Ã¬', 'ì'), 'Ã¬', 'ì'), 'á»', 'ị')
WHERE vendor_name REGEXP '(Ä|áº|Ã|Æ)';

UPDATE expenses SET 
    vendor_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        vendor_name,
        'Æ°', 'ư'), 'Æ¡', 'ơ'), 'á»', 'ô'), 'á»', 'ơ'), 'á»', 'ư'), 'á»', 'ù')
WHERE vendor_name REGEXP 'Æ';

-- Fix remark field
UPDATE expenses SET 
    remark = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        remark,
        'Ä'', 'đ'), 'Ä', 'Đ'),
        'áº§', 'ầ'), 'áº¥', 'ấ'), 'áº£', 'ả'), 'áº¡', 'ạ'), 'áº©', 'ẩ'), 'áº«', 'ẫ'),
        'Ã¡', 'á'), 'Ã ', 'à'), 'Ã£', 'ã'), 'áº¡', 'ạ'),
        'Ãª', 'ê'), 'Ã©', 'é'), 'Ã¨', 'è'), 'áº», 'ẻ'), 'áº½', 'ẽ'), 'áº¹', 'ẹ'),
        'Ã­', 'í'), 'Ã¬', 'ì'), 'Ã¬', 'ì'), 'á»', 'ị')
WHERE remark REGEXP '(Ä|áº|Ã|Æ)';

UPDATE expenses SET 
    remark = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        remark,
        'Æ°', 'ư'), 'Æ¡', 'ơ'), 'á»', 'ô'), 'á»', 'ơ'), 'á»', 'ư'), 'á»', 'ù')
WHERE remark REGEXP 'Æ';

-- ================================================================
-- Fix Vietnamese characters in maintenance table
-- ================================================================
UPDATE maintenance SET 
    vendor_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        vendor_name,
        'Ä'', 'đ'), 'Ä', 'Đ'),
        'áº§', 'ầ'), 'áº¥', 'ấ'), 'áº£', 'ả'), 'áº¡', 'ạ'), 'áº©', 'ẩ'), 'áº«', 'ẫ'),
        'Ã¡', 'á'), 'Ã ', 'à'), 'Ã£', 'ã'), 'áº¡', 'ạ'),
        'Ãª', 'ê'), 'Ã©', 'é'), 'Ã¨', 'è'), 'áº», 'ẻ'), 'áº½', 'ẽ'), 'áº¹', 'ẹ'),
        'Ã­', 'í'), 'Ã¬', 'ì'), 'Ã¬', 'ì'), 'á»', 'ị')
WHERE vendor_name REGEXP '(Ä|áº|Ã|Æ)';

UPDATE maintenance SET 
    vendor_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        vendor_name,
        'Æ°', 'ư'), 'Æ¡', 'ơ'), 'á»', 'ô'), 'á»', 'ơ'), 'á»', 'ư'), 'á»', 'ù')
WHERE vendor_name REGEXP 'Æ';

UPDATE maintenance SET 
    item_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        item_name,
        'Ä'', 'đ'), 'Ä', 'Đ'),
        'áº§', 'ầ'), 'áº¥', 'ấ'), 'áº£', 'ả'), 'áº¡', 'ạ'), 'áº©', 'ẩ'), 'áº«', 'ẫ'),
        'Ã¡', 'á'), 'Ã ', 'à'), 'Ã£', 'ã'), 'áº¡', 'ạ'),
        'Ãª', 'ê'), 'Ã©', 'é'), 'Ã¨', 'è'), 'áº», 'ẻ'), 'áº½', 'ẽ'), 'áº¹', 'ẹ'),
        'Ã­', 'í'), 'Ã¬', 'ì'), 'Ã¬', 'ì'), 'á»', 'ị')
WHERE item_name REGEXP '(Ä|áº|Ã|Æ)';

UPDATE maintenance SET 
    item_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        item_name,
        'Æ°', 'ư'), 'Æ¡', 'ơ'), 'á»', 'ô'), 'á»', 'ơ'), 'á»', 'ư'), 'á»', 'ù')
WHERE item_name REGEXP 'Æ';

-- ================================================================
-- Fix Vietnamese characters in expense_items table
-- ================================================================
UPDATE expense_items SET 
    item_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        item_name,
        'Ä'', 'đ'), 'Ä', 'Đ'),
        'áº§', 'ầ'), 'áº¥', 'ấ'), 'áº£', 'ả'), 'áº¡', 'ạ'), 'áº©', 'ẩ'), 'áº«', 'ẫ'),
        'Ã¡', 'á'), 'Ã ', 'à'), 'Ã£', 'ã'), 'áº¡', 'ạ'),
        'Ãª', 'ê'), 'Ã©', 'é'), 'Ã¨', 'è'), 'áº», 'ẻ'), 'áº½', 'ẽ'), 'áº¹', 'ẹ'),
        'Ã­', 'í'), 'Ã¬', 'ì'), 'Ã¬', 'ì'), 'á»', 'ị')
WHERE item_name REGEXP '(Ä|áº|Ã|Æ)';

UPDATE expense_items SET 
    item_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        item_name,
        'Æ°', 'ư'), 'Æ¡', 'ơ'), 'á»', 'ô'), 'á»', 'ơ'), 'á»', 'ư'), 'á»', 'ù')
WHERE item_name REGEXP 'Æ';

-- ================================================================
-- Fix Vietnamese characters in settings table
-- ================================================================
UPDATE settings SET 
    value = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        value,
        'Ä'', 'đ'), 'Ä', 'Đ'),
        'áº§', 'ầ'), 'áº¥', 'ấ'), 'áº£', 'ả'), 'áº¡', 'ạ'), 'áº©', 'ẩ'), 'áº«', 'ẫ'),
        'Ã¡', 'á'), 'Ã ', 'à'), 'Ã£', 'ã'), 'áº¡', 'ạ'),
        'Ãª', 'ê'), 'Ã©', 'é'), 'Ã¨', 'è'), 'áº», 'ẻ'), 'áº½', 'ẽ'), 'áº¹', 'ẹ'),
        'Ã­', 'í'), 'Ã¬', 'ì'), 'Ã¬', 'ì'), 'á»', 'ị')
WHERE value REGEXP '(Ä|áº|Ã|Æ)';

UPDATE settings SET 
    value = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        value,
        'Æ°', 'ư'), 'Æ¡', 'ơ'), 'á»', 'ô'), 'á»', 'ơ'), 'á»', 'ư'), 'á»', 'ù')
WHERE value REGEXP 'Æ';

-- ================================================================
-- Verification queries (uncomment to check results)
-- ================================================================
/*
SELECT 'Tractors' as table_name, id, license_plate, description FROM tractors WHERE id <= 5;
SELECT 'Trailers' as table_name, id, license_plate, description FROM trailers WHERE id <= 5;
SELECT 'Expense Categories' as table_name, id, name FROM expense_categories;
SELECT 'Users' as table_name, id, username, name FROM users WHERE name REGEXP '[à-ỹ]';
SELECT 'Expenses' as table_name, id, vendor_name, remark FROM expenses WHERE vendor_name REGEXP '[à-ỹ]' OR remark REGEXP '[à-ỹ]';
*/

-- ================================================================
-- Summary
-- ================================================================
-- This script fixes double-encoded UTF-8 Vietnamese characters by:
-- 1. Converting corrupted characters back to proper Vietnamese
-- 2. Updating all tables with Vietnamese text fields
-- 3. Ensuring consistent UTF-8 encoding across the database
-- 
-- Common fixes applied:
-- - Ä' → đ (lowercase d with stroke)
-- - áº§ → ầ (a with circumflex and grave)
-- - kÃ© → ké (e with acute accent)
-- - Ã¡ → á (a with acute accent)
-- - Ã  → à (a with grave accent)
-- - And many other Vietnamese diacritical marks
-- ================================================================