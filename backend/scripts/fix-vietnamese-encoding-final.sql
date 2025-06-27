-- ================================================================
-- Fix Vietnamese Text Encoding Issues
-- Converts double-encoded UTF-8 text back to proper Vietnamese
-- CHARSET: UTF-8
-- ================================================================

-- Ensure proper UTF-8 encoding for the session
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Fix expense_categories table
UPDATE expense_categories 
SET name = CASE 
    WHEN name = 'Báº£o dÆ°á»¡ng' THEN 'Bảo dưỡng'
    WHEN name = 'Báº£o hiá»ƒm' THEN 'Bảo hiểm'
    WHEN name = 'LÆ°Æ¡ng' THEN 'Lương'
    WHEN name = 'NhiÃªn liá»‡u' THEN 'Nhiên liệu'
    WHEN name = 'Phá»¥ tÃ¹ng' THEN 'Phụ tùng'
    ELSE name
END
WHERE name IN ('Báº£o dÆ°á»¡ng', 'Báº£o hiá»ƒm', 'LÆ°Æ¡ng', 'NhiÃªn liá»‡u', 'Phá»¥ tÃ¹ng');

-- Fix users table (names with Vietnamese characters)
UPDATE users 
SET name = CASE 
    WHEN name LIKE '%Ä'%' OR name LIKE '%Ãª%' OR name LIKE '%á»%' OR name LIKE '%Ã%' OR name LIKE '%Æ°%' THEN 
        -- Convert common double-encoded patterns back to Vietnamese
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                name,
                'Ä'', 'Đ'),
                'Ä'', 'đ'),
                'Ã¡', 'á'),
                'Ã ', 'à'),
                'áº£', 'ả'),
                'Ã£', 'ã'),
                'áº¡', 'ạ'),
                'Ä‚', 'Â'),
                'Ä'', 'ă'),
                'áº¯', 'ắ'),
                'áº±', 'ằ'),
                'áº³', 'ẳ'),
                'áºµ', 'ẵ'),
                'áº·', 'ặ'),
                'Ã©', 'é'),
                'Ã¨', 'è'),
                'áº»', 'ẻ'),
                'áº½', 'ẽ')
    ELSE name
END
WHERE name LIKE '%Ä'%' OR name LIKE '%Ãª%' OR name LIKE '%á»%' OR name LIKE '%Ã%' OR name LIKE '%Æ°%';

-- Verify the changes
SELECT 'expense_categories' as table_name, id, name FROM expense_categories;
SELECT 'users' as table_name, id, name FROM users WHERE name LIKE '%ệ%' OR name LIKE '%ư%' OR name LIKE '%ợ%';