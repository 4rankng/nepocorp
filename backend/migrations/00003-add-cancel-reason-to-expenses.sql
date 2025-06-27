-- ================================================================
-- Migration: Add cancel_reason field to expenses table
-- Description: Adds cancel_reason column to store cancellation details
-- ================================================================

-- Ensure proper UTF-8 encoding for the session
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Add cancel_reason column to expenses table
ALTER TABLE expenses 
ADD COLUMN cancel_reason TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL 
AFTER remark;

-- Verify the addition
SELECT 'Added cancel_reason column to expenses table' as info;

-- Show table structure to verify
DESCRIBE expenses;