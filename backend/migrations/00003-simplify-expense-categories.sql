-- ================================================================
-- Migration: Simplify Expense Categories Schema  
-- Purpose: Remove category_key field and use name as unique identifier
-- ================================================================

-- Remove the unique constraint on category_key
ALTER TABLE expense_categories DROP INDEX uk_expense_categories_key;

-- Remove the category_key column entirely
ALTER TABLE expense_categories DROP COLUMN category_key;

-- Add unique constraint on name field to ensure uniqueness
ALTER TABLE expense_categories ADD CONSTRAINT uk_expense_categories_name UNIQUE (name);

-- Update the table comment to reflect the simplified structure
ALTER TABLE expense_categories COMMENT='Lưu trữ các hạng mục chi phí vận tải (đã đơn giản hóa)';