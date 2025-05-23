# Database Schema

This document outlines the database schema for the application, derived from the API specification.

## Table Definitions

### 1. `users`

Stores user accounts for system access.

| Column          | Type        | Constraints                                     | Description                                     |
|-----------------|-------------|-------------------------------------------------|-------------------------------------------------|
| `id`            | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()          | Unique identifier for the user                  |
| `username`      | VARCHAR(255)| NOT NULL, UNIQUE                                | Username for login                              |
| `password_hash` | VARCHAR(255)| NOT NULL                                        | Hashed password                                 |
| `employee_id`   | UUID        | NOT NULL, UNIQUE, FOREIGN KEY REFERENCES `employees(id)` | Link to the corresponding employee record       |
| `role`          | VARCHAR(50) | NOT NULL, CHECK (`role` IN ('admin', 'manager', 'accountant', 'dispatcher', 'driver')) | System access role |
| `created_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP             | Timestamp of creation                           |
| `updated_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP             | Timestamp of last update                        |

**Indexes:**
*   `idx_users_username` ON `users` (`username`)
*   `idx_users_employee_id` ON `users` (`employee_id`)
*   `idx_users_role` ON `users` (`role`)

---

### 2. `employees`

Stores information about company employees.

| Column          | Type        | Constraints                                     | Description                                     |
|-----------------|-------------|-------------------------------------------------|-------------------------------------------------|
| `id`            | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()          | Unique identifier for the employee              |
| `name`          | VARCHAR(255)| NOT NULL                                        | Full name of the employee                       |
| `email`         | VARCHAR(255)| NOT NULL, UNIQUE                                | Email address of the employee                   |
| `employee_role` | VARCHAR(50) | NOT NULL, CHECK (`employee_role` IN ('Quản lý', 'Kế toán', 'Giao nhận', 'Lái xe')) | Domain-specific role (job title)             |
| `created_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP             | Timestamp of creation                           |
| `updated_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP             | Timestamp of last update                        |

**Indexes:**
*   `idx_employees_email` ON `employees` (`email`)
*   `idx_employees_employee_role` ON `employees` (`employee_role`)

---

### 3. `customers`

Stores information about customers.

| Column       | Type        | Constraints                               | Description                           |
|--------------|-------------|-------------------------------------------|---------------------------------------|
| `id`         | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the customer    |
| `name`       | VARCHAR(255)| NOT NULL                                  | Customer's name                       |
| `address`    | TEXT        | NULLABLE                                  | Customer's address                    |
| `phone`      | VARCHAR(20) | NULLABLE                                  | Customer's phone number               |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update              |

**Indexes:**
*   `idx_customers_name` ON `customers` (`name`)

---

### 4. `partners`

Stores information about business partners (e.g., subcontractors).

| Column       | Type        | Constraints                               | Description                          |
|--------------|-------------|-------------------------------------------|--------------------------------------|
| `id`         | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the partner    |
| `name`       | VARCHAR(255)| NOT NULL                                  | Partner's name                       |
| `address`    | TEXT        | NULLABLE                                  | Partner's address                    |
| `phone`      | VARCHAR(20) | NULLABLE                                  | Partner's phone number               |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update             |

**Indexes:**
*   `idx_partners_name` ON `partners` (`name`)

---

### 5. `vehicles`

Stores information about transport vehicles.

| Column          | Type        | Constraints                               | Description                             |
|-----------------|-------------|-------------------------------------------|-----------------------------------------|
| `id`            | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the vehicle       |
| `license_plate` | VARCHAR(20) | NOT NULL, UNIQUE                          | Vehicle license plate number            |
| `created_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                   |
| `updated_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update                |

**Indexes:**
*   `idx_vehicles_license_plate` ON `vehicles` (`license_plate`)

---

### 6. `container_types`

Stores different types of containers.

| Column       | Type        | Constraints                               | Description                               |
|--------------|-------------|-------------------------------------------|-------------------------------------------|
| `id`         | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the container type  |
| `name`       | VARCHAR(50) | NOT NULL, UNIQUE                          | Name of the container type (e.g., "20'DC") |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                     |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update                  |

**Indexes:**
*   `idx_container_types_name` ON `container_types` (`name`)

---

### 7. `routes`

Stores predefined transport routes.

| Column                | Type        | Constraints                               | Description                                  |
|-----------------------|-------------|-------------------------------------------|----------------------------------------------|
| `id`                  | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the route              |
| `name`                | VARCHAR(255)| NOT NULL, UNIQUE                          | Descriptive name for the route (e.g., "HCM - Da Nang") |
| `origin`              | VARCHAR(255)| NOT NULL                                  | Starting point of the route                  |
| `destination_points`  | JSONB       | NOT NULL                                  | Array of destination points (strings)        |
| `created_at`          | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                        |
| `updated_at`          | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update                     |

**Indexes:**
*   `idx_routes_name` ON `routes` (`name`)

---

### 8. `transport_schedules`

Stores information about transport schedules (shipments).

| Column                        | Type        | Constraints                               | Description                                     |
|-------------------------------|-------------|-------------------------------------------|-------------------------------------------------|
| `id`                          | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the schedule              |
| `schedule_date`               | DATE        | NOT NULL                                  | Date of the scheduled transport                 |
| `vehicle_id`                  | UUID        | NOT NULL, FOREIGN KEY REFERENCES `vehicles(id)` | Assigned vehicle |
| `partner_id`                  | UUID        | NULLABLE, FOREIGN KEY REFERENCES `partners(id)` | Assigned partner (if subcontracted)           |
| `description`                 | TEXT        | NULLABLE                                  | Description of the shipment                     |
| `route_id`                    | UUID        | NOT NULL, FOREIGN KEY REFERENCES `routes(id)`   | Assigned route                                  |
| `status`                      | VARCHAR(50) | NOT NULL, CHECK (`status` IN ('planned', 'in_progress', 'completed', 'cancelled')) | Current status of the schedule |
| `cargo_km`                    | DECIMAL(10,2)| NOT NULL, DEFAULT 0.00                    | Kilometers driven with cargo                    |
| `empty_km`                    | DECIMAL(10,2)| NOT NULL, DEFAULT 0.00                    | Kilometers driven empty                         |
| `fuel_liters`                 | DECIMAL(10,2)| NULLABLE                                  | Amount of fuel consumed in liters               |
| `fuel_unit_price`             | DECIMAL(10,2)| NULLABLE                                  | Price per liter of fuel at time of schedule   |
| `calculated_fuel_cost`        | DECIMAL(12,2)| NULLABLE                                  | Calculated total fuel cost (liters * unit_price)|
| `road_cost_preset_amount`     | DECIMAL(12,2)| NULLABLE                                  | Preset amount for road costs                    |
| `container_number`            | VARCHAR(100)| NULLABLE                                  | Container number                                |
| `seal_number`                 | VARCHAR(100)| NULLABLE                                  | Seal number for the container                   |
| `delivery_date`               | TIMESTAMPTZ | NULLABLE                                  | Actual date and time of delivery                |
| `customer_id`                 | UUID        | NOT NULL, FOREIGN KEY REFERENCES `customers(id)`| Associated customer                           |
| `container_type_id`           | UUID        | NOT NULL, FOREIGN KEY REFERENCES `container_types(id)` | Type of container |
| `freight_charge`              | DECIMAL(12,2)| NOT NULL                                  | Amount charged to the customer                  |
| `subcontracted_freight_charge`| DECIMAL(12,2)| NULLABLE                                  | Amount paid to partner (if subcontracted)       |
| `created_at`                  | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                           |
| `updated_at`                  | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update                        |

**Indexes:**
*   `idx_transport_schedules_vehicle_id` ON `transport_schedules` (`vehicle_id`)
*   `idx_transport_schedules_partner_id` ON `transport_schedules` (`partner_id`)
*   `idx_transport_schedules_route_id` ON `transport_schedules` (`route_id`)
*   `idx_transport_schedules_customer_id` ON `transport_schedules` (`customer_id`)
*   `idx_transport_schedules_container_type_id` ON `transport_schedules` (`container_type_id`)
*   `idx_transport_schedules_schedule_date` ON `transport_schedules` (`schedule_date`)
*   `idx_transport_schedules_status` ON `transport_schedules` (`status`)

---

### 9. `transport_schedule_costs`

Stores additional, specific costs associated with a transport schedule.

| Column                  | Type        | Constraints                               | Description                               |
|-------------------------|-------------|-------------------------------------------|-------------------------------------------|
| `id`                    | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the cost item       |
| `transport_schedule_id` | UUID        | NOT NULL, FOREIGN KEY REFERENCES `transport_schedules(id)` ON DELETE CASCADE | Link to the transport schedule |
| `description`           | VARCHAR(255)| NOT NULL                                  | Description of the cost                   |
| `amount`                | DECIMAL(12,2)| NOT NULL                                  | Amount of the cost                        |
| `created_at`            | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                     |
| `updated_at`            | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update                  |

**Indexes:**
*   `idx_transport_schedule_costs_schedule_id` ON `transport_schedule_costs` (`transport_schedule_id`)

---

### 10. `general_costs`

Stores general operational costs not directly tied to a single transport schedule's revenue calculation (e.g., repairs, salaries).

| Column       | Type        | Constraints                               | Description                                     |
|--------------|-------------|-------------------------------------------|-------------------------------------------------|
| `id`         | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the general cost          |
| `cost_date`  | DATE        | NOT NULL                                  | Date the cost was incurred                      |
| `vehicle_id` | UUID        | NULLABLE, FOREIGN KEY REFERENCES `vehicles(id)` | Associated vehicle (if applicable)             |
| `category`   | VARCHAR(100)| NOT NULL, CHECK (`category` IN ('Phí gửi xe', 'Chi phí sửa chữa / bảo dưỡng xe', 'Lương lái xe', 'Tiền bảo hiểm TNDS', 'Tiền bảo hiểm vật chất', 'Phí đường bộ', 'Thay thế lốp xe', 'Other')) | Category of the cost |
| `description`| TEXT        | NOT NULL                                  | Detailed description of the cost                |
| `amount`     | DECIMAL(12,2)| NOT NULL                                  | Amount of the cost                              |
| `details`    | JSONB       | NULLABLE                                  | JSON object for specific details (e.g., tire info) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                           |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update                        |

**Indexes:**
*   `idx_general_costs_vehicle_id` ON `general_costs` (`vehicle_id`)
*   `idx_general_costs_cost_date` ON `general_costs` (`cost_date`)
*   `idx_general_costs_category` ON `general_costs` (`category`)

---

### 11. `debts`

Stores debt records (receivables and payables).

| Column              | Type        | Constraints                               | Description                                     |
|---------------------|-------------|-------------------------------------------|-------------------------------------------------|
| `id`                | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the debt record           |
| `entity_name`       | VARCHAR(255)| NOT NULL                                  | Name of the entity (customer, partner, etc.)    |
| `receivable_amount` | DECIMAL(12,2)| NOT NULL, DEFAULT 0.00                    | Amount to be received (phải thu)                |
| `payable_amount`    | DECIMAL(12,2)| NOT NULL, DEFAULT 0.00                    | Amount to be paid (phải trả)                    |
| `notes`             | TEXT        | NULLABLE                                  | Additional notes about the debt                 |
| `month`             | INTEGER     | NOT NULL, CHECK (`month` >= 1 AND `month` <= 12) | Month of the debt record (1-12)             |
| `year`              | INTEGER     | NOT NULL                                  | Year of the debt record (e.g., 2024)            |
| `created_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                           |
| `updated_at`        | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update                        |
|                     |             | UNIQUE (`entity_name`, `month`, `year`)   | Ensure one record per entity per month/year   |

**Indexes:**
*   `idx_debts_entity_name` ON `debts` (`entity_name`)
*   `idx_debts_month_year` ON `debts` (`month`, `year`)

---

### 12. `fuel_prices`

Stores historical fuel prices.

| Column          | Type        | Constraints                               | Description                               |
|-----------------|-------------|-------------------------------------------|-------------------------------------------|
| `id`            | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the fuel price entry|
| `price_date`    | DATE        | NOT NULL, UNIQUE                          | Date for which the price is valid         |
| `price_per_liter`| DECIMAL(10,2)| NOT NULL                                 | Price of fuel per liter on that date      |
| `created_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                     |
| `updated_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update                  |

**Indexes:**
*   `idx_fuel_prices_price_date` ON `fuel_prices` (`price_date`)

---

### 13. `mileage_rates`

Stores mileage rates for calculating fuel consumption or other distance-based metrics.

| Column        | Type        | Constraints                               | Description                               |
|---------------|-------------|-------------------------------------------|-------------------------------------------|
| `id`          | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()    | Unique identifier for the mileage rate    |
| `description` | VARCHAR(255)| NULLABLE                                  | Description of the rate (e.g., "Xe tải nặng") |
| `min_km`      | DECIMAL(10,2)| NOT NULL, DEFAULT 0.00                    | Minimum kilometers for this rate to apply |
| `max_km`      | DECIMAL(10,2)| NULLABLE                                  | Maximum kilometers for this rate to apply |
| `rate_per_km` | DECIMAL(10,4)| NOT NULL                                  | Rate per kilometer (e.g., fuel liters/km) |
| `created_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of creation                     |
| `updated_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT CURRENT_TIMESTAMP       | Timestamp of last update                  |

**Indexes:**
*   `idx_mileage_rates_min_km_max_km` ON `mileage_rates` (`min_km`, `max_km`)

---

## General Notes
*   **UUIDs as Primary Keys:** Using UUIDs (`gen_random_uuid()` or similar function depending on DB) for primary keys is generally good for distributed systems and preventing ID guessing, but can have a slight performance overhead compared to SERIAL/BIGSERIAL if not indexed properly or if page splits become an issue on highly ordered inserts. For this scale, it's a reasonable choice.
*   **TIMESTAMPTZ:** Using `TIMESTAMPTZ` (timestamp with time zone) is recommended for all timestamp fields to avoid ambiguity. Store in UTC and let the application layer handle time zone conversions if necessary.
*   **JSONB:** For flexible fields like `routes.destination_points` or `general_costs.details`, JSONB is a good choice in PostgreSQL for its querying capabilities.
*   **CHECK Constraints:** Used for roles and status fields to enforce data integrity at the database level.
*   **Indexes:** Basic indexes are suggested. More specific indexes might be needed based on query patterns.
*   **ON DELETE CASCADE:** Applied to `transport_schedule_costs` so that if a transport schedule is deleted, its associated costs are also automatically deleted. Consider this for other FK relationships where appropriate (e.g., should a user's deletion cascade to their schedules? Probably not directly, might require soft delete or re-assignment). For now, only applied where the child entity cannot exist without the parent.
*   **Decimal Precision:** `DECIMAL(precision, scale)` types are used for monetary values and measurements to maintain accuracy. Adjust precision and scale as per specific requirements.
*   **Roles:**
    *   `users.role`: System access role (e.g., 'admin', 'accountant').
    *   `employees.employee_role`: Business/job title (e.g., 'Quản lý', 'Lái xe'). This distinction is important.
*   **`calculated_fuel_cost` in `transport_schedules`**: This can be calculated by the application or a database trigger/generated column. Storing it can simplify queries but requires ensuring it's updated if `fuel_liters` or `fuel_unit_price` change.
*   **`routes.name`**: Added a `name` field to the `routes` table for easier identification and selection in UIs, as requested in the prompt's guidance for this table.
*   **`transport_schedules.status`**: Added 'planned' as a more appropriate initial status than 'draft'.
*   **`general_costs.category`**: The enum values are based on the API spec.
*   **`debts` unique constraint**: Added a unique constraint on (`entity_name`, `month`, `year`) to prevent duplicate debt entries for the same entity in the same period.
