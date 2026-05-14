# NEPO Transport Management System — Go Backend Technical Design

> **Version:** 1.0  
> **Date:** 2026-05-14  
> **Scope:** Backend API & data layer for container transport operations

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Database Design](#4-database-design)
5. [API Design](#5-api-design)
6. [Business Logic Layer](#6-business-logic-layer)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Background Jobs & Automation](#8-background-jobs--automation)
9. [Concurrency & Data Integrity](#9-concurrency--data-integrity)
10. [AI Integration](#10-ai-integration)
11. [Error Handling](#11-error-handling)
12. [Configuration & Deployment](#12-configuration--deployment)
13. [Data Migration Strategy](#13-data-migration-strategy)

---

## 1. System Overview

### 1.1 Purpose

NEPO is a container transport company operating 4 tractor trucks out of Hai Phong, Vietnam. The current operations rely entirely on manual Excel spreadsheets — one file per truck per month, separate files for fuel rates, road allowances, and accounts receivable. This Go backend serves as the API layer and business logic engine for a web-based management system that replaces these spreadsheets.

### 1.2 Core Operational Workflows

The backend must support the following day-to-day operational cycle:

```mermaid
flowchart TD
    A[Chuyến đi mới<br/>Trip Created] --> B[Gán xe & tài xế<br/>Assign Truck & Driver]
    B --> C[Tự động tra định mức dầu<br/>Auto Fuel Rate Lookup]
    B --> D[Tự động tra tiền đi đường<br/>Auto Road Allowance Lookup]
    C --> E[Xác nhận chi phí chuyến<br/>Confirm Trip Costs]
    D --> E
    E --> F[Ghi doanh thu<br/>Record Revenue]
    F --> G[Tính lợi nhuận gộp<br/>Gross Profit Calc]
    G --> H[Phát sinh công nợ<br/>AR Entry Created]
    H --> I[Thu tiền khách hàng<br/>Payment Collection]
    I --> J[Cập nhật công nợ<br/>Update AR Balance]
    J --> K[Báo cáo tháng<br/>Monthly Report]
```

### 1.3 Key Requirements Summary

| Area | Requirement |
|------|------------|
| Fleet | 4 trucks, each with trailer assignment, fuel rate config |
| Trips | CRUD with auto-calculation of fuel cost, road allowance, gross profit |
| Fuel | 5 load-based consumption levels per vehicle, per-trip unit price |
| Road Allowance | 38 routes with 40'/20' trailer variants, toll deductions, surcharges |
| Revenue/Cost | 7 cost categories tracked per trip, monthly aggregation |
| Accounts Receivable | 48+ customers, running balance, aging buckets |
| Roles | Admin, Kế toán (Accountant), Lái xe (Driver) |

---

## 2. Architecture

### 2.1 High-Level Architecture

```mermaid
graph TB
    subgraph Client
        FE[Next.js Frontend]
        MB[Mobile App<br/>future]
    end

    subgraph API Gateway
        NG[nginx / Caddy<br/>Reverse Proxy + TLS]
    end

    subgraph Go Backend
        HTTP[HTTP Server<br/>Chi / Gin Router]
        MW[Middleware Stack<br/>Auth · Logging · CORS · RateLimit]
        HAND[Handlers<br/>Trip · Fleet · Fuel · Route · AR · Report]
        SVC[Service Layer<br/>Business Logic]
        REPO[Repository Layer<br/>Data Access]
        WK[Background Workers<br/>Cron Jobs]
    end

    subgraph Data Store
        PG[(PostgreSQL 16<br/>Primary DB)]
        RD[(Redis 7<br/>Cache + Sessions)]
        S3[MinIO / S3<br/>File Storage]
    end

    FE --> NG --> HTTP
    MB --> NG
    HTTP --> MW --> HAND --> SVC --> REPO --> PG
    SVC --> RD
    HAND --> S3
    WK --> SVC
```

### 2.2 Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Clean Architecture** | Handler → Service → Repository layers; domain models independent of transport |
| **Domain-Driven** | Bounded contexts: Fleet, Trip, Finance, AR, Report |
| **Explicit over Implicit** | No ORM magic; SQL queries written explicitly with sqlc or squirrel |
| **Configuration-driven** | Fuel rates, road allowances stored as config, not code |
| **Audit Trail** | Every mutation logged with who/when/what for financial data |
| **Idempotency** | Payment recording and cost allocation support retry without duplication |

### 2.3 Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | Go 1.22+ | Performance, strong typing, excellent concurrency |
| HTTP Router | Chi v5 | Lightweight, composable middleware, stdlib-compatible |
| Database | PostgreSQL 16 | ACID, JSON support, window functions for running balances |
| Query Builder | sqlc | Type-safe SQL, compile-time checked, no reflection |
| Cache | Redis 7 | Session store, rate-limiting, computed report caching |
| Migrations | golang-migrate | Versioned SQL migrations, CLI + library |
| Validation | go-playground/validator | Struct tag-based validation |
| Logging | slog (stdlib) | Structured logging, no external dependency |
| Config | Viper | YAML/env/flag config with hot reload |
| Auth | JWT (golang-jwt) | Stateless auth, role-based claims |
| Authorization | Casbin | Policy-based RBAC with domain support, PostgreSQL adapter |
| AI | Google Gemini 2.5 Flash | Route matching, anomaly detection, NL query, OCR |
| Distributed Lock | go-redsync | Redis-based leader election for cron jobs |
| Scheduler | robfig/cron | Background jobs for monthly alerts and summaries |
| Container | Docker + Docker Compose | Consistent dev/prod environments |

---

## 3. Project Structure

```
nepo-backend/
├── cmd/
│   ├── api/                    # Main API server entry point
│   │   └── main.go
│   ├── migrate/                # Database migration runner
│   │   └── main.go
│   └── seed/                   # Seed data loader (fuel rates, routes)
│       └── main.go
│
├── internal/
│   ├── config/                 # Configuration loading
│   │   └── config.go
│   │
│   ├── domain/                 # Pure domain models (no DB dependency)
│   │   ├── truck.go
│   │   ├── trip.go
│   │   ├── fuel_rate.go
│   │   ├── route_allowance.go
│   │   ├── ar_transaction.go
│   │   └── user.go
│   │
│   ├── handler/                # HTTP handlers (thin, delegates to service)
│   │   ├── auth_handler.go
│   │   ├── truck_handler.go
│   │   ├── trip_handler.go
│   │   ├── fuel_handler.go
│   │   ├── route_handler.go
│   │   ├── ar_handler.go
│   │   ├── report_handler.go
│   │   ├── dashboard_handler.go
│   │   └── dto/                # Request/Response DTOs
│   │       ├── trip_dto.go
│   │       ├── ar_dto.go
│   │       └── report_dto.go
│   │
│   ├── middleware/
│   │   ├── auth.go             # JWT verification + role check
│   │   ├── logging.go          # Request/response logging
│   │   ├── cors.go
│   │   └── ratelimit.go
│   │
│   ├── service/                # Business logic layer
│   │   ├── auth_service.go
│   │   ├── truck_service.go
│   │   ├── trip_service.go     # Core: cost calc, profit calc
│   │   ├── fuel_service.go
│   │   ├── route_service.go
│   │   ├── ar_service.go       # Running balance, aging
│   │   └── report_service.go
│   │
│   ├── repository/             # Data access layer
│   │   ├── truck_repo.go
│   │   ├── trip_repo.go
│   │   ├── fuel_rate_repo.go
│   │   ├── route_repo.go
│   │   ├── ar_repo.go
│   │   └── audit_repo.go
│   │
│   ├── worker/                 # Background jobs
│   │   ├── scheduler.go
│   │   ├── ar_aging_alert.go
│   │   └── fuel_price_sync.go
│   │
│   └── pkg/                    # Shared utilities
│       ├── database/           # DB connection, transactions
│       │   └── postgres.go
│       ├── response/           # Standardized API response format
│       │   └── response.go
│       ├── pagination/         # Cursor-based pagination
│       │   └── pagination.go
│       └── excel/              # Excel import/export helpers
│           └── importer.go
│
├── migrations/                 # SQL migration files
│   ├── 000001_init_schema.up.sql
│   ├── 000001_init_schema.down.sql
│   ├── 000002_seed_fuel_rates.up.sql
│   ├── 000003_seed_routes.up.sql
│   └── ...
│
├── api/                        # OpenAPI spec
│   └── openapi.yaml
│
├── deployments/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── nginx.conf
│
├── scripts/
│   ├── import_excel_data.go    # One-time data migration script
│   └── generate_sqlc.go
│
├── go.mod
├── go.sum
├── Makefile
└── .env.example
```

---

## 4. Database Design

### 4.1 Entity-Relationship Diagram

```mermaid
erDiagram
    TRUCK ||--o{ TRIP : "operates"
    TRUCK ||--|| FUEL_RATE_CONFIG : "has"
    TRUCK ||--|| TRAILER : "tows"
    TRIP }o--|| ROUTE_ALLOWANCE : "follows"
    TRIP }o--|| DRIVER : "driven by"
    TRIP ||--o{ TRIP_COST : "incurs"
    TRIP ||--o{ AR_TRANSACTION : "generates"
    CUSTOMER ||--o{ AR_TRANSACTION : "billed to"
    ROUTE_ALLOWANCE ||--o{ TOLL_STATION : "passes through"
    FUEL_PRICE ||--o{ TRIP : "applied to"

    TRUCK {
        uuid id PK
        varchar license_plate "e.g. 15C-136.31"
        varchar engine_type
        varchar status "active / maintenance / retired"
        timestamp created_at
    }

    TRAILER {
        uuid id PK
        varchar license_plate "e.g. 15R-067.95"
        varchar trailer_type "40ft / 20ft"
        uuid truck_id FK "current assignment"
        timestamp created_at
    }

    FUEL_RATE_CONFIG {
        uuid id PK
        uuid truck_id FK
        int mixed_over_20t "L/100km"
        int mixed_under_20t "L/100km"
        int empty "L/100km"
        int cargo_over_20t "L/100km"
        int cargo_under_20t "L/100km"
        int moc_chau_supplement "+L/100km"
        date effective_from
    }

    ROUTE_ALLOWANCE {
        uuid id PK
        varchar code "HP-MC-SL"
        varchar description "HP - Moc Chau, Son La"
        int full_allowance "VND"
        int toll_deduction "VND"
        int surcharge "VND"
        int allowance_40ft "VND"
        int allowance_20ft "VND"
        boolean active
    }

    TOLL_STATION {
        uuid id PK
        uuid route_id FK
        varchar station_name
        int toll_40ft "VND"
        int toll_20ft "VND"
        varchar highway "QL5 / other"
    }

    DRIVER {
        uuid id PK
        varchar full_name
        varchar phone
        varchar license_number
        varchar status "active / on_leave / terminated"
    }

    TRIP {
        uuid id PK
        int trip_number "sequential per month per truck"
        uuid truck_id FK
        uuid driver_id FK
        uuid route_id FK
        uuid trailer_id FK
        date trip_date
        varchar description
        varchar container_number
        varchar load_type "mixed_over_20t / mixed_under_20t / empty / cargo_over_20t / cargo_under_20t"
        int distance_km
        decimal fuel_liters
        decimal fuel_unit_price "VND per liter - stored per trip"
        decimal fuel_cost "auto-calculated"
        decimal road_allowance "auto-looked up"
        decimal driver_salary
        decimal repair_cost
        decimal tire_cost
        decimal engine_oil_cost
        decimal total_cost "SUM of all costs"
        decimal transport_revenue
        decimal gross_profit "revenue - total_cost"
        int month
        int year
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    TRIP_COST {
        uuid id PK
        uuid trip_id FK
        varchar cost_type "shared_expense / penalty / misc"
        varchar description
        decimal amount
        varchar split_rule "none / equal_4 / custom"
        timestamp created_at
    }

    CUSTOMER {
        uuid id PK
        varchar name
        varchar tax_code
        varchar address
        varchar phone
        varchar contact_person
        timestamp created_at
    }

    AR_TRANSACTION {
        uuid id PK
        uuid customer_id FK
        uuid trip_id FK "nullable - link to trip"
        varchar transaction_type "debit / credit"
        varchar gbn_reference "Giay bao no reference"
        decimal amount
        decimal running_balance "calculated"
        varchar description
        date transaction_date
        date due_date
        uuid created_by FK
        timestamp created_at
    }

    FUEL_PRICE {
        uuid id PK
        date effective_date
        decimal price_per_liter "VND"
        varchar source "manual / auto"
        timestamp created_at
    }

    MONTHLY_SUMMARY {
        uuid id PK
        uuid truck_id FK
        int month
        int year
        decimal total_fuel_liters
        decimal total_fuel_cost
        decimal total_road_allowance
        decimal total_driver_salary
        decimal total_repair
        decimal total_tire
        decimal total_engine_oil
        decimal total_cost
        decimal total_revenue
        decimal gross_profit
        decimal cumulative_profit_ytd
        timestamp calculated_at
    }

    AUDIT_LOG {
        uuid id PK
        varchar table_name
        uuid record_id
        varchar action "INSERT / UPDATE / DELETE"
        jsonb old_values
        jsonb new_values
        uuid changed_by FK
        timestamp changed_at
    }

    USER {
        uuid id PK
        varchar username
        varchar password_hash
        varchar role "admin / accountant / driver"
        varchar full_name
        boolean active
        timestamp created_at
        timestamp updated_at
    }
```

### 4.2 Key Design Decisions

#### 4.2.1 Fuel Unit Price Per Trip

Unlike the Excel sheets where the fuel unit price is embedded in each cell formula, the database stores it explicitly on each `TRIP` row. This is critical because fuel prices fluctuate independently and the system must preserve the historical price at the time of each trip.

```sql
-- Fuel unit price is stored per-trip, not per-month
ALTER TABLE trip ADD COLUMN fuel_unit_price DECIMAL(12,2) NOT NULL;

-- A separate fuel_price table tracks market prices for auto-fill suggestions
-- When creating a trip, the API suggests the latest fuel_price but allows override
```

#### 4.2.2 Running Balance for Accounts Receivable

The `running_balance` column in `AR_TRANSACTION` is maintained via a PostgreSQL trigger or computed on-read using a window function:

```sql
-- Option A: Window function (read-time calculation, always accurate)
SELECT 
    *,
    SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE -amount END)
        OVER (PARTITION BY customer_id ORDER BY transaction_date, created_at)
        AS running_balance
FROM ar_transaction
WHERE customer_id = $1;

-- Option B: Trigger-maintained column (faster reads, requires careful writes)
-- Chosen: Window function for correctness, with materialized view for reporting
```

#### 4.2.3 Shared Expenses Split

The `TRIP_COST` table with `split_rule` handles the current pattern of recording an expense once and dividing it across all 4 trucks:

```sql
-- Example: 13,500,000 VND engine oil for all 4 trucks
INSERT INTO trip_cost (trip_id, cost_type, description, amount, split_rule)
VALUES (
    NULL, -- not linked to a single trip
    'shared_expense',
    'Dầu máy tháng 3/2024',
    13500000,
    'equal_4' -- auto-split: each truck gets 3,375,000
);
```

#### 4.2.4 Soft Delete for Financial Data

Financial records (trips, AR transactions) use soft deletion with an `archived_at` timestamp. Hard deletes are prohibited for audit compliance.

```sql
ALTER TABLE trip ADD COLUMN archived_at TIMESTAMP;
-- All queries include: WHERE archived_at IS NULL
```

### 4.3 Indexes

```sql
-- Trip lookups
CREATE INDEX idx_trip_truck_month_year ON trip(truck_id, month, year) WHERE archived_at IS NULL;
CREATE INDEX idx_trip_date ON trip(trip_date) WHERE archived_at IS NULL;
CREATE INDEX idx_trip_container ON trip(container_number) WHERE archived_at IS NULL;

-- AR lookups
CREATE INDEX idx_ar_customer_date ON ar_transaction(customer_id, transaction_date);
CREATE INDEX idx_ar_customer_type ON ar_transaction(customer_id, transaction_type);
CREATE INDEX idx_ar_gbn ON ar_transaction(gbn_reference);

-- Fuel price
CREATE INDEX idx_fuel_price_date ON fuel_price(effective_date DESC);

-- Audit log
CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_changed_at ON audit_log(changed_at DESC);
```

---

## 5. API Design

### 5.1 API Overview

All endpoints are prefixed with `/api/v1`. Standard response envelope:

```json
{
    "success": true,
    "data": { ... },
    "error": null,
    "meta": {
        "page": 1,
        "per_page": 20,
        "total": 156
    }
}
```

### 5.2 Authentication Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/login` | Login, returns JWT | None |
| POST | `/auth/refresh` | Refresh JWT token | JWT |
| POST | `/auth/change-password` | Change own password | JWT |

### 5.3 Fleet Management

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/trucks` | List all trucks with status | admin, accountant |
| GET | `/trucks/:id` | Get truck detail + trailer + fuel config | admin, accountant |
| PUT | `/trucks/:id` | Update truck info | admin |
| GET | `/trucks/:id/fuel-config` | Get fuel rate configuration | admin, accountant |
| PUT | `/trucks/:id/fuel-config` | Update fuel rates | admin |
| GET | `/trailers` | List all trailers | admin, accountant |
| PUT | `/trailers/:id/assign` | Assign trailer to truck | admin |
| GET | `/drivers` | List all drivers | admin, accountant |
| POST | `/drivers` | Create driver | admin |
| PUT | `/drivers/:id` | Update driver info | admin |

### 5.4 Trip Management (Core)

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/trips` | List trips (filter by truck/month/year) | admin, accountant |
| POST | `/trips` | Create trip (auto-calculates costs) | admin, accountant |
| GET | `/trips/:id` | Get trip detail | admin, accountant, driver (own) |
| PUT | `/trips/:id` | Update trip | admin, accountant |
| DELETE | `/trips/:id` | Soft-delete trip (archive) | admin |
| POST | `/trips/batch` | Create multiple trips (bulk) | admin, accountant |
| GET | `/trips/monthly-summary` | Monthly summary per truck | admin, accountant |

#### POST `/trips` — Create Trip Request

```json
{
    "truck_id": "uuid",
    "driver_id": "uuid",
    "route_id": "uuid",
    "trailer_id": "uuid",
    "trip_date": "2024-03-15",
    "description": "Đóng hàng chè sáng 15/03",
    "container_number": "FSCU5973084",
    "load_type": "mixed_over_20t",
    "distance_km": 320,
    "fuel_liters": 108.8,
    "fuel_unit_price": 18250,
    "driver_salary": 0,
    "repair_cost": 0,
    "tire_cost": 0,
    "engine_oil_cost": 0,
    "transport_revenue": 3500000
}
```

#### POST `/trips` — Auto-calculated Response

```json
{
    "id": "uuid",
    "trip_number": 12,
    "fuel_cost": 1985600,
    "road_allowance": 2740000,
    "total_cost": 4725600,
    "gross_profit": -1225600,
    "_auto_calculated": {
        "fuel_rate_used": "34 L/100km",
        "expected_fuel_liters": 108.8,
        "route_allowance_40ft": 2740000,
        "route_name": "HP - Mộc Châu, Sơn La"
    }
}
```

The server auto-calculates:
- `fuel_cost = fuel_liters * fuel_unit_price`
- `road_allowance` = looked up from `route_allowance` table based on `route_id` + trailer type
- `total_cost = fuel_cost + road_allowance + driver_salary + repair_cost + tire_cost + engine_oil_cost`
- `gross_profit = transport_revenue - total_cost`

### 5.5 Fuel Management

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/fuel/prices` | List fuel price history | admin, accountant |
| POST | `/fuel/prices` | Add new fuel price entry | admin |
| GET | `/fuel/prices/latest` | Get current market price | admin, accountant |
| GET | `/fuel/rates` | List all fuel rate configs | admin, accountant |
| PUT | `/fuel/rates/:truck_id` | Update fuel rate config | admin |
| GET | `/fuel/calculate` | Calculate expected fuel for trip params | admin, accountant, driver |

#### GET `/fuel/calculate?truck_id=X&route_id=Y&load_type=cargo_over_20t`

```json
{
    "truck_id": "uuid",
    "route_id": "uuid",
    "load_type": "cargo_over_20t",
    "distance_km": 320,
    "fuel_rate_l_per_100km": 43,
    "expected_fuel_liters": 137.6,
    "moc_chau_supplement": 3,
    "supplemented_rate": 46,
    "supplemented_fuel_liters": 147.2,
    "note": "Mộc Châu/Sơn La supplement applies"
}
```

### 5.6 Route & Road Allowance

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/routes` | List all routes with allowances | admin, accountant, driver |
| GET | `/routes/:id` | Get route detail + toll stations | admin, accountant, driver |
| POST | `/routes` | Create new route | admin |
| PUT | `/routes/:id` | Update route/allowance | admin |
| GET | `/routes/lookup` | Search routes by keyword | admin, accountant, driver |

#### GET `/routes/lookup?q=mộc+châu&trailer_type=40ft`

```json
{
    "results": [
        {
            "id": "uuid",
            "code": "HP-MC-SL",
            "description": "HP - Mộc Châu, Sơn La",
            "full_allowance": 3000000,
            "toll_deduction": 400000,
            "surcharge": 140000,
            "allowance_40ft": 2740000,
            "allowance_20ft": 2470000
        }
    ]
}
```

### 5.7 Accounts Receivable

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/ar/customers` | List all customers with balances | admin, accountant |
| GET | `/ar/customers/:id` | Customer detail + transaction history | admin, accountant |
| POST | `/ar/customers` | Create new customer | admin, accountant |
| GET | `/ar/transactions` | List AR transactions (filterable) | admin, accountant |
| POST | `/ar/transactions/debit` | Record new charge (invoice) | admin, accountant |
| POST | `/ar/transactions/credit` | Record payment received | admin, accountant |
| GET | `/ar/aging` | AR aging report (30/60/90+ days) | admin, accountant |
| GET | `/ar/summary` | Total receivables summary | admin, accountant |

#### POST `/ar/transactions/debit` — New Invoice/Charge

```json
{
    "customer_id": "uuid",
    "trip_id": "uuid",
    "amount": 35000000,
    "gbn_reference": "TLMC2403001",
    "description": "Cước vận chuyển tháng 3/2024",
    "transaction_date": "2024-03-31",
    "due_date": "2024-04-30"
}
```

#### GET `/ar/aging` — Aging Report Response

```json
{
    "as_of_date": "2024-12-31",
    "total_receivable": 1887000000,
    "aging_buckets": [
        { "bucket": "current", "label": "< 30 days", "amount": 450000000, "count": 8 },
        { "bucket": "30-60", "label": "30-60 days", "amount": 320000000, "count": 5 },
        { "bucket": "60-90", "label": "60-90 days", "amount": 580000000, "count": 12 },
        { "bucket": "90+", "label": "> 90 days", "amount": 537000000, "count": 19 }
    ],
    "customers": [
        {
            "customer_id": "uuid",
            "name": "MỘC SƯƠNG",
            "total_outstanding": 950000000,
            "oldest_invoice_date": "2024-06-15",
            "days_overdue": 199
        }
    ]
}
```

### 5.8 Dashboard & Reports

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/dashboard/overview` | Fleet status, today's trips, receivables | admin, accountant |
| GET | `/dashboard/revenue-cost` | Revenue vs Cost chart data | admin, accountant |
| GET | `/reports/monthly` | Monthly P&L per truck | admin, accountant |
| GET | `/reports/yearly` | Yearly P&L per truck | admin, accountant |
| GET | `/reports/fuel-efficiency` | Fuel consumption vs standard | admin, accountant |
| GET | `/reports/ar-detail` | Detailed AR report for period | admin, accountant |
| POST | `/reports/export` | Export report as Excel | admin, accountant |

### 5.9 Driver App APIs

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/driver/my-trips` | Driver's assigned trips | driver |
| GET | `/driver/trip/:id` | Trip detail for driver | driver (own) |
| POST | `/driver/trip/:id/confirm` | Driver confirms trip completion | driver |
| GET | `/driver/routes` | Available routes (simplified) | driver |
| GET | `/driver/fuel-estimate` | Fuel estimate for upcoming trip | driver |

### 5.10 API Sequence Diagram — Trip Creation

```mermaid
sequenceDiagram
    actor Client
    participant API as Handler
    participant TS as TripService
    participant FS as FuelService
    participant RS as RouteService
    participant AR as ARService
    participant DB as PostgreSQL

    Client->>API: POST /trips {truck, route, load_type, ...}
    API->>API: Validate request DTO
    API->>TS: CreateTrip(ctx, req)
    
    TS->>FS: GetFuelRate(truck_id, load_type)
    FS-->>TS: rate = 34 L/100km
    TS->>FS: GetLatestFuelPrice()
    FS-->>TS: price = 18,250 VND/L
    
    TS->>RS: GetRoadAllowance(route_id, trailer_type)
    RS-->>TS: allowance = 2,740,000 VND
    
    TS->>TS: Calculate costs<br/>fuel_cost = liters × price<br/>total_cost = sum all costs<br/>gross_profit = revenue - total_cost
    
    TS->>DB: INSERT INTO trip (...) RETURNING *
    DB-->>TS: trip record
    
    TS->>AR: CreateDebit(customer_id, trip_id, revenue, gbn)
    AR->>DB: INSERT INTO ar_transaction (type='debit')
    DB-->>AR: ar record with running_balance
    
    TS-->>API: trip + calculated fields
    API-->>Client: 201 Created {trip, auto_calculated}
```

### 5.11 API Sequence Diagram — Payment Collection

```mermaid
sequenceDiagram
    actor Client
    participant API as Handler
    participant AR as ARService
    participant DB as PostgreSQL

    Client->>API: POST /ar/transactions/credit {customer_id, amount, date}
    API->>API: Validate request
    API->>AR: RecordPayment(ctx, req)
    
    AR->>DB: BEGIN TRANSACTION
    AR->>DB: INSERT INTO ar_transaction<br/>(type='credit', amount)
    AR->>DB: SELECT SUM(CASE type='debit' THEN amount ELSE -amount END)<br/>OVER (...) AS running_balance
    AR->>DB: UPDATE ar_transaction SET running_balance = ...
    AR->>DB: COMMIT
    
    AR-->>API: transaction with updated balance
    API-->>Client: 201 Created {transaction, running_balance, remaining_debt}
```

---

## 6. Business Logic Layer

### 6.1 Trip Cost Calculation

```go
// internal/service/trip_service.go

type TripCalculator struct {
    fuelService   FuelService
    routeService  RouteService
}

type TripCalculationResult struct {
    FuelCost        decimal.Decimal
    RoadAllowance   decimal.Decimal
    TotalCost       decimal.Decimal
    GrossProfit     decimal.Decimal
    FuelRateUsed    int     // L/100km from config
    AllowanceUsed   int     // VND from route table
}

func (tc *TripCalculator) Calculate(req *CreateTripRequest) (*TripCalculationResult, error) {
    // 1. Fuel cost = liters × unit_price
    fuelCost := req.FuelLiters.Mul(req.FuelUnitPrice)
    
    // 2. Road allowance = lookup from route_allowance table
    //    based on route_id + trailer type (40ft/20ft)
    allowance, err := tc.routeService.GetAllowance(
        req.RouteID, 
        req.TrailerType, // derived from trailer_id
    )
    
    // 3. Total cost = fuel + road + salary + repair + tire + engine_oil
    totalCost := fuelCost.
        Add(allowance).
        Add(req.DriverSalary).
        Add(req.RepairCost).
        Add(req.TireCost).
        Add(req.EngineOilCost)
    
    // 4. Gross profit = revenue - total cost
    grossProfit := req.TransportRevenue.Sub(totalCost)
    
    return &TripCalculationResult{
        FuelCost:      fuelCost,
        RoadAllowance: allowance,
        TotalCost:     totalCost,
        GrossProfit:   grossProfit,
        FuelRateUsed:  fuelRate,
        AllowanceUsed: allowanceAmount,
    }, nil
}
```

### 6.2 Fuel Rate Auto-Lookup

```go
// internal/service/fuel_service.go

func (s *FuelService) GetFuelRate(truckID uuid.UUID, loadType LoadType) (int, error) {
    config, err := s.repo.GetActiveFuelConfig(truckID)
    if err != nil {
        return 0, fmt.Errorf("no fuel config for truck %s: %w", truckID, err)
    }
    
    switch loadType {
    case LoadTypeMixedOver20t:
        return config.MixedOver20t, nil
    case LoadTypeMixedUnder20t:
        return config.MixedUnder20t, nil
    case LoadTypeEmpty:
        return config.Empty, nil
    case LoadTypeCargoOver20t:
        return config.CargoOver20t, nil
    case LoadTypeCargoUnder20t:
        return config.CargoUnder20t, nil
    default:
        return 0, fmt.Errorf("unknown load type: %s", loadType)
    }
}

// ExpectedFuelLiters calculates expected consumption for a trip
func (s *FuelService) ExpectedFuelLiters(
    truckID uuid.UUID, 
    routeID uuid.UUID, 
    loadType LoadType, 
    distanceKm int,
) (decimal.Decimal, error) {
    rate, err := s.GetFuelRate(truckID, loadType)
    if err != nil {
        return decimal.Zero, err
    }
    
    // Check if Mộc Châu/Sơn La supplement applies
    route, err := s.routeRepo.GetByID(routeID)
    if route.RequiresMocChauSupplement {
        config, _ := s.repo.GetActiveFuelConfig(truckID)
        rate += config.MocChauSupplement
    }
    
    // liters = (rate L/100km) × distance_km / 100
    liters := decimal.NewFromInt(int64(rate)).
        Mul(decimal.NewFromInt(int64(distanceKm))).
        Div(decimal.NewFromInt(100))
    
    return liters, nil
}
```

### 6.3 AR Aging Calculation

```go
// internal/service/ar_service.go

type AgingBucket struct {
    Key    string          `json:"bucket"`
    Label  string          `json:"label"`
    Amount decimal.Decimal `json:"amount"`
    Count  int             `json:"count"`
}

func (s *ARService) GetAgingReport(ctx context.Context, asOfDate time.Time) (*AgingReport, error) {
    // Query all unpaid debit transactions older than asOfDate
    transactions, err := s.repo.GetUnpaidDebits(ctx, asOfDate)
    
    buckets := []AgingBucket{
        {Key: "current", Label: "< 30 days"},
        {Key: "30-60",   Label: "30-60 days"},
        {Key: "60-90",   Label: "60-90 days"},
        {Key: "90+",     Label: "> 90 days"},
    }
    
    for _, tx := range transactions {
        daysOverdue := int(asOfDate.Sub(tx.TransactionDate).Hours() / 24)
        var idx int
        switch {
        case daysOverdue < 30:
            idx = 0
        case daysOverdue < 60:
            idx = 1
        case daysOverdue < 90:
            idx = 2
        default:
            idx = 3
        }
        buckets[idx].Amount = buckets[idx].Amount.Add(tx.RemainingAmount)
        buckets[idx].Count++
    }
    
    return &AgingReport{
        AsOfDate:    asOfDate,
        TotalAmount: totalReceivable,
        Buckets:     buckets,
    }, nil
}
```

---

## 7. Authentication & Authorization

### 7.1 Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Go Backend
    participant DB as PostgreSQL
    participant RD as Redis

    User->>FE: Enter credentials
    FE->>API: POST /auth/login {username, password}
    API->>DB: SELECT * FROM user WHERE username = ?
    API->>API: bcrypt.CompareHashAndPassword()
    
    alt Valid credentials
        API->>API: Generate JWT (access + refresh)
        API->>RD: SET session:{user_id} {role, permissions} EX 24h
        API-->>FE: {access_token, refresh_token, user}
        FE->>FE: Store tokens, set Authorization header
    else Invalid credentials
        API-->>FE: 401 Unauthorized
    end
    
    Note over FE,API: Subsequent requests include<br/>Authorization: Bearer {access_token}
    
    FE->>API: GET /trips (with Bearer token)
    API->>API: JWT middleware validates token
    API->>RD: Check session:{user_id} still valid
    API->>API: Inject user context into request
    API-->>FE: 200 OK + data
```

### 7.2 RBAC with Casbin

The initial design used a hardcoded `map[Role][]string` for permissions. This works for a fixed 3-role system but breaks down when you need fine-grained resource-level checks (e.g., "can this accountant edit a trip that belongs to a truck they are not assigned to?"), dynamic policy changes without redeployment, or audit trails on permission changes. We replace it with **Casbin**, a production-grade authorization library that supports RBAC with role inheritance and attribute-based policies.

#### 7.2.1 Why Casbin Over Hand-Rolled Middleware

| Concern | Hand-rolled map | Casbin |
|---------|----------------|--------|
| Policy changes | Requires code change + redeploy | Update DB/adapter, takes effect immediately |
| Resource-level checks | Manual `if` branching in every handler | Declarative policy: `sub, obj, act` triples |
| Role inheritance | Not supported | Built-in RBAC hierarchy |
| Audit trail | Must implement manually | Policy changes logged via adapter |
| Testing | Must mock middleware per endpoint | Load `.csv` test policy, assert `Enforce()` |

#### 7.2.2 Casbin Model

```ini
# internal/auth/model.conf
# RBAC with domains: each truck can be a domain boundary

[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
```

**Explanation:**
- `sub` = user/role (e.g., `accountant`, `driver:uuid-123`)
- `dom` = domain (e.g., `fleet`, `finance`, `ar`, `truck:15C-136.31`)
- `obj` = resource (e.g., `trip`, `customer`, `fuel_rate`)
- `act` = action (e.g., `read`, `write`, `delete`, `export`)
- `g = _, _, _` = role grouping with domain support (3-arg)

#### 7.2.3 Policy Examples

```csv
# internal/auth/policy.csv
# p = sub, dom, obj, act

# Admin: full access across all domains
p, admin, *, *, *

# Accountant: can manage trips and finance
p, accountant, fleet, truck, read
p, accountant, fleet, driver, read
p, accountant, fleet, trailer, read
p, accountant, finance, trip, read
p, accountant, finance, trip, write
p, accountant, finance, fuel_price, read
p, accountant, finance, fuel_price, write
p, accountant, finance, fuel_rate, read
p, accountant, finance, route, read
p, accountant, ar, customer, read
p, accountant, ar, customer, write
p, accountant, ar, transaction, read
p, accountant, ar, transaction, write
p, accountant, ar, aging, read
p, accountant, report, *, read
p, accountant, report, *, export
p, accountant, dashboard, *, read

# Driver: can only see own trips and confirm them
p, driver, fleet, route, read
p, driver, finance, fuel_estimate, read
p, driver, finance, trip, read_own
p, driver, finance, trip, confirm_own
p, driver, dashboard, overview, read_limited

# Role grouping: assign users to roles within domains
# g = user, role, domain

g, user-uuid-thuong, admin, *
g, user-uuid-vana, accountant, *
g, user-uuid-driver1, driver, finance
```

#### 7.2.4 Enforcement Middleware

```go
// internal/middleware/authz.go

type Authorizer struct {
    enforcer *casbin.Enforcer
}

func NewAuthorizer(enforcer *casbin.Enforcer) *Authorizer {
    return &Authorizer{enforcer: enforcer}
}

// RequireAuthz returns middleware that checks (sub, dom, obj, act)
func (a *Authorizer) RequireAuthz(obj, act string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user := UserFromContext(r.Context())
            if user == nil {
                response.Error(w, ErrUnauthorized)
                return
            }

            // Determine domain from request path or context
            dom := domainFromRequest(r)

            // For driver "own" actions, inject resource ownership check
            sub := user.Role
            if user.Role == "driver" {
                sub = fmt.Sprintf("driver:%s", user.ID) // unique subject per driver
            }

            ok, err := a.enforcer.Enforce(sub, dom, obj, act)
            if err != nil {
                response.Error(w, ErrInternal)
                return
            }
            if !ok {
                response.Error(w, ErrForbidden)
                return
            }

            // Attribute-based check: driver can only access own resources
            if user.Role == "driver" && strings.HasSuffix(act, "_own") {
                resourceOwnerID := getResourceOwnerID(r)
                if resourceOwnerID != user.ID {
                    response.Error(w, ErrForbidden)
                    return
                }
            }

            next.ServeHTTP(w, r)
        })
    }
}

// domainFromRequest maps URL paths to Casbin domains
func domainFromRequest(r *http.Request) string {
    path := r.URL.Path
    switch {
    case strings.Contains(path, "/trips") || strings.Contains(path, "/fuel") || strings.Contains(path, "/routes"):
        return "finance"
    case strings.Contains(path, "/ar"):
        return "ar"
    case strings.Contains(path, "/trucks") || strings.Contains(path, "/drivers") || strings.Contains(path, "/trailers"):
        return "fleet"
    case strings.Contains(path, "/reports"):
        return "report"
    case strings.Contains(path, "/dashboard"):
        return "dashboard"
    default:
        return "*"
    }
}
```

#### 7.2.5 RBAC Decision Flow

```mermaid
flowchart TD
    REQ[Incoming Request] --> JWT[JWT Middleware<br/>Verify token]
    JWT -->|Invalid| ERR1[401 Unauthorized]
    JWT -->|Valid| CTX[Extract user context<br/>sub, role, id]
    CTX --> DOM[Determine domain<br/>from URL path]
    DOM --> ENF[Casbin Enforce<br/>sub, dom, obj, act]
    ENF -->|Deny| ERR2[403 Forbidden]
    ENF -->|Allow + own check| OWN{Driver own check?<br/>act ends with _own}
    ENF -->|Allow + no own check| PASS[→ Handler]
    OWN -->|resource.user_id != current user| ERR2
    OWN -->|resource.user_id == current user| PASS
```

#### 7.2.6 Runtime Policy Management

Admins can modify policies without redeploying via API endpoints:

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/admin/policies` | List all policies | admin |
| POST | `/admin/policies` | Add policy | admin |
| DELETE | `/admin/policies` | Remove policy | admin |
| GET | `/admin/roles` | List role assignments | admin |
| POST | `/admin/roles` | Assign user to role | admin |

The Casbin adapter persists policies to PostgreSQL, so changes survive restarts. Every policy mutation is recorded in `audit_log`.

### 7.3 JWT Token Structure

```json
{
    "sub": "user-uuid",
    "role": "accountant",
    "name": "Nguyễn Văn A",
    "iat": 1710000000,
    "exp": 1710086400,
    "type": "access"
}
```

- Access token: 24-hour expiry
- Refresh token: 7-day expiry
- Both stored in HTTP-only cookies for frontend, Bearer header for API clients

---

## 8. Background Jobs & Automation

### 8.1 Scheduler Overview

```mermaid
flowchart LR
    subgraph Cron Scheduler
        J1["Daily 08:00<br/>AR Aging Alert"]
        J2["Daily 09:00<br/>Fuel Price Reminder"]
        J3["Weekly Monday<br/>Weekly Summary Email"]
    end
    
    J1 --> Q[(Job Queue)]
    J2 --> Q
    J3 --> Q
    
    Q --> W1[Worker 1]
    Q --> W2[Worker 2]
```

### 8.2 Job Definitions

| Job | Schedule | Description |
|-----|----------|-------------|
| AR Aging Alert | Daily 08:00 | Check customers with overdue >30 days, send notification |
| Fuel Price Check | Daily 09:00 | Remind admin to update fuel price if >7 days since last update |
| Weekly Summary | Monday 09:00 | Generate weekly revenue/cost summary per truck |
| Shared Expense Split | On-demand | When a shared expense is recorded, allocate to 4 trucks |

---

## 9. Concurrency & Data Integrity

### 9.1 The Concurrency Problem in Transport Operations

NEPO's daily operations involve multiple accountants entering trips, recording payments, and updating costs — often simultaneously on the same truck's monthly data. Without proper concurrency controls, the following race conditions would occur:

| Scenario | Race Condition | Impact |
|----------|---------------|--------|
| Two accountants create trips for same truck/month | Duplicate `trip_number` or gap in sequence | Corrupted monthly records |
| Payment recorded while AR aging report is generating | Stale running balance | Incorrect overdue alerts |
| Trip cost updated while monthly summary is calculating | Summary doesn't include latest change | Wrong P&L report |
| Shared expense split while individual trip costs are being edited | Inconsistent total cost | Financial discrepancies |

### 9.2 Strategy Overview

We use a layered approach — each layer handles the concurrency concern most appropriate for it:

```mermaid
flowchart TB
    subgraph "Layer 1: Database"
        DB1[PostgreSQL Row-Level Locking<br/>SELECT ... FOR UPDATE]
        DB2[Unique Constraints<br/>truck_id + trip_number + month + year]
        DB3[Serializable Isolation<br/>for settlement generation]
    end
    
    subgraph "Layer 2: Application"
        APP1[Optimistic Locking<br/>version column on trips, ar_transactions]
        APP2[Idempotency Keys<br/>on payment recording]
        APP3[Pessimistic Locking<br/>on monthly summary generation]
    end
    
    subgraph "Layer 3: Distributed"
        DIST1[Redis Distributed Lock<br/>for cron job leader election]
        DIST2[Redis Rate Limiting<br/>per-user request throttle]
    end
    
    DB1 --> APP1
    DB2 --> APP1
    DB3 --> APP3
    APP1 --> DIST1
    APP2 --> DIST1
    APP3 --> DIST2
```

### 9.3 Optimistic Locking for Trip & AR Updates

When two accountants edit the same trip simultaneously, we want the second save to fail gracefully rather than silently overwriting the first. Optimistic locking using a `version` column achieves this without holding database locks during the read-modify-write cycle.

```sql
-- Add version column to trips and ar_transactions
ALTER TABLE trips ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ar_transactions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

```go
// internal/repository/trip_repo.go

func (r *TripRepo) Update(ctx context.Context, trip *domain.Trip) error {
    result, err := r.db.ExecContext(ctx, `
        UPDATE trips 
        SET 
            fuel_liters = $1,
            fuel_cost = $2,
            road_allowance = $3,
            total_cost = $4,
            transport_revenue = $5,
            gross_profit = $6,
            updated_at = NOW(),
            version = version + 1
        WHERE id = $7 AND version = $8
    `,
        trip.FuelLiters, trip.FuelCost, trip.RoadAllowance,
        trip.TotalCost, trip.TransportRevenue, trip.GrossProfit,
        trip.ID, trip.Version,
    )
    if err != nil {
        return fmt.Errorf("update trip: %w", err)
    }
    
    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        // Version mismatch → concurrent edit detected
        return ErrConcurrentModification
    }
    
    trip.Version++
    return nil
}
```

The frontend handles `409 Conflict` by fetching the latest version, showing a diff, and letting the user resolve the conflict:

```json
{
    "success": false,
    "error": {
        "code": "CONCURRENT_MODIFICATION",
        "message": "This trip was modified by another user. Please refresh and retry.",
        "detail": {
            "current_version": 5,
            "your_version": 4,
            "modified_by": "Nguyễn Văn A",
            "modified_at": "2024-03-15T14:30:00Z"
        }
    }
}
```

### 9.4 Idempotency for Payment Recording

Recording a payment twice is a critical bug — it would double-credit the customer's balance. We prevent this with an idempotency key on every payment request.

```mermaid
sequenceDiagram
    actor A1 as Accountant 1
    actor A2 as Accountant 2
    participant API as Go Backend
    participant DB as PostgreSQL

    A1->>API: POST /ar/transactions/credit<br/>{customer_id, amount, idempotency_key: "PAY-2024-0315-001"}
    API->>DB: BEGIN
    API->>DB: INSERT INTO ar_transaction<br/>(idempotency_key = "PAY-2024-0315-001")
    DB-->>API: OK (1 row inserted)
    API->>DB: COMMIT
    API-->>A1: 201 Created {transaction}

    Note over A2: Retry or double-click
    A2->>API: POST /ar/transactions/credit<br/>{customer_id, amount, idempotency_key: "PAY-2024-0315-001"}
    API->>DB: BEGIN
    API->>DB: INSERT INTO ar_transaction<br/>(idempotency_key = "PAY-2024-0315-001")
    DB-->>API: UNIQUE CONSTRAINT VIOLATION
    API->>DB: ROLLBACK
    API->>DB: SELECT * FROM ar_transaction<br/>WHERE idempotency_key = "PAY-2024-0315-001"
    API-->>A2: 200 OK {existing transaction}
```

```go
// internal/service/ar_service.go

func (s *ARService) RecordPayment(ctx context.Context, req *RecordPaymentRequest) (*ARTransaction, error) {
    // Check idempotency: if this key was already processed, return existing record
    if req.IdempotencyKey != "" {
        existing, err := s.repo.GetByIdempotencyKey(ctx, req.IdempotencyKey)
        if err == nil && existing != nil {
            slog.Info("idempotent request detected", "key", req.IdempotencyKey)
            return existing, nil  // Return the existing record, no double-credit
        }
    }

    tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
    if err != nil {
        return nil, fmt.Errorf("begin tx: %w", err)
    }
    defer tx.Rollback()

    // Insert transaction with idempotency key
    arTx, err := s.repo.CreateWithTx(ctx, tx, &ARTransaction{
        CustomerID:      req.CustomerID,
        TransactionType: "credit",
        Amount:          req.Amount,
        IdempotencyKey:  req.IdempotencyKey,
        TransactionDate: req.Date,
    })
    if err != nil {
        if isUniqueViolation(err, "idempotency_key") {
            // Concurrent insert won — fetch and return existing
            existing, _ := s.repo.GetByIdempotencyKey(ctx, req.IdempotencyKey)
            return existing, nil
        }
        return nil, fmt.Errorf("create ar transaction: %w", err)
    }

    // Recalculate running balance using window function
    if err := s.recalculateRunningBalance(ctx, tx, req.CustomerID); err != nil {
        return nil, fmt.Errorf("recalculate balance: %w", err)
    }

    if err := tx.Commit(); err != nil {
        return nil, fmt.Errorf("commit: %w", err)
    }

    return arTx, nil
}
```

### 9.5 Pessimistic Locking for Monthly Summary

When generating the monthly summary, we must prevent any trip modifications for that truck/month while the aggregation is running. This uses `SELECT ... FOR UPDATE` to lock the trip rows:

```go
// internal/repository/trip_repo.go

func (r *TripRepo) LockAndSum(ctx context.Context, truckID uuid.UUID, month, year int) (*MonthlySummary, error) {
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return nil, err
    }
    defer tx.Rollback()

    // Lock all trip rows for this truck/month
    _, err = tx.ExecContext(ctx, `
        SELECT id FROM trips 
        WHERE truck_id = $1 AND month = $2 AND year = $3 AND archived_at IS NULL
        FOR UPDATE
    `, truckID, month, year)
    if err != nil {
        return nil, fmt.Errorf("lock trips: %w", err)
    }

    // Aggregate while rows are locked — no concurrent modification possible
    var summary MonthlySummary
    err = tx.QueryRowContext(ctx, `
        SELECT 
            SUM(fuel_liters), SUM(fuel_cost), SUM(road_allowance),
            SUM(driver_salary), SUM(repair_cost), SUM(tire_cost), SUM(engine_oil_cost),
            SUM(total_cost), SUM(transport_revenue), SUM(gross_profit)
        FROM trips
        WHERE truck_id = $1 AND month = $2 AND year = $3 AND archived_at IS NULL
    `, truckID, month, year).Scan(
        &summary.TotalFuelLiters, &summary.TotalFuelCost, &summary.TotalRoadAllowance,
        &summary.TotalDriverSalary, &summary.TotalRepair, &summary.TotalTire, &summary.TotalEngineOil,
        &summary.TotalCost, &summary.TotalRevenue, &summary.GrossProfit,
    )
    
    if err != nil {
        return nil, fmt.Errorf("aggregate: %w", err)
    }

    return &summary, nil
}
```

### 9.6 Distributed Lock for Cron Leader Election

When running multiple API instances, only one instance should execute cron jobs. We use Redis-based distributed locking:

```go
// internal/worker/scheduler.go

import "github.com/go-redsync/redsync/v4"

func (s *Scheduler) RunWithLock(ctx context.Context, jobName string, fn func() error) error {
    mutex := s.redsync.NewMutex(
        fmt.Sprintf("nepo:cron:%s", jobName),
        redsync.WithExpiry(10*time.Minute),
        redsync.WithTries(1), // Only one instance should run
    )

    if err := mutex.Lock(); err != nil {
        slog.Info("cron job already running on another instance", "job", jobName)
        return nil // Not an error — another instance is handling it
    }
    defer mutex.Unlock()

    return fn()
}
```

### 9.7 Concurrency Strategy Summary

| Operation | Strategy | Failure Mode |
|-----------|----------|-------------|
| Create trip | Unique constraint on (truck_id, trip_number, month, year) | 409 Conflict on duplicate |
| Update trip | Optimistic locking (version column) | 409 Conflict, user refreshes |
| Delete trip | Soft delete + version check | 409 if concurrently modified |
| Record payment | Idempotency key + serializable isolation | Returns existing on duplicate |
| Generate monthly summary | Pessimistic locking (SELECT FOR UPDATE) | Blocks until writes complete |
| AR running balance | Window function on read, recalculated in same TX as write | Always consistent |
| Cron job execution | Redis distributed lock | Only 1 instance runs |
| API rate limiting | Redis sliding window | 429 Too Many Requests |

---

## 10. AI Integration

### 10.1 Why AI in a Transport Management System

At first glance, a container transport company's backend seems purely transactional — CRUD operations on trips, costs, and invoices. However, NEPO's operational data contains patterns that humans currently detect manually by scanning spreadsheets. AI can automate pattern recognition, provide predictive insights, and reduce the cognitive load on accountants and managers. We integrate Google Gemini as the AI engine, called from the Go backend via its REST API.

### 10.2 AI Integration Architecture

```mermaid
flowchart TB
    subgraph "Go Backend"
        AISVC[AI Service<br/>internal/service/ai_service.go]
        PROMPT[Prompt Templates<br/>internal/ai/prompts/]
        JOB1[Background Worker<br/>AI analysis cron]
    end
    
    subgraph "Google Gemini API"
        GEM[Gemini 2.5 Flash<br/>gemini-2.5-flash-preview-05-20]
    end
    
    subgraph "Data Sources"
        DB[(PostgreSQL<br/>Trips, AR, Costs)]
    end
    
    JOB1 --> AISVC
    AISVC -->|Prepared context| PROMPT
    PROMPT -->|Structured prompt| GEM
    GEM -->|JSON response| AISVC
    AISVC --> DB
    DB -->|Aggregated data| PROMPT
```

### 10.3 AI Feature Matrix

| Feature | Trigger | AI Task | Business Value |
|---------|---------|---------|---------------|
| **Smart Route Matching** | Trip creation | Fuzzy-match free-text route to 38-route table | Eliminates manual lookup, reduces errors |
| **Fuel Anomaly Detection** | After trip save | Compare actual fuel vs expected rate, flag outliers | Catch fuel theft or inefficiency early |
| **AR Collection Forecast** | Daily cron | Predict which customers will pay late | Prioritize collection efforts |
| **Cost Optimization Suggestions** | Weekly cron | Analyze cost patterns, suggest savings | Reduce operating costs |
| **Natural Language Query** | User chat input | Convert Vietnamese question to SQL, return answer | Self-service reporting |
| **Invoice OCR** | File upload | Extract GBN/invoice data from scanned documents | Eliminate manual data entry |

### 10.4 Feature Deep Dive: Smart Route Matching

Currently, when an accountant enters a trip, they must manually select the route from a dropdown of 38 options. The route names in the Excel sheets are free-text (e.g., "HP - Mộc Châu, Sơn La", "HP - MC", "HP → Mộc Châu") and often abbreviated. Gemini can fuzzy-match any route description to the correct route ID.

```go
// internal/service/ai_service.go

type AIService struct {
    geminiClient *GeminiClient
    routeRepo    RouteRepository
    apiKey       string
}

func (s *AIService) MatchRoute(
    ctx context.Context, 
    input string, // e.g. "HP - MC" or "Hải Phòng đi Mộc Châu"
) (*RouteMatch, error) {
    routes, err := s.routeRepo.ListActive(ctx)
    if err != nil {
        return nil, err
    }

    // Build route catalog as context for the AI
    routeCatalog := make([]string, len(routes))
    for i, r := range routes {
        routeCatalog[i] = fmt.Sprintf("ID:%s | %s", r.ID, r.Description)
    }

    prompt := fmt.Sprintf(`You are a route matching assistant for a Vietnamese container transport company.
Given a route description, match it to the correct route from the catalog below.
Return a JSON object with: {"route_id": "<uuid>", "confidence": <0.0-1.0>, "reason": "<brief explanation>"}
If no match is found, return {"route_id": null, "confidence": 0, "reason": "no match"}.

Route catalog:
%s

Input route: %s`, strings.Join(routeCatalog, "\n"), input)

    resp, err := s.geminiClient.Generate(ctx, prompt)
    if err != nil {
        return nil, fmt.Errorf("gemini generate: %w", err)
    }

    var match RouteMatch
    if err := json.Unmarshal([]byte(resp), &match); err != nil {
        return nil, fmt.Errorf("parse ai response: %w", err)
    }

    // Only auto-apply if confidence is high; otherwise return as suggestion
    if match.Confidence >= 0.9 {
        match.AutoApplied = true
    }
    
    return &match, nil
}
```

### 10.5 Feature Deep Dive: Fuel Anomaly Detection

After every trip is saved, the system compares actual fuel consumption against the expected rate from the fuel rate config. If the actual consumption deviates by more than 15%, Gemini analyzes the context (route, load type, weather season) and generates a human-readable explanation.

```go
// internal/service/ai_service.go

func (s *AIService) AnalyzeFuelAnomaly(
    ctx context.Context,
    trip *domain.Trip,
    expectedLiters decimal.Decimal,
) (*FuelAnomalyReport, error) {
    actualLiters := trip.FuelLiters
    deviation := actualLiters.Sub(expectedLiters).Div(expectedLiters).Abs()
    
    // Only call AI if deviation exceeds threshold
    if deviation.LessThan(decimal.NewFromFloat(0.15)) {
        return nil, nil // Not anomalous
    }

    prompt := fmt.Sprintf(`Analyze this fuel consumption anomaly for a container truck in Vietnam:

Truck: %s
Route: %s (distance: %d km)
Load type: %s
Expected fuel: %s liters (rate: based on fuel config)
Actual fuel: %s liters
Deviation: %s%%

Provide a JSON response:
{
  "severity": "low|medium|high",
  "possible_causes": ["cause1", "cause2"],
  "recommendation": "what to check",
  "is_theft_suspected": true/false
}

Consider: Vietnam road conditions, Mộc Châu mountain routes add +3L/100km, 
traffic in Hải Phòng port area, seasonal AC usage.`,
        trip.TruckID, trip.RouteID, trip.DistanceKm, trip.LoadType,
        expectedLiters.String(), actualLiters.String(),
        deviation.Mul(decimal.NewFromInt(100)).StringFixed(1),
    )

    resp, err := s.geminiClient.Generate(ctx, prompt)
    if err != nil {
        return nil, err
    }

    var report FuelAnomalyReport
    json.Unmarshal([]byte(resp), &report)
    report.TripID = trip.ID
    report.DeviationPct = deviation
    return &report, nil
}
```

After the analysis, the report is stored and surfaced to the admin:

```json
{
    "trip_id": "uuid",
    "severity": "medium",
    "expected_liters": 108.8,
    "actual_liters": 138.2,
    "deviation_pct": "27.0%",
    "possible_causes": [
        "Extended idling at Hải Phòng port waiting area",
        "Route includes Mộc Châu mountain segment — verify supplement was applied",
        "Possible underreporting of distance"
    ],
    "recommendation": "Verify actual route taken vs planned route. Check GPS logs for extended idle time.",
    "is_theft_suspected": false
}
```

### 10.6 Feature Deep Dive: AR Collection Forecast

Every day at 08:00, the system runs an AI-powered analysis of all overdue accounts receivable, predicting which customers are likely to pay and when, so the accountant can prioritize collection calls.

```go
// internal/worker/ar_collection_forecast.go

func (w *ARCollectionForecastWorker) Run(ctx context.Context) error {
    // Get all overdue AR with payment history
    overdue, err := w.arRepo.GetOverdueWithHistory(ctx)
    if err != nil {
        return err
    }

    // Build context for each customer
    for _, customer := range overdue {
        prompt := fmt.Sprintf(`Predict payment behavior for this customer:

Customer: %s
Total outstanding: %s VND
Overdue invoices: %d
Oldest overdue: %s
Average payment delay (historical): %d days
Payment pattern: %s

Return JSON:
{
  "payment_probability_30d": <0.0-1.0>,
  "estimated_payment_date": "YYYY-MM-DD",
  "collection_strategy": "call|email|visit|legal",
  "risk_level": "low|medium|high|critical",
  "talking_points": ["point1", "point2"]
}`,
            customer.Name,
            customer.TotalOutstanding,
            customer.OverdueCount,
            customer.OldestOverdue,
            customer.AvgPaymentDelay,
            customer.PaymentPattern,
        )

        resp, err := w.aiService.GeminiGenerate(ctx, prompt)
        if err != nil {
            slog.Error("ai forecast failed", "customer", customer.Name, "error", err)
            continue
        }

        var forecast CollectionForecast
        json.Unmarshal([]byte(resp), &forecast)
        
        // Store forecast for dashboard display
        w.forecastRepo.Save(ctx, customer.ID, &forecast)
    }

    return nil
}
```

### 10.7 Feature Deep Dive: Natural Language Query

Accountants often need quick answers like "Xe 136 tháng 3 doanh thu bao nhiêu?" (How much revenue did truck 136 make in March?). Instead of navigating to the reports page, filtering, and waiting, they type the question and get an instant answer.

```go
// internal/service/ai_service.go

func (s *AIService) NaturalLanguageQuery(
    ctx context.Context,
    question string, // Vietnamese natural language
    userID uuid.UUID,
) (*NLQueryResult, error) {
    // Get database schema context
    schemaCtx := s.getSchemaContext()
    
    prompt := fmt.Sprintf(`You are a SQL assistant for a Vietnamese container transport company database.
Database schema:
%s

The user asks: %s

Generate a PostgreSQL query to answer this question. Return JSON:
{
  "sql": "<safe SELECT query>",
  "explanation": "<Vietnamese explanation of what the query does>",
  "is_safe": true
}

Rules:
- Only generate SELECT queries (no INSERT, UPDATE, DELETE)
- Never expose internal UUIDs to the user
- Use VND currency formatting
- All amounts are in VND
- If the question is ambiguous, explain the ambiguity
`, schemaCtx, question)

    resp, err := s.geminiClient.Generate(ctx, prompt)
    if err != nil {
        return nil, err
    }

    var result NLQueryResult
    json.Unmarshal([]byte(resp), &result)
    
    // Safety: only execute if is_safe and is SELECT-only
    if !result.IsSafe || !strings.HasPrefix(strings.TrimSpace(strings.ToUpper(result.SQL)), "SELECT") {
        return &NLQueryResult{
            Explanation: "Xin lỗi, tôi không thể thực hiện truy vấn này vì lý do bảo mật.",
        }, nil
    }

    // Execute the generated SQL with row limit
    rows, err := s.db.QueryContext(ctx, result.SQL + " LIMIT 100")
    if err != nil {
        return nil, fmt.Errorf("execute generated sql: %w", err)
    }
    defer rows.Close()

    // Convert results to user-friendly format
    result.Data = s.rowsToMap(rows)
    return &result, nil
}
```

**Safety guardrails** are critical for this feature:
- Only `SELECT` queries are allowed (validated in Go, not just in the prompt)
- Row limit of 100 enforced
- Queries run under a read-only database user
- Results never expose internal UUIDs — the AI formats the answer in natural Vietnamese
- Every generated query is logged in `audit_log` for review

### 10.8 Feature Deep Dive: Invoice OCR

When an accountant uploads a scanned invoice or delivery note (GBN), Gemini Vision extracts the structured data automatically:

```go
// internal/service/ai_service.go

func (s *AIService) ExtractInvoiceData(
    ctx context.Context,
    imageData []byte, // Base64-encoded image
) (*InvoiceExtraction, error) {
    prompt := `Extract data from this Vietnamese transport invoice/delivery note.
Return JSON:
{
  "invoice_number": "<số GBN>",
  "customer_name": "<tên khách hàng>",
  "amount": <total in VND>,
  "date": "YYYY-MM-DD",
  "container_number": "<số cont>",
  "route": "<tuyến đường>",
  "confidence": <0.0-1.0>
}`

    resp, err := s.geminiClient.GenerateWithImage(ctx, prompt, imageData)
    if err != nil {
        return nil, err
    }

    var extraction InvoiceExtraction
    json.Unmarshal([]byte(resp), &extraction)
    return &extraction, nil
}
```

### 10.9 Gemini API Client

```go
// internal/ai/gemini_client.go

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

type GeminiClient struct {
    apiKey     string
    model      string
    httpClient *http.Client
    baseURL    string
}

func NewGeminiClient(apiKey string) *GeminiClient {
    return &GeminiClient{
        apiKey: apiKey,
        model:  "gemini-2.5-flash-preview-05-20",
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
        },
        baseURL: "https://generativelanguage.googleapis.com/v1beta",
    }
}

type geminiRequest struct {
    Contents []content `json:"contents"`
    GenerationConfig genConfig `json:"generationConfig"`
}

type content struct {
    Parts []part `json:"parts"`
}

type part struct {
    Text string `json:"text,omitempty"`
    InlineData *inlineData `json:"inlineData,omitempty"`
}

type inlineData struct {
    MimeType string `json:"mimeType"`
    Data     string `json:"data"`
}

type genConfig struct {
    Temperature     float64 `json:"temperature"`
    MaxOutputTokens int     `json:"maxOutputTokens"`
    ResponseMimeType string `json:"responseMimeType"`
}

func (c *GeminiClient) Generate(ctx context.Context, prompt string) (string, error) {
    reqBody := geminiRequest{
        Contents: []content{{
            Parts: []part{{Text: prompt}},
        }},
        GenerationConfig: genConfig{
            Temperature:      0.2, // Low for structured extraction
            MaxOutputTokens:  2048,
            ResponseMimeType: "application/json",
        },
    }

    body, _ := json.Marshal(reqBody)
    url := fmt.Sprintf("%s/models/%s:generateContent?key=%s", c.baseURL, c.model, c.apiKey)

    req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return "", fmt.Errorf("gemini api call: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        respBody, _ := io.ReadAll(resp.Body)
        return "", fmt.Errorf("gemini api error %d: %s", resp.StatusCode, string(respBody))
    }

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)

    // Extract text from candidates[0].content.parts[0].text
    candidates, ok := result["candidates"].([]interface{})
    if !ok || len(candidates) == 0 {
        return "", fmt.Errorf("no candidates in gemini response")
    }
    content := candidates[0].(map[string]interface{})["content"].(map[string]interface{})
    parts := content["parts"].([]interface{})
    return parts[0].(map[string]interface{})["text"].(string), nil
}

func (c *GeminiClient) GenerateWithImage(ctx context.Context, prompt string, imageData []byte) (string, error) {
    import_b64 := base64.StdEncoding.EncodeToString(imageData)
    
    reqBody := geminiRequest{
        Contents: []content{{
            Parts: []part{
                {Text: prompt},
                {InlineData: &inlineData{
                    MimeType: "image/png",
                    Data:     import_b64,
                }},
            },
        }},
        GenerationConfig: genConfig{
            Temperature:      0.1,
            MaxOutputTokens:  2048,
            ResponseMimeType: "application/json",
        },
    }
    // ... same HTTP call as Generate
    return c.Generate(ctx, prompt) // simplified; real impl sends multimodal request
}
```

### 10.10 AI Configuration

```yaml
# Added to config.yaml
ai:
  provider: "gemini"
  api_key: "${GEMINI_API_KEY}"
  model: "gemini-2.5-flash-preview-05-20"
  timeout: 30s
  features:
    route_matching: true
    fuel_anomaly: true
    ar_forecast: true
    natural_language_query: true
    invoice_ocr: true
  thresholds:
    fuel_anomaly_deviation_pct: 15
    route_match_auto_apply_confidence: 0.9
    nl_query_row_limit: 100
  rate_limits:
    requests_per_minute: 15
    tokens_per_day: 1000000
```

### 10.11 Cost & Performance Considerations

| Factor | Detail |
|--------|--------|
| **Gemini 2.5 Flash pricing** | ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens (as of 2025) |
| **Average prompt size** | Route matching: ~500 tokens, Fuel anomaly: ~300 tokens, AR forecast: ~800 tokens per customer |
| **Estimated daily cost** | ~$0.05–0.15/day for NEPO's volume (4 trucks, ~20 trips/day, 48 customers) |
| **Latency** | Route matching: ~1-2s, Fuel anomaly: ~2-3s, AR forecast: ~3-5s per customer |
| **Fallback** | If Gemini API is down, all AI features degrade gracefully — manual selection still works |
| **Caching** | Route matching results cached in Redis (TTL 24h), same input → cache hit |
| **Safety** | NL queries run under read-only DB user; all AI outputs are suggestions, not auto-applied (except route matching at >90% confidence) |

---

## 11. Error Handling

### 11.1 Error Type Hierarchy

```go
// internal/pkg/response/errors.go

type AppError struct {
    Code       string `json:"code"`
    Message    string `json:"message"`
    Detail     string `json:"detail,omitempty"`
    HTTPStatus int    `json:"-"`
}

func (e *AppError) Error() string { return e.Message }

// Predefined errors
var (
    ErrNotFound       = &AppError{Code: "NOT_FOUND", Message: "Resource not found", HTTPStatus: 404}
    ErrUnauthorized   = &AppError{Code: "UNAUTHORIZED", Message: "Authentication required", HTTPStatus: 401}
    ErrForbidden      = &AppError{Code: "FORBIDDEN", Message: "Insufficient permissions", HTTPStatus: 403}
    ErrBadRequest     = &AppError{Code: "BAD_REQUEST", Message: "Invalid request", HTTPStatus: 400}
    ErrConflict       = &AppError{Code: "CONFLICT", Message: "Resource conflict", HTTPStatus: 409}
    ErrInternal       = &AppError{Code: "INTERNAL", Message: "Internal server error", HTTPStatus: 500}
)

// Domain-specific errors
var (
    ErrTripAlreadyConfirmed  = &AppError{Code: "TRIP_CONFIRMED", Message: "Trip already confirmed", HTTPStatus: 409}
    ErrInvalidFuelRate       = &AppError{Code: "INVALID_FUEL_RATE", Message: "No fuel rate config for this truck", HTTPStatus: 400}
    ErrRouteNotFound         = &AppError{Code: "ROUTE_NOT_FOUND", Message: "Route not in allowance table", HTTPStatus: 404}
    ErrAROverpayment         = &AppError{Code: "AR_OVERPAYMENT", Message: "Payment exceeds outstanding balance", HTTPStatus: 400}
)
```

### 11.2 Standard Error Response

```json
{
    "success": false,
    "data": null,
    "error": {
        "code": "ROUTE_NOT_FOUND",
        "message": "Route not in allowance table",
        "detail": "No route matching 'HP - Điện Biên Phủ' found. Available routes: 38."
    }
}
```

### 11.3 Validation Error Response

```json
{
    "success": false,
    "data": null,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Request validation failed",
        "detail": {
            "fuel_liters": "must be greater than 0",
            "transport_revenue": "required field missing"
        }
    }
}
```

---

## 12. Configuration & Deployment

### 12.1 Configuration

```yaml
# config.yaml
server:
  host: "0.0.0.0"
  port: 8080
  read_timeout: 10s
  write_timeout: 30s

database:
  host: "${DB_HOST:localhost}"
  port: 5432
  name: "nepo"
  user: "${DB_USER:nepo}"
  password: "${DB_PASSWORD}"
  max_open_conns: 25
  max_idle_conns: 10
  conn_max_lifetime: 5m

redis:
  addr: "${REDIS_ADDR:localhost:6379}"
  password: "${REDIS_PASSWORD:}"
  db: 0

jwt:
  access_ttl: 24h
  refresh_ttl: 168h
  secret: "${JWT_SECRET}"

storage:
  type: "s3"  # or "local"
  endpoint: "${S3_ENDPOINT:}"
  bucket: "${S3_BUCKET:nepo-uploads}"
  access_key: "${S3_ACCESS_KEY:}"
  secret_key: "${S3_SECRET_KEY:}"

business:
  shared_expense_truck_count: 4
  currency: "VND"
  toll_20ft_per_station: 55000

scheduler:
  enabled: true
  ar_aging_alert_cron: "0 8 * * *"           # Daily 08:00
  fuel_price_check_cron: "0 9 * * *"         # Daily 09:00
  weekly_summary_cron: "0 9 * * 1"           # Monday 09:00
```

### 12.2 Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=postgres
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_ADDR=redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: nepo
      POSTGRES_USER: nepo
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nepo"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  migrate:
    build: 
      context: .
      dockerfile: Dockerfile.migrate
    command: ["-path", "/migrations", "-database", "postgres://nepo:${DB_PASSWORD}@postgres:5432/nepo?sslmode=disable", "up"]
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
  redisdata:
```

### 12.3 Dockerfile

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /nepo-api ./cmd/api

# Runtime stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Ho_Chi_Minh

COPY --from=builder /nepo-api /usr/local/bin/nepo-api
COPY config.yaml /etc/nepo/config.yaml

EXPOSE 8080
CMD ["nepo-api", "--config", "/etc/nepo/config.yaml"]
```

### 12.4 Makefile

```makefile
.PHONY: help dev build test migrate seed lint

help: ## Show this help
        @grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Run with hot reload
        docker compose up --build

build: ## Build binary
        CGO_ENABLED=0 go build -o bin/nepo-api ./cmd/api

test: ## Run tests
        go test -v -race -coverprofile=coverage.out ./...

migrate-up: ## Run migrations up
        go run ./cmd/migrate --direction=up

migrate-down: ## Rollback last migration
        go run ./cmd/migrate --direction=down

seed: ## Seed reference data (fuel rates, routes)
        go run ./cmd/seed

lint: ## Run linters
        golangci-lint run ./...

docker-up: ## Start all services
        docker compose up -d

docker-down: ## Stop all services
        docker compose down

docker-logs: ## Follow API logs
        docker compose logs -f api
```

---

## 13. Data Migration Strategy

### 13.1 Migration Pipeline

```mermaid
flowchart TD
    A[Excel Source Files] --> B[Python ETL Script]
    B --> C[Normalized CSV/JSON]
    C --> D[Go Seed CLI]
    D --> E[PostgreSQL]
    
    A1[Xe 15C-*.xlsx<br/>310+ monthly sheets] --> B
    A2[Dinh muc dau.xlsx<br/>4 fuel configs] --> B
    A3[DINH MUC TIEN DI DUONG.xlsx<br/>38 routes] --> B
    A4[CONG NO PHAI THU 2025.xlsx<br/>48 customer sheets] --> B
    
    B --> C1[trips.json<br/>~8,000 rows]
    B --> C2[fuel_rates.json<br/>4 configs]
    B --> C3[routes.json<br/>38 routes]
    B --> C4[ar_transactions.json<br/>~3,000 rows]
    B --> C5[customers.json<br/>48 customers]
```

### 13.2 Excel Import Challenges

| Challenge | Solution |
|-----------|----------|
| Fuel unit price embedded in formula per cell | Python ETL extracts the multiplier from formula string (e.g., `=G8*23630` → price=23630) |
| Merged cells in CONG NO source sheet | openpyxl reads merged cell ranges, fills down values |
| Route matching is free-text | Fuzzy matching with manual review queue for unmatched routes |
| Early sheets have fewer columns | Schema allows NULL for columns not present in historical data |
| Shared expenses not explicitly marked | ETL identifies rows with no trip number + divisible-by-4 amounts |
| Cumulative profit across sheet boundaries | Calculated server-side from stored trip data, not imported |

### 13.3 Validation After Import

```sql
-- Cross-check: total revenue per truck per month must match Excel summary
SELECT truck_id, month, year, SUM(transport_revenue) as total_revenue
FROM trip
WHERE archived_at IS NULL
GROUP BY truck_id, month, year
ORDER BY truck_id, year, month;

-- Cross-check: AR running balance must equal opening + debits - credits
SELECT customer_id, 
       SUM(CASE WHEN transaction_type='debit' THEN amount ELSE 0 END) as total_debits,
       SUM(CASE WHEN transaction_type='credit' THEN amount ELSE 0 END) as total_credits,
       SUM(CASE WHEN transaction_type='debit' THEN amount ELSE -amount END) as calculated_balance
FROM ar_transaction
GROUP BY customer_id;
```

---

## Appendix A: Database Migration — Initial Schema

```sql
-- migrations/000001_init_schema.up.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ USERS & AUTH ============

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'accountant', 'driver')),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============ FLEET ============

CREATE TABLE trucks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    engine_type VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE trailers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    trailer_type VARCHAR(10) NOT NULL CHECK (trailer_type IN ('40ft', '20ft')),
    truck_id UUID REFERENCES trucks(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    license_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============ FUEL CONFIG ============

CREATE TABLE fuel_rate_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    truck_id UUID NOT NULL REFERENCES trucks(id),
    mixed_over_20t INTEGER NOT NULL,
    mixed_under_20t INTEGER NOT NULL,
    empty_rate INTEGER NOT NULL,
    cargo_over_20t INTEGER NOT NULL,
    cargo_under_20t INTEGER NOT NULL,
    moc_chau_supplement INTEGER NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE fuel_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    effective_date DATE NOT NULL,
    price_per_liter DECIMAL(12,2) NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(effective_date)
);

-- ============ ROUTES & ALLOWANCES ============

CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    description VARCHAR(255) NOT NULL,
    full_allowance INTEGER NOT NULL,
    toll_deduction INTEGER NOT NULL DEFAULT 0,
    surcharge INTEGER NOT NULL DEFAULT 0,
    allowance_40ft INTEGER NOT NULL,
    allowance_20ft INTEGER NOT NULL,
    requires_moc_chau_supplement BOOLEAN NOT NULL DEFAULT false,
    combined_return_surcharge INTEGER NOT NULL DEFAULT 300000,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE toll_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES routes(id),
    station_name VARCHAR(100) NOT NULL,
    toll_40ft INTEGER NOT NULL,
    toll_20ft INTEGER NOT NULL,
    highway VARCHAR(20),
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============ TRIPS ============

CREATE TYPE load_type AS ENUM (
    'mixed_over_20t', 
    'mixed_under_20t', 
    'empty', 
    'cargo_over_20t', 
    'cargo_under_20t'
);

CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_number INTEGER NOT NULL,
    truck_id UUID NOT NULL REFERENCES trucks(id),
    driver_id UUID REFERENCES drivers(id),
    route_id UUID REFERENCES routes(id),
    trailer_id UUID REFERENCES trailers(id),
    trip_date DATE NOT NULL,
    description TEXT,
    container_number VARCHAR(50),
    load_type load_type NOT NULL DEFAULT 'mixed_over_20t',
    distance_km INTEGER,
    
    -- Fuel
    fuel_liters DECIMAL(10,2),
    fuel_unit_price DECIMAL(12,2) NOT NULL,
    fuel_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
    
    -- Other costs
    road_allowance DECIMAL(14,2) NOT NULL DEFAULT 0,
    driver_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
    repair_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
    tire_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
    engine_oil_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
    
    -- Totals
    total_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
    transport_revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
    gross_profit DECIMAL(14,2) NOT NULL DEFAULT 0,
    
    -- Period
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP,
    
    UNIQUE(truck_id, trip_number, month, year)
);

-- ============ TRIP EXTRA COSTS ============

CREATE TABLE trip_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id),
    cost_type VARCHAR(50) NOT NULL,
    description TEXT,
    amount DECIMAL(14,2) NOT NULL,
    split_rule VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (split_rule IN ('none', 'equal_4', 'custom')),
    custom_ratios JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============ CUSTOMERS & AR ============

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    tax_code VARCHAR(50),
    address TEXT,
    phone VARCHAR(20),
    contact_person VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ar_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    trip_id UUID REFERENCES trips(id),
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
    gbn_reference VARCHAR(100),
    amount DECIMAL(14,2) NOT NULL,
    running_balance DECIMAL(14,2),
    description TEXT,
    transaction_date DATE NOT NULL,
    due_date DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Idempotency key for payment recording
    idempotency_key VARCHAR(100) UNIQUE
);

-- ============ MONTHLY SUMMARY ============

CREATE TABLE monthly_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    truck_id UUID NOT NULL REFERENCES trucks(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_fuel_liters DECIMAL(10,2),
    total_fuel_cost DECIMAL(14,2),
    total_road_allowance DECIMAL(14,2),
    total_driver_salary DECIMAL(14,2),
    total_repair DECIMAL(14,2),
    total_tire DECIMAL(14,2),
    total_engine_oil DECIMAL(14,2),
    total_cost DECIMAL(14,2),
    total_revenue DECIMAL(14,2),
    gross_profit DECIMAL(14,2),
    cumulative_profit_ytd DECIMAL(14,2),
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(truck_id, month, year)
);

-- ============ AUDIT LOG ============

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Appendix B: API Endpoint Summary

| Category | Method | Path | Auth | Roles |
|----------|--------|------|------|-------|
| **Auth** | POST | `/api/v1/auth/login` | None | — |
| | POST | `/api/v1/auth/refresh` | JWT | Any |
| | POST | `/api/v1/auth/change-password` | JWT | Any |
| **Fleet** | GET | `/api/v1/trucks` | JWT | admin, accountant |
| | GET | `/api/v1/trucks/:id` | JWT | admin, accountant |
| | PUT | `/api/v1/trucks/:id` | JWT | admin |
| | GET | `/api/v1/trucks/:id/fuel-config` | JWT | admin, accountant |
| | PUT | `/api/v1/trucks/:id/fuel-config` | JWT | admin |
| | GET | `/api/v1/trailers` | JWT | admin, accountant |
| | PUT | `/api/v1/trailers/:id/assign` | JWT | admin |
| | GET | `/api/v1/drivers` | JWT | admin, accountant |
| | POST | `/api/v1/drivers` | JWT | admin |
| | PUT | `/api/v1/drivers/:id` | JWT | admin |
| **Trips** | GET | `/api/v1/trips` | JWT | admin, accountant |
| | POST | `/api/v1/trips` | JWT | admin, accountant |
| | GET | `/api/v1/trips/:id` | JWT | admin, accountant, driver |
| | PUT | `/api/v1/trips/:id` | JWT | admin, accountant |
| | DELETE | `/api/v1/trips/:id` | JWT | admin |
| | POST | `/api/v1/trips/batch` | JWT | admin, accountant |
| | GET | `/api/v1/trips/monthly-summary` | JWT | admin, accountant |
| **Fuel** | GET | `/api/v1/fuel/prices` | JWT | admin, accountant |
| | POST | `/api/v1/fuel/prices` | JWT | admin |
| | GET | `/api/v1/fuel/prices/latest` | JWT | admin, accountant |
| | GET | `/api/v1/fuel/rates` | JWT | admin, accountant |
| | PUT | `/api/v1/fuel/rates/:truck_id` | JWT | admin |
| | GET | `/api/v1/fuel/calculate` | JWT | admin, accountant, driver |
| **Routes** | GET | `/api/v1/routes` | JWT | admin, accountant, driver |
| | GET | `/api/v1/routes/:id` | JWT | admin, accountant, driver |
| | POST | `/api/v1/routes` | JWT | admin |
| | PUT | `/api/v1/routes/:id` | JWT | admin |
| | GET | `/api/v1/routes/lookup` | JWT | admin, accountant, driver |
| **AR** | GET | `/api/v1/ar/customers` | JWT | admin, accountant |
| | GET | `/api/v1/ar/customers/:id` | JWT | admin, accountant |
| | POST | `/api/v1/ar/customers` | JWT | admin, accountant |
| | GET | `/api/v1/ar/transactions` | JWT | admin, accountant |
| | POST | `/api/v1/ar/transactions/debit` | JWT | admin, accountant |
| | POST | `/api/v1/ar/transactions/credit` | JWT | admin, accountant |
| | GET | `/api/v1/ar/aging` | JWT | admin, accountant |
| | GET | `/api/v1/ar/summary` | JWT | admin, accountant |
| **Dashboard** | GET | `/api/v1/dashboard/overview` | JWT | admin, accountant |
| | GET | `/api/v1/dashboard/revenue-cost` | JWT | admin, accountant |
| **Reports** | GET | `/api/v1/reports/monthly` | JWT | admin, accountant |
| | GET | `/api/v1/reports/yearly` | JWT | admin, accountant |
| | GET | `/api/v1/reports/fuel-efficiency` | JWT | admin, accountant |
| | GET | `/api/v1/reports/ar-detail` | JWT | admin, accountant |
| | POST | `/api/v1/reports/export` | JWT | admin, accountant |
| **AI** | POST | `/api/v1/ai/match-route` | JWT | admin, accountant, driver |
| | POST | `/api/v1/ai/fuel-anomaly` | JWT | admin, accountant |
| | GET | `/api/v1/ai/ar-forecast` | JWT | admin, accountant |
| | POST | `/api/v1/ai/query` | JWT | admin, accountant |
| | POST | `/api/v1/ai/ocr-invoice` | JWT | admin, accountant |
| **Admin** | GET | `/api/v1/admin/policies` | JWT | admin |
| | POST | `/api/v1/admin/policies` | JWT | admin |
| | DELETE | `/api/v1/admin/policies` | JWT | admin |
| | GET | `/api/v1/admin/roles` | JWT | admin |
| | POST | `/api/v1/admin/roles` | JWT | admin |
| **Driver** | GET | `/api/v1/driver/my-trips` | JWT | driver |
| | GET | `/api/v1/driver/trip/:id` | JWT | driver |
| | POST | `/api/v1/driver/trip/:id/confirm` | JWT | driver |
| | GET | `/api/v1/driver/routes` | JWT | driver |
| | GET | `/api/v1/driver/fuel-estimate` | JWT | driver |
