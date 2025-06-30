-- ================================================================
-- Migration: Update Expense Categories Schema and Data
-- Purpose: Add missing fields and update existing records
-- ================================================================

-- First, check if category_key column exists, if not add it
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS category_key VARCHAR(100) NULL COMMENT 'Khóa định danh duy nhất cho hệ thống (tiếng Anh, không dấu)';

-- Add description column if it doesn't exist
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT 'Mô tả chi tiết về hạng mục chi phí';

-- Update existing records with proper category_key and description based on their names
UPDATE expense_categories SET 
    category_key = 'FUEL',
    description = 'Chi phí dầu diesel tiêu thụ trong các chuyến đi.'
WHERE name = 'Nhiên liệu (Dầu lade)' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'ROAD_FEES',
    description = 'Bao gồm tất cả các khoản phí tại trạm thu phí BOT, vé cầu, vé phà.'
WHERE name = 'Phí Cầu đường' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'GENERAL_REPAIRS',
    description = 'Chi phí sửa chữa đột xuất hoặc theo kế hoạch (sửa điện, máy, gầm, điều hòa).'
WHERE name = 'Sửa chữa chung' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'PERIODIC_MAINTENANCE',
    description = 'Chi phí bảo dưỡng theo lịch trình (bơm mỡ, thay lọc, thay nước làm mát).'
WHERE name = 'Bảo dưỡng định kỳ' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'TIRES',
    description = 'Chi phí mua mới, thay thế, vá hoặc đảo lốp.'
WHERE name = 'Lốp xe' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'LUBRICANTS_SUPPLIES',
    description = 'Chi phí các loại dầu nhớt (dầu máy, dầu cầu), mỡ và các vật tư tiêu hao khác.'
WHERE name = 'Dầu mỡ & Vật tư' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'ROADSIDE_ASSISTANCE',
    description = 'Chi phí phát sinh khi xe gặp sự cố trên đường và cần xe cứu hộ.'
WHERE name = 'Cứu hộ' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'DRIVER_SALARY',
    description = 'Tiền lương hàng tháng, thưởng và các khoản phúc lợi khác cho tài xế.'
WHERE name = 'Lương Lái xe' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'DRIVER_BONUS',
    description = 'Các khoản thưởng cho lái xe vào các dịp đặc biệt như lễ, Tết.'
WHERE name = 'Thưởng Lễ/Tết' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'PARKING_FEES',
    description = 'Chi phí đỗ xe, gửi xe tại bãi hàng tháng hoặc theo lượt.'
WHERE name = 'Phí Gửi xe' AND (category_key IS NULL OR category_key = '');

-- Add other potential records that might exist
UPDATE expense_categories SET 
    category_key = 'INSURANCE',
    description = 'Phí mua bảo hiểm TNDS bắt buộc và bảo hiểm vật chất (thân vỏ) tự nguyện.'
WHERE name = 'Bảo hiểm' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'ROAD_MAINTENANCE_FEES',
    description = 'Phí bắt buộc nộp hàng năm cho quỹ bảo trì đường bộ.'
WHERE name = 'Phí Bảo trì Đường bộ' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'INSPECTION_FEES',
    description = 'Lệ phí kiểm định an toàn kỹ thuật và bảo vệ môi trường cho xe cơ giới.'
WHERE name = 'Phí Đăng kiểm' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'INSPECTION_SERVICE_FEES',
    description = 'Chi phí cho các dịch vụ hỗ trợ liên quan trong quá trình đăng kiểm.'
WHERE name = 'Phí Dịch vụ Đăng kiểm' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'PERMITS_LICENSES',
    description = 'Các chi phí làm phù hiệu xe tải, giấy phép và các thủ tục hành chính liên quan.'
WHERE name = 'Phí Phù hiệu & Giấy tờ' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'GPS_SERVICE',
    description = 'Chi phí dịch vụ giám sát hành trình GPS hàng năm.'
WHERE name = 'Phí Định vị GPS' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'FINES_PENALTIES',
    description = 'Các khoản tiền phạt do vi phạm luật giao thông đường bộ.'
WHERE name = 'Phạt vi phạm' AND (category_key IS NULL OR category_key = '');

UPDATE expense_categories SET 
    category_key = 'EQUIPMENT_UPGRADES',
    description = 'Chi phí lắp đặt thêm thiết bị như camera, âm thanh, hoặc nâng cấp các bộ phận xe.'
WHERE name = 'Trang bị & Nâng cấp' AND (category_key IS NULL OR category_key = '');

-- For any remaining records without category_key, generate one based on name
UPDATE expense_categories SET 
    category_key = UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 
        'ă', 'a'), 'â', 'a'), 'á', 'a'), 'à', 'a'), 'ã', 'a'), 
        'ê', 'e'), 'é', 'e'), 'è', 'e'), 'ẽ', 'e'), ' ', '_'))
WHERE category_key IS NULL OR category_key = '';

-- Now make category_key NOT NULL and add unique constraint
ALTER TABLE expense_categories 
MODIFY COLUMN category_key VARCHAR(100) NOT NULL;

-- Add unique constraint if it doesn't exist
ALTER TABLE expense_categories 
ADD CONSTRAINT uk_expense_categories_key UNIQUE (category_key);