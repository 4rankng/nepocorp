# Vehicle Expense Management Database Schema

## Overview

This document describes the database schema for the Vehicle Expense Management system. The system tracks maintenance expenses, vehicle information, and related data for tractors and trailers.

## Database Engine

- **Engine**: MySQL
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_unicode_ci


### 2. expense_categories
Defines categories for different types of expenses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Category name (e.g., "Bảo dưỡng", "Bảo hiểm") |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |

**Default Data:**
- ID: 1, Name: "Bảo dưỡng"
- ID: 2, Name: "Bảo hiểm"
- ID: 3, Name: "Lương"




Table `maintenance`
id auto increment
expense_id int (link to expenses.id)
license_plate varchar(255) not null
vendor_name varchar(255) not null
item_name varchar(255) not null
price int
quantity int
tax_rate float
total int
| install_date | DATETIME | NULL | Installation date (for parts/insurance) |
| expiry_date | DATETIME | NULL | Expiration date (for parts/insurance) |
created_at timestamp default current_timestamp
updated_at timestamp default current_timestamp on update current_timestamp


### 6. expenses
Main table for tracking all vehicle expenses (unified for both tractors and trailers).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| vendor_name | VARCHAR(255) | NOT NULL | Vendor/supplier name |
| expense_category_id | BIGINT UNSIGNED | NOT NULL, FK → expense_categories(id) | Expense category |
| total | BIGINT | NOT NULL | Total amount (in VND) |
| payment_status | VARCHAR(50) | NOT NULL, DEFAULT 'DRAFT' | Status: DRAFT, PENDING, PAID, CANCELLED |
| payment_proof | VARCHAR(500) | NULL | URL to payment proof document |
| currency | VARCHAR(50) | NOT NULL, DEFAULT 'VND' | Currency code |
| remark | TEXT | NULL | Additional notes |
| last_updated_by string which is name (username) of person who last created/updated the record
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |


### 7. expense_items
Stores individual line items for each expense.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
license_plate string
| expense_id | BIGINT UNSIGNED | NOT NULL, FK → expenses(id) | Parent expense |
| item_name | VARCHAR(255) | NOT NULL | Item description |
| price | BIGINT | NOT NULL | Unit price (in VND) |
| quantity | INT | NOT NULL, DEFAULT 1 | Quantity |
tax_rate float
| total | BIGINT | NOT NULL | Total amount (price × quantity) | // total = price * quantity * (1 + tax_rate / 100)
| install_date | DATETIME | NULL | Installation date (for parts/insurance) |
| expiry_date | DATETIME | NULL | Expiration date (for parts/insurance) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |
