-- ================================================================
-- Test Vietnamese Text Insertion Script
-- Tests that new Vietnamese text is properly stored and retrieved
-- ================================================================

-- Set connection charset to ensure proper encoding
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Test inserting new Vietnamese tractor
INSERT INTO tractors (license_plate, description, last_updated_by) VALUES 
('51F-99999', 'Xe đầu kéo Volvo mới 2024 - Thử nghiệm tiếng Việt', 'Administrator (@admin)');

-- Test inserting new Vietnamese trailer
INSERT INTO trailers (license_plate, description, last_updated_by) VALUES 
('51R-99999', 'Rơ moóc chở container đặc biệt 50ft', 'Administrator (@admin)');

-- Test inserting new Vietnamese expense category
INSERT INTO expense_categories (name, last_updated_by) VALUES 
('Bảo trì đặc biệt', 'Administrator (@admin)');

-- Test inserting new Vietnamese user
INSERT INTO users (username, email, password, name, role, is_active, last_updated_by) VALUES 
('test_user', 'test@example.com', 'password_hash', 'Võ Thị Hương', 'driver', TRUE, 'Administrator (@admin)');

-- Verify the insertions display correctly
SELECT '=== TEST RESULTS ===' as section;
SELECT 'New Tractor' as type, id, license_plate, description FROM tractors WHERE license_plate = '51F-99999';
SELECT 'New Trailer' as type, id, license_plate, description FROM trailers WHERE license_plate = '51R-99999';
SELECT 'New Category' as type, id, name FROM expense_categories WHERE name = 'Bảo trì đặc biệt';
SELECT 'New User' as type, id, username, name FROM users WHERE username = 'test_user';

-- Test complex Vietnamese characters
SELECT '=== CHARACTER TEST ===' as section;
SELECT 'Vietnamese Test' as test, 
       'àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ' as lower_case,
       'ÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ' as upper_case;

-- Cleanup test data
DELETE FROM tractors WHERE license_plate = '51F-99999';
DELETE FROM trailers WHERE license_plate = '51R-99999';
DELETE FROM expense_categories WHERE name = 'Bảo trì đặc biệt';
DELETE FROM users WHERE username = 'test_user';

SELECT 'Test completed - test data cleaned up' as result;