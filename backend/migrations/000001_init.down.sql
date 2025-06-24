-- Drop tables in reverse order of creation (due to foreign key constraints)
DROP TABLE IF EXISTS tractor_expense_items;
DROP TABLE IF EXISTS tractor_expenses;
DROP TABLE IF EXISTS trailers;
DROP TABLE IF EXISTS tractors;
DROP TABLE IF EXISTS containers;
DROP TABLE IF EXISTS expense_categories;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS users;