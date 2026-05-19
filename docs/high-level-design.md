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

## 3. Exhaustive Database Schema

The system requires the following complete list of tables to support all features in the specification. All tables should include standard auditing columns (`created_at`, `updated_at`, `deleted_at` for soft deletes).

### 3.1 Catalog & Configuration
1.  **`Users`**: Login credentials for all system users (Managers, Accountants, Drivers). (Columns: `id`, `email`, `password_hash`, `role`, `status`). Role determines access level; employment/profile data lives in role-specific tables.
2.  **`Drivers`**: Employment profile for drivers. (Columns: `id`, `user_id` FK → Users, `name`, `phone`, `assigned_truck_id` FK → Trucks (nullable), `base_salary`, `status`). Separated from `Users` so historical data persists after a driver leaves and their login is deactivated.
2.  **`Customers`**: Company clients. (Columns: `id`, `name`, `contact_info`).
3.  **`Trucks`**: Vehicle assets. (Columns: `id`, `license_plate`, `status`).
4.  **`Trailers`**: Individual physical trailer units. (Columns: `id`, `license_plate`, `type` e.g., 20ft/40ft, `status`, + standard audit columns). Extensible with additional attributes as requirements evolve.
5.  **`Routes`**: Destinations. (Columns: `id`, `name`, `distance_km`, `is_mountain`, `fixed_fuel_allowance`).
6.  **`PricingTables`**: Revenue lookups. (Columns: `id`, `customer_id`, `route_id`, `price`).
7.  **`RoadAllowances`**: Base toll allowances. (Columns: `id`, `route_id`, `trailer_type`, `base_amount`).
8.  **`FuelConfig`**: Global fuel settings. (Columns: `id`, `loaded_norm`, `empty_norm`, `supplement`, `unit_price`).
9.  **`PenaltyReasons`**: Standardized infraction list. (Columns: `id`, `reason_text`, `default_amount`).

### 3.2 Operations (Trips)
10. **`Trips`**: The core operational unit — standalone trips with optional grouping via `customer_reference`. Orders deferred to post-MVP.
    *   *Columns:* `id`, `customer_id`, `customer_reference` (optional text field for grouping related trips), `truck_id`, `driver_id` FK → Drivers, `route_id`, `trailer_id` FK → Trailers, `status` (CREATED, IN_TRANSIT, COMPLETED, LOCKED, CANCELED), `departure_date`.
    *   *Metrics:* `fuel_liters`, `fuel_price_applied`, `actual_km`, `tolls_discount`, `tolls_addition`, `tolls_stations`, `has_return_cargo`, `driver_salary`.
    *   *Calculated:* `total_fuel_cost`, `total_road_allowance`, `total_cost`, `revenue`, `gross_profit`.
    *   *Revenue override:* `revenue_original`, `revenue_overridden_by`, `revenue_overridden_at` (nullable, only set when accountant overrides the auto-looked-up price).
    *   *Media:* `photo_urls` (JSONB array of URLs, for special cargo photos like Container & Seal).

### 3.3 Financials
12. **`Ledger`**: Immutable financial transactions.
    *   *Columns:* `id`, `timestamp`, `txn_type` (TRIP_REVENUE, PAYMENT_RECEIVED, PENALTY, MANAGEMENT_FEE, ADJUSTMENT), `txn_id`, `receipt_id`, `entity_type` (VARCHAR), `entity_id`, `credit`, `debit`, `balance`, `note`.
13. **`Penalties`**: Record of driver infractions. (Columns: `id`, `driver_id`, `trip_id` (nullable), `reason_id`, `amount`, `date`).
14. **`CapTableHistory`**: Partner equity percentages. (Columns: `id`, `partner_name`, `percentage`, `effective_date`).
15. **`Distributions`**: Snapshot payouts for profit sharing. (Columns: `id`, `quarter`, `year`, `partner_name`, `amount`).
16. **`ManagementFees`**: Monthly overhead costs. (Columns: `id`, `month`, `year`, `amount`).

### 3.4 System Audit
17. **`AuditLogs`**: Event-driven tracking of user intentions.
    *   *Columns:* `id`, `timestamp`, `user_id`, `event_type` (e.g., `TRIP_DISPATCHED`, `LEDGER_ADJUSTMENT`, `FUEL_CONFIG_UPDATED`), `entity_type` (VARCHAR), `entity_id` (Integer), `payload` (JSONB - stores the delta or relevant data), `ip_address`.

---

## 4. Complete API Architecture

The backend will expose the following RESTful endpoints:

### 4.1 Authentication & Users
*   `POST /api/auth/login` - Authenticate and return JWT.
*   `GET /api/users/me` - Get current user profile.
*   `GET /api/users` - List users (Admin only).

### 4.2 Configuration Management (CRUD)
*   `GET|POST|PUT|DELETE /api/customers`
*   `GET|POST|PUT|DELETE /api/trucks`
*   `GET|POST|PUT|DELETE /api/routes`
*   `GET|POST|PUT|DELETE /api/pricing-tables`
*   `GET|POST|PUT|DELETE /api/road-allowances`
*   `GET|POST|PUT|DELETE /api/penalty-reasons`
*   `GET|PUT /api/fuel-config` - Manage global fuel norms and unit price.

### 4.3 Operations (Trips)
*   `GET /api/trips` - List trips (with filters for status, date, driver, customer).
*   `POST /api/trips` - Create a new trip (Manager).
*   `GET /api/trips/:id` - Get trip details.
*   `PUT /api/trips/:id/pre-departure` - Update initial figures (Accountant).
*   `POST /api/trips/:id/dispatch` - Change status to IN_TRANSIT.
*   `PUT /api/trips/:id/actuals` - Update final actuals and photos (Accountant).
*   `POST /api/trips/:id/lock` - Lock trip, trigger Ledger entry.
*   `POST /api/trips/:id/cancel` - Cancel a trip.

### 4.4 Financials & Ledger
*   `GET /api/ledger` - View raw ledger transactions.
*   `GET /api/ledger/customers/:id/statement` - Get customer debt and aging report.
*   `POST /api/payments/receive` - Record bank transfer (creates multiple Ledger rows grouped by `receipt_id`).
*   `POST /api/ledger/adjustments` - Create an adjustment Ledger row (`txn_type = ADJUSTMENT`) linked to the original trip via `txn_id`. Original trip data stays frozen. Requires reason, amount, and signed agreement reference.
*   `GET|POST /api/penalties` - Record a driver penalty (triggers Ledger entry).
*   `GET|POST /api/management-fees` - Record monthly overhead.

### 4.5 Driver Mobile App (Read-Only)
*   `GET /api/driver/me/trips` - List assigned trips (upcoming and history).
*   `GET /api/driver/me/trips/:id` - View trip details (fuel allocated, route).
*   `GET /api/driver/me/earnings` - View total trip income and penalties.

### 4.6 Analytics & Reports
*   `GET /api/reports/dashboard` - Get high-level stats (Revenue, Costs, Gross Profit).
*   `GET /api/reports/pnl` - Generate Profit & Loss report.
*   `POST /api/reports/distribute-profit` - Execute quarterly profit sharing calculation based on `CapTableHistory`.

### 4.7 Audit Logging (Event-Driven)
*   **Architecture**: Node.js `EventEmitter` is used internally.
*   **Concept**: We log by **intention** (Domain Events) rather than raw database `UPDATE` or `INSERT` actions. A single intention (e.g., `POST /api/trips/:id/lock`) might update multiple tables, but it emits only one semantic event (e.g., `TRIP_LOCKED`).
*   **Workflow**:
    1. Controller performs business logic (e.g., locking a trip, writing to Ledger).
    2. Controller emits `eventEmitter.emit('TRIP_LOCKED', { userId, tripId, payload })`.
    3. An async listener catches the event and writes a single row to the `AuditLogs` table without blocking the API response.
*   **API Endpoint**:
    *   `GET /api/audit-logs` - View system-wide event history (Director/Admin only).

---

## 5. Security & Access Control

*   **Authentication:** JWT (JSON Web Tokens). This stateless approach scales well and easily supports both the Web Admin interface and the Mobile Driver application.
*   **Authorization (RBAC):**
    *   `ADMIN`: Developer/support role — full system access, user account management, system configuration. Not a business role.
    *   `MANAGER`: Operational control — all trip status transitions, views reports and financials.
    *   `ACCOUNTANT`: Data entry and financials — all trip status transitions, enters trip figures, records payments, manages configuration tables. Cannot alter historical Ledger records.
    *   `DRIVER`: Read-only mobile access — strictly restricted to `GET /api/driver/me/trips`, `GET /api/driver/me/earnings`, and `GET /api/driver/me/penalties`.
*   **Immutability:** Immutability for the `Ledger` is enforced purely at the **Application Level**. The Node.js API will simply not expose any `UPDATE` or `DELETE` endpoints for ledger entries.