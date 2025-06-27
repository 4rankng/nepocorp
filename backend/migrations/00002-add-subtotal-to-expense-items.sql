-- ================================================================
-- Migration: Add subtotal field to expense_items table
-- Description: Adds subtotal column where subtotal = qty * price + tax amount
-- ================================================================

-- Ensure proper UTF-8 encoding for the session
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Add subtotal column to expense_items table
ALTER TABLE expense_items 
ADD COLUMN subtotal BIGINT NOT NULL DEFAULT 0 
AFTER tax_rate;

-- Update existing records to calculate subtotal
-- Formula: subtotal = (quantity * price) + (quantity * price * tax_rate)
UPDATE expense_items 
SET subtotal = ROUND(quantity * price + (quantity * price * tax_rate));

-- Verify the update
SELECT 'Updated expense_items with subtotal calculation' as info;
SELECT id, quantity, price, tax_rate, subtotal, total 
FROM expense_items 
LIMIT 5;