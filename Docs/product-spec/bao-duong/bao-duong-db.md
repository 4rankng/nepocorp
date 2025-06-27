# Vehicle Expense Management Database Schema

## Overview

This document describes the database schema for the Vehicle Expense Management system. The system tracks maintenance expenses, vehicle information, and related data for tractors and trailers.

## Database Engine

- **Engine**: InnoDB
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


**Indexes:**
- `uk_trailers_license_plate` UNIQUE on (license_plate)
- `idx_trailers_license_plate` on (license_plate)


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
| subtotal | BIGINT | NOT NULL | Amount before tax (in VND) |
| tax_rate | INT | NOT NULL, DEFAULT 0 | Tax percentage |
| total | BIGINT | NOT NULL | Total amount (in VND) |
| payment_status | VARCHAR(50) | NOT NULL, DEFAULT 'DRAFT' | Status: DRAFT, PENDING, PAID, CANCELLED |
| payment_proof | VARCHAR(500) | NULL | URL to payment proof document |
| currency | VARCHAR(50) | NOT NULL, DEFAULT 'VND' | Currency code |
| remark | TEXT | NULL | Additional notes |
| created_by | BIGINT UNSIGNED | NOT NULL, FK → users(id) | User who created the record |
| last_updated_by | BIGINT UNSIGNED | NULL, FK → users(id) | User who last updated |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |

**Foreign Keys:**
- `tractor_id` → tractors(id) ON DELETE CASCADE
- `trailer_id` → trailers(id) ON DELETE CASCADE
- `expense_category_id` → expense_categories(id) ON DELETE RESTRICT
- `created_by` → users(id) ON DELETE RESTRICT
- `last_updated_by` → users(id) ON DELETE RESTRICT

**Indexes:**
- `idx_tractor_id` on (tractor_id)
- `idx_trailer_id` on (trailer_id)
- `idx_expense_category_id` on (expense_category_id)
- `idx_payment_status` on (payment_status)

**Constraints:**
- CHECK constraint `chk_expense_vehicle`: Ensures expense belongs to either tractor OR trailer, but not both
  ```sql
  (tractor_id IS NOT NULL AND trailer_id IS NULL) OR
  (tractor_id IS NULL AND trailer_id IS NOT NULL)
  ```

### 7. expense_items
Stores individual line items for each expense.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| expense_id | BIGINT UNSIGNED | NOT NULL, FK → expenses(id) | Parent expense |
| item_name | VARCHAR(255) | NOT NULL | Item description |
| price | BIGINT | NOT NULL | Unit price (in VND) |
| quantity | INT | NOT NULL, DEFAULT 1 | Quantity |
| total | BIGINT | NOT NULL | Total amount (price × quantity) |
| install_date | DATETIME | NULL | Installation date (for parts/insurance) |
| expiry_date | DATETIME | NULL | Expiration date (for parts/insurance) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |

**Foreign Keys:**
- `expense_id` → expenses(id) ON DELETE CASCADE

**Indexes:**
- `idx_expense_id` on (expense_id)

