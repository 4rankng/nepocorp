# High-Level Design (HLD): NEPO Logistics System

## 1. System Architecture Overview

The NEPO Logistics system will follow a standard **Client-Server architecture** utilizing a monolithic backend to keep MVP development fast, with a robust relational database to ensure financial data integrity (especially for the Ledger).

### 1.1 Components
*   **Web Application (Desktop-first):** Used by Managers/Partners and Accountants for high-data-density tasks (data entry, ledger management, configuration, reports).
*   **Mobile Web App / PWA (Mobile-first):** Used by Drivers to view their assigned trips, fuel allowances, earnings, and penalties in a read-only interface.
*   **Backend API:** A centralized RESTful (or GraphQL) API handling all business logic, calculations, and data validations.
*   **Relational Database:** The core source of truth, heavily relying on ACID transactions for financial ledger integrity.
*   **Object Storage:** Cloud storage for uploading and serving trip-related files (e.g., Container/Seal photos for "chuyến chè").

---

## 2. Technology Stack Recommendations

Based on the existing UI kits (`frontend/ui_kits/web/App.jsx`, etc.) and the business requirements:

*   **Frontend:** React.js (Vite or Next.js) + TailwindCSS / Custom CSS for styling. It allows sharing components between the Web Admin and Mobile Driver views.
*   **Backend:** Node.js (Express or NestJS) with TypeScript. This provides a unified language stack with the React frontend, allowing for shared types and validation logic.
*   **Database:** PostgreSQL. It is highly recommended for financial systems requiring an immutable Ledger, running balances, and robust foreign key constraints.
*   **Storage:** Local server disk storage (e.g., on a Digital Ocean Droplet) for the MVP. This is the simplest way to handle Container/Seal photos for "chuyến chè". (Note: Requires a solid backup strategy for the server volume).

---

## 3. Core Data Model (Entity-Relationship)

The system is built around several core domains. Here are the primary tables and their relationships:

### 3.1 Catalog & Configuration
*   **`Users`**: System users including `ADMIN` (Manager), `ACCOUNTANT`, and `DRIVER`.
*   **`Customers`**: Company clients.
*   **`Trucks` & `Trailers`**: Vehicle assets.
*   **`Routes`**: Destinations, distances, and fixed fuel allowances for mountain routes.
*   **`PricingTables`**: Composite key mapping (`Customer_ID`, `Route_ID`) -> `FixedPrice`.
*   **`RoadAllowances`**: Composite key mapping (`Route_ID`, `TrailerType`) -> `BaseAllowance`.

### 3.2 Operations (Orders & Trips)
*   **`Orders`**: The overarching customer request.
    *   *Columns:* `id`, `customer_id`, `created_at`, `status`.
*   **`Trips` (1 Order -> N Trips)**: The physical execution unit.
    *   *Columns:* `id`, `order_id`, `truck_id`, `driver_id`, `route_id`, `trailer_type`, `status` (Created -> In Transit -> Completed -> Locked -> Canceled).
    *   *Metrics:* `fuel_liters`, `fuel_price`, `actual_km`, `tolls_discount`, `tolls_addition`, `tolls_stations`, `has_return_cargo`, `driver_salary`.
    *   *Calculated (or Denormalized) Fields:* `total_fuel_cost`, `total_road_allowance`, `total_cost`, `revenue`, `gross_profit`.
    *   *Media:* `photo_urls` (for special cargo).

### 3.3 Financials (The Ledger)
*   **`Ledger`**: An immutable table handling all financial states via double-entry or running balance concepts.
    *   *Columns:* `id`, `timestamp`, `txn_type` (TRIP_REVENUE, PAYMENT_RECEIVED, PENALTY), `txn_id` (e.g., `Trip.id`), `receipt_id` (e.g., grouping a bulk bank transfer), `entity_type` (VARCHAR - no ENUMs for maximum flexibility), `entity_id` (Integer, polymorphic with no strict Foreign Key constraints to allow loose coupling), `credit`, `debit`, `balance`, `note`.
*   **`Penalties`**: Record of driver infractions (maps to Ledger deductions).
*   **`CapTableHistory` & `Distributions`**: Tracks partner equity percentages over time and logs snapshot payouts for profit sharing.

---

## 4. Key Workflows & API Boundaries

### 4.1 Trip Lifecycle (State Machine)
1.  **POST `/api/trips`**: Manager creates Trip (`status: CREATED`).
2.  **PUT `/api/trips/:id/pre-departure`**: Accountant inputs expected fuel/tolls.
3.  **POST `/api/trips/:id/dispatch`**: Trip status changes to `IN_TRANSIT`.
4.  **PUT `/api/trips/:id/actuals`**: Accountant updates actuals upon return. Status -> `COMPLETED`. (If special cargo, validates local image URLs).
5.  **POST `/api/trips/:id/lock`**: Status -> `LOCKED`. **Critical Path:** This computes final financials and writes a `TRIP_REVENUE` record into the `Ledger`.

### 4.2 Customer Payment & Accounts Receivable
1.  **GET `/api/ledger/customers/:id/statement`**: Aggregates Ledger to show current debt and aging (30/60/90 days).
2.  **POST `/api/payments/receive`**: Accountant records a bank transfer.
    *   *Input:* `customer_id`, `total_amount`, `trip_ids[]` (the specific trips being paid off).
    *   *Action:* Generates a unique `receipt_id`. Creates multiple `PAYMENT_RECEIVED` Ledger rows (one for each `trip_id` paid). Updates running balance.

### 4.3 Fuel Normalization Engine
*   When a Trip is saved, a service compares `(fuel_liters / actual_km) * 100` against the `Routes` config.
*   If `Route.is_mountain` is true, it strictly checks `fuel_liters` against `Route.fixed_fuel_allowance`.
*   If threshold exceeded, it flags a warning boolean on the Trip record for the Dashboard.

### 4.4 Monthly Close & Adjustments
*   Trips are locked individually (`trip-by-trip`).
*   Corrections to `LOCKED` trips cannot mutate the original `Trip` record.
*   Accountants must use **POST `/api/ledger/adjustments`** to insert new Ledger rows (Debit/Credit Notes) to fix past financial errors, ensuring compliance with VN accounting standards.

---

## 5. Security & Access Control

*   **Authentication:** JWT (JSON Web Tokens). This stateless approach scales well and easily supports both the Web Admin interface and the Mobile Driver application.
*   **Authorization (RBAC):**
    *   `ADMIN`: Full access, views profit distributions, adds users.
    *   `ACCOUNTANT`: Creates/edits trips, manages Ledger, configurations. Cannot alter historical Ledger records.
    *   `DRIVER`: Strictly restricted to `GET /api/driver/me/trips` and `GET /api/driver/me/penalties`.
*   **Immutability:** Immutability for the `Ledger` is enforced purely at the **Application Level**. The Node.js API will simply not expose any `UPDATE` or `DELETE` endpoints for ledger entries.