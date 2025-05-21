# Tech Spec: Nepocorp Backend Service

## 1. Overview

This document outlines the technical specification for the backend service of the Nepocorp Fleet Management System. The backend will provide APIs to support the functionalities of the frontend application, manage data persistence, and handle business logic.

## 2. Technology Stack

- **Language/Framework:** Go (Golang) with the Gin web framework.
- **Database:** MySQL.
- **Containerization:** Docker & Docker Compose.

## 3. Project Structure (Proposed)

A typical Go project structure will be adopted:

```
/backend
  ├─ cmd/api/          # Main application entry point (main.go)
  ├─ internal/
  │  ├─ api/           # HTTP handlers, routing, middleware
  │  ├─ config/        # Configuration management
  │  ├─ data/          # Database models, repository interfaces, and implementations (MySQL)
  │  ├─ domain/        # Core business logic and entities
  │  ├─ service/       # Service layer coordinating domain and data
  │  └─ utils/         # Utility functions
  ├─ migrations/       # Database migration files
  ├─ Dockerfile        # Dockerfile for the Go application
  ├─ docker-compose.yml # Docker Compose for services (Go app, MySQL)
  └─ README.md         # This file
```

## 4. API Endpoints

All endpoints will be prefixed with `/api/v1`.

### 4.1. Authentication

- **`POST /auth/login`**
  - **Description:** Authenticates a user.
  - **Request Body:** `{"username": "string", "password": "string"}`
  - **Response Body:** `{"token": "jwt_token_string", "user": {"id": "uuid", "username": "string", "role": "string"}}`
- **`POST /auth/register`** (If applicable)
  - **Description:** Registers a new user. This endpoint is only available for the 'root' account.
  - **Request Body:** `{"username": "string", "password": "string", "role": "string", ...}`
  - **Response Body:** `{"id": "uuid", "username": "string", "message": "User registered successfully"}`
- **`POST /auth/logout`**
  - **Description:** Invalidates the user's session/token (server-side if maintaining a blacklist).
  - **Request Body:** None
  - **Response Body:** `{"message": "Logged out successfully"}`

### 4.2. Users & Roles

- **`GET /users`**
  - **Description:** (Admin) Lists all users.
  - **Response Body:** `[{"id": "uuid", "username": "string", "role": "string", ...}]`
- **`GET /users/{userId}`**
  - **Description:** (Admin) Gets details of a specific user.
  - **Response Body:** `{"id": "uuid", "username": "string", "role": "string", ...}`
- **`GET /roles`**
  - **Description:** Lists available user roles.
  - **Response Body:** `[{"id": "uuid", "name": "Quản lý"}, ...]`

### 4.3. Quản Lý (Management)

#### 4.3.1. Transportation Plans (Kế hoạch vận chuyển)
- **`POST /plans`**
  - **Description:** Creates a new transportation plan.
  - **Request Body:** `{"plan_date": "YYYY-MM-DD", "description": "string", "customer_id": "uuid", "item_count": int, "container_type": "string (20ft/40ft)", "origin_location_id": "uuid", "destination_location_id": "uuid", "freight_charge_customer": float, "freight_charge_partner": float, "container_number_planned": "string", "seal_number_planned": "string", "cargo_drop_off_date": "YYYY-MM-DD"}`
  - **Response Body:** `{"id": "uuid", ...plan_details}`
- **`GET /plans`**
  - **Description:** Lists transportation plans with filters (date range, status, customer, etc.) and pagination.
  - **Query Params:** `start_date`, `end_date`, `status`, `customer_id`, `page`, `limit`
  - **Response Body:** `{"data": [{...plan_details}], "pagination": {"total": int, "page": int, "limit": int}}`
- **`GET /plans/{planId}`**
  - **Description:** Gets details of a specific transportation plan.
  - **Response Body:** `{...plan_details}`
- **`PUT /plans/{planId}`**
  - **Description:** Updates a transportation plan.
  - **Request Body:** Same as POST, with fields to update.
  - **Response Body:** `{...updated_plan_details}`
- **`DELETE /plans/{planId}`**
  - **Description:** Deletes a transportation plan.
  - **Response Body:** `{"message": "Plan deleted successfully"}`

#### 4.3.2. Financial Reports (Báo cáo tài chính)
- **`GET /reports/financial/summary`**
  - **Description:** Retrieves summarized financial data.
  - **Query Params:** `vehicle_id`, `month`, `year`, `start_date`, `end_date`, `customer_id`
  - **Response Body:** `{"profit_by_vehicle": [...], "profit_by_month": [...], "cost_details": {...}, "receivables_payables": {...}}`
- **`GET /reports/financial/export`**
  - **Description:** Generates data for CSV/Excel export (frontend handles file creation).
  - **Query Params:** Similar to summary.
  - **Response Body:** `[{"col1": "data", ...}]` (Array of objects representing rows)

### 4.4. Kế Toán (Accounting)

#### 4.4.1. Transportation Schedule (Lịch trình vận chuyển)
- **`GET /schedules`** (Can reuse `GET /plans` with appropriate status/date filters)
- **`PUT /plans/{planId}/status`**
  - **Description:** Updates the status of a trip/plan.
  - **Request Body:** `{"status": "string (Lên lịch/Đang chạy/Hoàn thành)"}`
  - **Response Body:** `{...updated_plan_details}`

#### 4.4.2. Trip Expenses (Chi phí theo chuyến)
- **`POST /trips/{tripId}/expenses`**
  - **Description:** Adds expenses for a specific trip. Cannot add/edit if trip is "Hoàn thành".
  - **Request Body:** `{"km_laden": float, "km_empty": float, "fuel_liters": float, "fuel_cost": float, "road_tolls": float, "bridge_tolls": float, "lifting_fees": float, "miscellaneous_costs": float, "notes": "string"}`
  - **Response Body:** `{"id": "uuid", ...expense_details}`
- **`GET /trips/{tripId}/expenses`**
  - **Description:** Retrieves all expenses for a specific trip.
  - **Response Body:** `[{...expense_details}]`

#### 4.4.3. Monthly Vehicle Expenses (Chi phí phát sinh theo xe)
- **`POST /vehicles/{vehicleId}/monthly-expenses`**
  - **Description:** Adds monthly expenses for a vehicle.
  - **Request Body:** `{"month": int, "year": int, "parking_fee": float, "epass_fee": float, "insurance_fee": float, "repair_costs": float, "driver_salary_component": float, "other_description": "string", "other_amount": float}`
  - **Response Body:** `{"id": "uuid", ...monthly_expense_details}`
- **`GET /vehicles/{vehicleId}/monthly-expenses`**
  - **Description:** Retrieves monthly expenses for a vehicle (filterable by month/year).
  - **Query Params:** `month`, `year`
  - **Response Body:** `[{...monthly_expense_details}]`

#### 4.4.4. Accounts Receivable/Payable (Công nợ)
- **`GET /accounts/receivable`**
  - **Description:** Retrieves accounts receivable data.
  - **Query Params:** `customer_id`, `start_date`, `end_date`
  - **Response Body:** `[{"customer_name": "string", "amount_due": float, ...}]`
- **`GET /accounts/payable`**
  - **Description:** Retrieves accounts payable data.
  - **Query Params:** `partner_id`, `start_date`, `end_date`
  - **Response Body:** `[{"partner_name": "string", "amount_owed": float, ...}]`

### 4.5. Giao Nhận (Dispatch/Logistics)

#### 4.5.1. Daily Transportation Schedule
- **`GET /schedules/daily`** (Can reuse `GET /plans` with a specific `date` query param)
  - **Query Params:** `date=YYYY-MM-DD`

#### 4.5.2. Goods Receipt Data (Dữ liệu khi nhận hàng)
- **`POST /trips/{tripId}/receipt-data`**
  - **Description:** Updates a trip with actual container and seal numbers upon receipt.
  - **Request Body:** `{"container_number_actual": "string", "seal_number_actual": "string"}`
  - **Response Body:** `{...updated_trip_details}`

#### 4.5.3. Advance & Reimbursement Requests (Yêu cầu tạm ứng & hoàn ứng)
- **`POST /requests/advance`**
  - **Description:** Submits an advance request.
  - **Request Body:** `{"trip_id": "uuid" (optional), "user_id": "uuid" (requester), "amount": float, "expense_category": "string (nâng hạ, khai báo, etc.)", "reason": "string"}` (File uploads handled separately)
  - **Response Body:** `{"id": "uuid", ...request_details, "status": "pending"}`
- **`POST /requests/reimbursement`**
  - **Description:** Submits a reimbursement request.
  - **Request Body:** Similar to advance request.
  - **Response Body:** `{"id": "uuid", ...request_details, "status": "pending"}`
- **`GET /requests`**
  - **Description:** Lists advance/reimbursement requests (filterable by user, status, type).
  - **Query Params:** `user_id`, `status`, `type (advance/reimbursement)`
  - **Response Body:** `[{"id": "uuid", ...request_details}]`
- **`PUT /requests/{requestId}/status`**
  - **Description:** (Manager/Accountant) Approves or rejects a request.
  - **Request Body:** `{"status": "string (approved/rejected)", "notes": "string"}`
  - **Response Body:** `{...updated_request_details}`
- **`POST /uploads`**
  - **Description:** Handles file uploads for attachments (e.g., receipts for reimbursements).
  - **Request:** Multipart form data with file.
  - **Response:** `{"file_url": "string_url_to_stored_file"}`
  - **Note:** Associate `file_url` with the respective request via another endpoint or by including `request_id` in this call.

### 4.6. Lái Xe (Driver)

#### 4.6.1. Trip Information (Thông tin chuyến đi)
- **`GET /drivers/{driverId}/trips`**
  - **Description:** Lists trips assigned to and/or completed by the driver.
  - **Query Params:** `status (completed/ongoing)`, `date_range`
  - **Response Body:** `[{"trip_id": "uuid", "date": "YYYY-MM-DD", "freight_revenue": float, "fuel_consumed_liters": float, ...}]`

#### 4.6.2. Monthly Income (Thu nhập hàng tháng)
- **`GET /drivers/{driverId}/income/monthly`**
  - **Description:** Retrieves monthly income summary for the driver.
  - **Query Params:** `month`, `year`
  - **Response Body:** `{"work_days": int, "total_salary": float, "deductions": float, "net_pay": float}`

### 4.7. General/Helper Endpoints
- **`GET /customers`**
  - **Description:** Lists customers for dropdowns.
  - **Response Body:** `[{"id": "uuid", "name": "string"}]`
- **`GET /vehicles`**
  - **Description:** Lists vehicles.
  - **Response Body:** `[{"id": "uuid", "license_plate": "string", "type": "string"}]`
- **`GET /locations`**
  - **Description:** Lists predefined locations (e.g., ports, warehouses).
  - **Response Body:** `[{"id": "uuid", "name": "string", "address": "string"}]`

### 4.8. Utility Endpoints

- **`POST /api/v1/utils/hash-text`**
  - **Description:** Hashes a given text string using the same mechanism as password hashing (including any system-wide salt and secret configurations). This endpoint is intended for utility or debugging purposes.
  - **Request Body:** `{"text_to_hash": "string"}`
  - **Response Body:** `{"hashed_text": "string_hashed_value"}`

## 5. Database Schema (High-Level)

- **`users`**: `id (PK, UUID)`, `username (UNIQUE)`, `password_hash`, `role_id (FK -> roles)`, `full_name`, `created_at`, `updated_at`
- **`roles`**: `id (PK, UUID)`, `name (VARCHAR, UNIQUE)` (e.g., 'QuanLy', 'KeToan', 'GiaoNhan', 'LaiXe')
- **`transportation_plans` (or `trips`)**: `id (PK, UUID)`, `created_by_user_id (FK -> users)`, `assigned_driver_id (FK -> users, nullable)`, `customer_id (FK -> customers)`, `plan_date`, `description`, `item_count`, `container_type`, `origin_location_id (FK -> locations)`, `destination_location_id (FK -> locations)`, `freight_charge_customer`, `freight_charge_partner`, `container_number_planned`, `seal_number_planned`, `container_number_actual (nullable)`, `seal_number_actual (nullable)`, `cargo_drop_off_date`, `status` (e.g., 'Lên lịch', 'Đang chạy', 'Hoàn thành', 'Hủy'), `created_at`, `updated_at`
- **`customers`**: `id (PK, UUID)`, `name`, `contact_info`, `created_at`, `updated_at`
- **`locations`**: `id (PK, UUID)`, `name`, `address_details`, `type` (e.g., 'port', 'warehouse', 'customer_site')
- **`trip_expenses`**: `id (PK, UUID)`, `trip_id (FK -> transportation_plans)`, `km_laden`, `km_empty`, `fuel_liters`, `fuel_cost`, `road_tolls`, `bridge_tolls`, `lifting_fees`, `miscellaneous_costs`, `notes`, `created_at`, `updated_at`
- **`vehicles`**: `id (PK, UUID)`, `license_plate (UNIQUE)`, `type`, `capacity`, `created_at`, `updated_at`
- **`vehicle_monthly_expenses`**: `id (PK, UUID)`, `vehicle_id (FK -> vehicles)`, `month (INT)`, `year (INT)`, `parking_fee`, `epass_fee`, `insurance_fee`, `repair_costs`, `driver_salary_component`, `other_description`, `other_amount`, `created_at`, `updated_at`
- **`advance_reimbursement_requests`**: `id (PK, UUID)`, `requester_user_id (FK -> users)`, `trip_id (FK -> transportation_plans, nullable)`, `type (ENUM('advance', 'reimbursement'))`, `expense_category`, `amount`, `reason`, `status (ENUM('pending', 'approved', 'rejected'))`, `notes_approval (nullable)`, `submitted_at`, `processed_at (nullable)`
- **`attachments`**: `id (PK, UUID)`, `request_id (FK -> advance_reimbursement_requests)`, `file_name`, `file_url`, `uploaded_at`

## 6. Authentication & Authorization

- **Authentication:** JWT (JSON Web Tokens) will be used. The login endpoint will issue a token, which must be included in the `Authorization` header (Bearer token) for all protected endpoints.
- **Authorization:** Role-based access control (RBAC). Middleware will check the user's role (extracted from JWT) against the required role(s) for accessing specific endpoints or performing certain actions.

## 7. Data Validation

- Input validation will be performed at the handler level for all incoming requests (request bodies, query parameters, path parameters).
- Use a validation library in Go (e.g., `go-playground/validator`) for struct-based validation.
- Return clear error messages for validation failures (HTTP 400 Bad Request).

## 8. Error Handling

- Standardized JSON error responses:
  `{"error": {"code": http_status_code, "message": "descriptive_error_message", "details": {optional_field_specific_errors}}}`
- Examples:
  - `400 Bad Request`: Validation errors, malformed requests.
  - `401 Unauthorized`: Missing or invalid token.
  - `403 Forbidden`: Insufficient permissions for the action.
  - `404 Not Found`: Resource not found.
  - `500 Internal Server Error`: Unexpected server-side errors.

## 9. Deployment

- The application and its MySQL database will be containerized using Docker.
- A `docker-compose.yml` file will define and manage the services for development and production-like environments.
- Environment variables will be used for configuration (database credentials, JWT secret, etc.).

## 10. Setup & Running Locally

1.  Clone the repository.
2.  Ensure Docker and Docker Compose are installed.
3.  Create a `.env` file from a `.env.example` with necessary configurations (DB credentials, JWT secret).
4.  Run `docker-compose up --build` from the `/backend` directory.
5.  The API should be accessible at `http://localhost:PORT` (port defined in `docker-compose.yml` and Gin config).
6.  Database migrations will be handled by a migration tool (e.g., `golang-migrate/migrate`) either automatically on startup (development) or via a separate command.

