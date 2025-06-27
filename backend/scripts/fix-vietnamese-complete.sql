-- ================================================================
-- Complete Vietnamese Text Encoding Fix
-- Fixes all double-encoded UTF-8 Vietnamese text
-- ================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Completely replace the corrupted Vietnamese text with correct values
UPDATE expense_categories SET name = 'Bảo dưỡng' WHERE id = 1;
UPDATE expense_categories SET name = 'Bảo hiểm' WHERE id = 2;
UPDATE expense_categories SET name = 'Lương' WHERE id = 3;
UPDATE expense_categories SET name = 'Nhiên liệu' WHERE id = 4;
UPDATE expense_categories SET name = 'Phụ tùng' WHERE id = 5;

-- Fix any Vietnamese names in users table
UPDATE users SET name = 'Nguyễn Văn A' WHERE id = 2;
UPDATE users SET name = 'Trần Văn B' WHERE id = 3;
UPDATE users SET name = 'Lê Thị C' WHERE id = 4;
UPDATE users SET name = 'Phạm Văn D' WHERE id = 5;

-- Verify the results
SELECT 'expense_categories results:' as info;
SELECT id, name FROM expense_categories;

SELECT 'users with Vietnamese names:' as info;
SELECT id, username, name FROM users WHERE id IN (2,3,4,5);