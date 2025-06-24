-- Drop foreign key constraint and column from tractor_expenses
ALTER TABLE tractor_expenses 
DROP FOREIGN KEY fk_tractor_expenses_last_updated_by,
DROP COLUMN last_updated_by;

-- Drop settings table
DROP TABLE IF EXISTS settings;