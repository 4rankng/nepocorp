# Domain Context: NEPO Logistics

## Glossary

### Trips
- **Trip (Chuyến xe)**: The core operational unit — a single truck journey from dispatch to completion. Each trip is standalone.
- **Customer Reference**: An optional text field on a Trip for grouping related trips that serve the same customer request (replaces formal Orders for MVP).
- **Trip Status**: The lifecycle of a trip has 5 distinct states. Both MANAGER and ACCOUNTANT can trigger all transitions. ADMIN is a developer/support role, not a business user.
  1. **Mới tạo (Created)**: Basic information entered by Manager (truck, route, customer). *Action:* Accountant inputs expected km, tolls, and fuel before departure.
  2. **Đang chạy (In Transit)**: Driver has departed. Accountant can continuously update figures if changes occur on the road.
  3. **Hoàn thành (Completed)**: Driver has returned. Accountant enters/verifies final actual numbers (including mandatory photos for "chuyến chè"). Data can still be edited if typos are found.
  4. **Đã chốt (Locked/Finalized)**: Manager or Accountant verifies the trip. Data is permanently locked and officially recorded in the Ledger. No further edits allowed. Trips are locked individually (trip-by-trip) as they are verified, rather than waiting for a single atomic month-end action.
  5. **Đã hủy (Canceled)**: Trip canceled mid-way. Retained for historical record, not deleted.
- **Trip Entry Flow**: 
  - **Phase 1**: Manager creates the trip -> "Mới tạo".
  - **Phase 2 (Pre-departure)**: Accountant enters the initial figures (km, fuel liters, tolls, revenue) *before* the trip moves to "Đang chạy". (Note: There are no separate "expected" vs "actual" fields; there is only one set of fields that gets continuously updated).
  - **Phase 3**: The trip is "Đang chạy". The accountant can update these figures at any time.
  - **Phase 4**: Driver returns. Accountant finalizes these numbers and moves it to "Hoàn thành".
  - **Phase 5**: Verified and locked as "Đã chốt" (trip-by-trip).
- **Special Cargo (Chuyến chè)**: A specific type of cargo (tea) requiring mandatory photo evidence (Container & Seal) for closure.

### Financials
- **Ledger Architecture (Sổ cái)**: All financial balances (Customer debt, Driver salaries/penalties, Vendor payables) are tracked via a centralized immutable Ledger table.
  - **Schema design**: `id`, `date`, `txn_type` (e.g., "TRIP_REVENUE", "PAYMENT_RECEIVED", "PENALTY"), `txn_id` (reference to the specific Trip or underlying entity), `receipt_id` (reference to a grouped transaction, like a single bank transfer paying multiple trips), `entity_type` (String, e.g., "DRIVER", "CLIENT", "VENDOR" - NO ENUMS), `entity_id` (Integer, no Foreign Key constraints, loose coupling), `credit` (incoming money), `debit` (outgoing money), `balance` (running balance after transaction), `note`.
  - **Running Balance**: The current debt/balance of any entity is the `balance` of their latest ledger row. 
- **Revenue (Doanh thu)**: The amount earned from fulfilling a Trip. Auto-populated at trip creation from the pricing table (Customer x Route). The accountant can override with an audit trail (original price, overridden price, who, when). Currently fixed rates; variable pricing may be considered later.
- **Accounts Receivable (Công nợ phải thu)**: Each completed trip adds a `TRIP_REVENUE` row to the Customer's ledger (increasing debit/balance) with `txn_id = TripID`. Payment matching is **manual**: the accountant selects which specific trips are being paid and enters amounts per trip (partial payment allowed). The system **suggests FIFO ordering by default** (oldest unpaid trips first) but the accountant can override — this is necessary because customers sometimes specify which trips they're paying for via remittance advice, or dispute older trips. A single bank transfer generates multiple `PAYMENT_RECEIVED` rows (one per paid trip, each with its own `txn_id`), all grouped by the same `receipt_id`. A trip's unpaid status can be found by summing its debits and credits.
- **Gross Profit (Lợi nhuận gộp)**: Revenue minus Total Cost for a specific truck. Calculated monthly.
- **Net Profit (Lợi nhuận ròng)**: Total Gross Profit of all trucks minus the Management Fee plus Other Income. Profit sharing is distributed to partners using a **Hybrid Approach**: 
  - **Inputs (CapTableHistory)**: The system tracks the history of ownership percentages (e.g. Q1: 50/50, Q2: 40/40/20).
  - **Outputs (Distribution Snapshot)**: When the accountant executes a distribution (quarterly/yearly), the system calculates the payouts using the applicable historical percentages and freezes the results into immutable distribution records. Year-end reports simply `SUM` these snapshot records without recalculating percentages.
- **Corrections (Điều chỉnh)**: Locked trip data cannot be edited. Following Vietnamese accounting standards (Decree 123/2020/ND-CP), corrections require an **Adjustment E-Invoice (Hóa đơn điều chỉnh)** issued in the current period. Decreasing adjustments (Credit Notes) use negative values, increasing adjustments (Debit Notes) use positive values. Both require a bilateral signed agreement (biên bản thỏa thuận).
- **Management Fee (Phí quản lý)**: A fixed monthly overhead (currently 24,000,000 VNĐ) for the entire company, entered manually by accountants.
- **Total Cost (Tổng chi phí)**: Fuel cost (liters x configurable unit price) + Road Allowance + Driver Trip Income. Penalties are NOT included — they are salary deductions for drivers, not company expenses. Accountant enters liters; system auto-calculates fuel cost using the configured unit price.
- **Other Income (Thu nhập khác)**: Penalty revenue is recorded here separately. Driver salary is recorded in full as labor cost, penalties are NOT deducted from it. Net Profit = Total Gross Profit - Management Fee + Other Income.

### Fleet & Personnel
- **Truck (Xe đầu kéo)**: A truck can have multiple drivers assigned to it over time. Trailers (rơ-mooc) are swappable per trip — the same truck can pull a 20ft trailer on one trip and a 40ft on the next.
- **Driver (Lái xe)**: Receives a fixed base salary plus a productivity bonus based on number of trips driven. Has read-only mobile access to view fuel allocation, earnings, and trip history. **Crucially, a single Trip is always assigned to exactly ONE driver.**
- **Fuel Consumption (TTBQ - Tiêu thụ bình quân)**: Liters of fuel per 100km. Calculated as `(total liters / total km) × 100`. Displayed on trip detail for reference.
- **Fuel Norm (Định mức nhiên liệu)**: Configurable base norms for loaded (hàng) and empty (vỏ) trips, plus a flat per-trip supplement. Currently: 43L/100km (loaded), 25L/100km (empty), +3L/trip supplement (standard routes).
- **Trip Legs (Các chặng)**: A trip consists of multiple legs (chặng), each with origin, destination, km, and loading type (hàng/vỏ). The system calculates fuel per leg using the applicable norm. Mountain routes still use multi-leg model.
- **Fuel Entry Modes**: Accountant chooses per trip:
  - **AUTO**: Enter km per leg + loading type → system auto-calculates total liters from norms.
  - **FLAT_RATE (Khoán)**: Accountant manually enters total liters, overriding all calculations.
  - **Supplement (Bổ sung)**: Additional liters for breakdowns/repairs — additive on top of either mode.
- **Mountain Route Fuel**: Fixed total fuel allowance stored in the route record (e.g. Mộc Châu 240L, Sơn La 320L, Lai Châu 365L). System auto-looks up the route. This fixed allowance covers the entire round trip and overrides all per-km calculations. Multi-leg model still applies for detail tracking.
- **Road Allowance (Tiền đi đường)**: Cash given to the driver before a trip to cover actual road expenses (tolls, etc.). Not counted as driver income in the system. The base rate (Tiền chuẩn) is a fixed lookup table keyed by Route x Trailer Type (~38 routes x 2 types). Adjustments (Giảm vé QL5, Tăng vé theo lệnh) and station count are entered manually by accountant/manager per trip. Final formula: `Tiền thực tế = Tiền chuẩn - Giảm vé + Tăng vé - (Số trạm x 55.000)`. Return trip with cargo adds 300,000 VNĐ (this applies independently of fuel norms, even on mountain routes).
- **Trip Income (Lương sản lượng)**: Per-trip driver income field, entered per trip. Combined with base salary to calculate total monthly driver pay. Penalties are deducted from salary.
- **Penalty (Kỷ luật)**: Financial deductions for violations. These are recorded manually by accountants. The system provides a list of common reasons (e.g., "Missing fuel invoice - 100k") but allows custom entries with duplicate detection.

### System Audit & Tracking
- **Intention (Sự kiện/Hành động)**: In the context of audit logging, an "Intention" is strictly defined as **a single mutation API call** (e.g., `POST`, `PUT`, `DELETE`, `PATCH`). Even if an API call modifies multiple database tables (e.g., locking a trip updates the `Trips` table and inserts into the `Ledger` table), it is recorded as exactly one unified Intention event in the Audit Log. This ensures logs represent actual business actions taken by users rather than raw, noisy database queries.
