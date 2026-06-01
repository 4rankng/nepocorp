# Implementation Plan: Service Costs, External Carrier & Debt Netting

**Source:** Customer requirements from Pete (10:58 PM – 10:05 PM, 01/06/2026)  
**Status:** Draft — awaiting sign-off

---

## Summary of Requirements

Three new capabilities requested:

| # | Feature | Vietnamese Name |
|---|---------|-----------------|
| 1 | Accompanying service costs (buy & sell split per trip) | Chi phí dịch vụ đi kèm |
| 2 | External carrier dispatch on trips | Điều động xe ngoài |
| 3 | AR/AP netting for dual-role entities | Đối trừ công nợ |

---

## Requirement 1 — Chi phí dịch vụ đi kèm

### What the customer said
> "Bổ sung thêm cho anh mục Chi phí dịch vụ đi kèm: chính là mục để chứa các loại phí nâng hạ container, phí thủ tục hải quan, phí kết cấu hạ tầng, phí cân hàng và những mục này phân ra làm 2 phần: mua vào (tức giao nhận và công ty phải trả cho nhà cung cấp/cảng bãi) và bán ra (tức phần công ty lên giấy báo nợ đi kèm cước vận chuyển cho khách hàng)"

### Business logic
Each ancillary fee type (lifting, customs, infrastructure, weighing, etc.) has two monetary amounts:
- **Mua vào (buy cost)** — what NePO pays to the port/supplier → creates AP to that supplier.
- **Bán ra (sell price)** — what NePO bills the customer on top of freight → increases customer AR.
- The difference (sell − buy) is NePO's margin on ancillary services, included in trip P&L.

### Existing schema overlap
The schema already has `trip_expenses` (linked to `forwarderId` user) and `forwarder_expense_types` config table with codes like `LIFTING`, `CUSTOMS`. This is the right table to extend — it currently only has a single `amount` (buy side). We need to add sell-side and supplier linkage.

### DB changes

**`trip_expenses` table — add columns:**
```sql
ALTER TABLE trip_expenses
  ADD COLUMN buy_amount  NUMERIC(15,0),       -- rename/migrate from existing `amount`
  ADD COLUMN sell_amount NUMERIC(15,0) DEFAULT 0,
  ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);  -- nullable (port may be unnamed)
```
Migration: copy `amount` → `buy_amount`, set `sell_amount = 0`, drop `amount`.

No changes needed to `forwarder_expense_types` — the code/name config is already correct.

### Backend changes

**`shared/src/types/`** — update `TripExpense` interface:
```ts
interface TripExpense {
  id: number;
  tripId: number;
  forwarderId: number;
  expenseType: string;        // FK to forwarder_expense_types.code
  buyCost: number;            // was `amount`
  sellPrice: number;          // new
  supplierId: number | null;  // new
  note?: string;
}
```

**`shared/src/calculations/tripTotals.ts`** — update `computeTripTotals()`:
- `totalServiceBuyCost = sum(expenses.buyCost)`
- `totalServiceSellRevenue = sum(expenses.sellPrice)`
- Include `totalServiceSellRevenue` in gross revenue (alongside freight revenue).
- Include `totalServiceBuyCost` in total costs.
- `serviceMargin = totalServiceSellRevenue − totalServiceBuyCost`

**`backend/src/services/trip.service.ts`**:
- `createTripExpense` / `updateTripExpense`: accept `buyCost`, `sellPrice`, `supplierId`.
- `lockTrip`: for each expense with `supplierId`, write ledger entry `VENDOR_EXPENSE` (debit) against that supplier's ledger account.

**`backend/src/routes/`**:
- `PUT /api/v1/trips/:id/expenses/:expenseId` — add `buyCost`, `sellPrice`, `supplierId` to body schema.
- New: `GET /api/v1/suppliers` — list active suppliers (needed for the dropdown, may already exist under `/config`).

### Frontend changes

**`TripEditPage` / `TripCreatePage`** — expenses section:
- Current: single amount column.
- New: two columns **"Mua vào (VNĐ)"** and **"Bán ra (VNĐ)"** + a **"Nhà cung cấp"** dropdown (suppliers list, optional).
- Show `sellPrice − buyCost` diff inline in a third column labeled "Lãi DV".

**`TripDetailPage`** — read-only view:
- Render expense grid with buy/sell/margin columns.
- Add `totalServiceSellRevenue` to the revenue summary card.

**Finance → P&L page** — ensure `serviceMargin` appears as a line in the P&L table.

---

## Requirement 2 — Điều động xe ngoài

### What the customer said
> "Ngoài điều động xe nhà thì sẽ có mục điều động xe ngoài từ đối tác/nhà cung cấp. Và khi điều xe ngoài thì NePO sẽ cắt 1 phần chi phí phục vụ quản lý. Vì vậy, mục số chuyến đi cũng cần có lựa chọn đối tác vận chuyển bên ngoài (từ danh sách nhà cung cấp) và có mục 'giá cước mua vào', phần này sẽ hình thành chi phí của vận tải cũng như công nợ phải trả cho đối tác/nhà cung cấp bên ngoài"

### Business logic
- A trip can be fulfilled by either NePO's own truck ("xe nhà") or an external partner carrier ("xe ngoài").
- **Xe ngoài** trips: customer pays NePO the normal freight rate. NePO pays external carrier the "giá cước mua vào". The difference is NePO's **management fee margin**.
- External carrier AP (công nợ phải trả) is created when the trip is locked, just like customer AR.

### DB changes

**`trips` table — add columns:**
```sql
ALTER TABLE trips
  ADD COLUMN carrier_type        VARCHAR(20) NOT NULL DEFAULT 'OWN',  -- 'OWN' | 'EXTERNAL'
  ADD COLUMN external_carrier_id INTEGER REFERENCES suppliers(id),     -- nullable
  ADD COLUMN external_freight_cost NUMERIC(15,0);                      -- giá cước mua vào, nullable
```

**Constraints:**
- `carrier_type = 'OWN'` → `truck_id` + `driver_id` required (existing validation).
- `carrier_type = 'EXTERNAL'` → `external_carrier_id` + `external_freight_cost` required; `truck_id` and `driver_id` become nullable (set to NULL).

**Migration:** existing rows default to `carrier_type = 'OWN'`, no data loss.

**`txn_type` enum** — add `EXTERNAL_CARRIER_COST` value (or reuse existing `VENDOR_EXPENSE`).

### Backend changes

**`shared/src/types/`** — update `Trip` interface:
```ts
interface Trip {
  // ...existing fields...
  carrierType: 'OWN' | 'EXTERNAL';
  externalCarrierId: number | null;
  externalFreightCost: number | null;
  // truckId, driverId become optional when carrierType='EXTERNAL'
}
```

**`shared/src/schemas/`** — update trip creation/update Zod schema:
- Add `carrierType`, `externalCarrierId`, `externalFreightCost`.
- Conditional validation: if `carrierType === 'EXTERNAL'` then `externalCarrierId` and `externalFreightCost` are required; `truckId` and `driverId` are optional.

**`backend/src/services/trip.service.ts`**:
- `createTrip` / `updateTrip`: handle new fields.
- `lockTrip`: if `carrierType === 'EXTERNAL'`:
  1. Write ledger entry `VENDOR_EXPENSE` against `externalCarrierId` for `externalFreightCost` (AP).
  2. `externalMargin = tripRevenue − externalFreightCost` — this is NePO's management fee, flows into P&L as income.
  3. Emit `MANAGEMENT_FEE` ledger entry or include in the P&L line.

**`shared/src/calculations/tripTotals.ts`**:
- If `carrierType === 'EXTERNAL'`: `totalCost` includes `externalFreightCost` (no fuel/road allowance/driver salary).
- Add `externalMargin` to the returned totals object.

### Frontend changes

**`TripCreatePage` / `TripEditPage`** — dispatch section:
- Add **carrier type toggle**: "Xe nhà" | "Xe ngoài".
- **Xe nhà (default):** show existing Truck + Driver dropdowns.
- **Xe ngoài:** hide Truck/Driver; show:
  - "Đối tác vận chuyển" — supplier dropdown (filter by `category = 'CARRIER'` if we add that, or show all suppliers).
  - "Giá cước mua vào (VNĐ)" — numeric input.
  - Auto-show "Lãi điều xe ngoài" = `customerFreightRate − externalFreightCost` as read-only preview.

**`TripDetailPage`** — add "Xe ngoài" section when `carrierType = 'EXTERNAL'`:
- Show carrier name, external freight cost, management margin.

**`DispatchPage`** — fleet board should visually distinguish xe ngoài trips (e.g. different icon/badge).

**Finance → Công nợ phải trả page** — external carrier AP entries appear here automatically (via ledger, same as other vendors).

**P&L report** — add breakdown line: "Doanh thu điều xe ngoài (lãi quản lý)".

---

## Requirement 3 — Đối trừ công nợ (AR/AP Netting)

### What the customer said
> "Với đặc thù của ngành vận tải thì có những đối tác vận tải cũng chính là khách hàng của NePO vì 2 bên vận tải qua lại cho nhau. Vì vậy khi nên bảng kê công nợ phải thu/phải trả trong trường hợp này thì sẽ có mục đối trừ"

### Business logic
- Entity X can be both a `customer` (NePO ships for them → AR) and a `supplier/carrier` (they ship for NePO → AP).
- **Đối trừ** = record a mutual offset: reduces both AR and AP by the same amount without actual cash movement.
- Net position = AR balance − AP balance after all offsets.

### DB changes

**Link suppliers ↔ customers:**
```sql
ALTER TABLE suppliers ADD COLUMN linked_customer_id INTEGER REFERENCES customers(id);
ALTER TABLE customers ADD COLUMN linked_supplier_id INTEGER REFERENCES suppliers(id);
```
(Bidirectional soft link — either side can be set independently.)

**New `debt_offsets` table:**
```sql
CREATE TABLE debt_offsets (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers(id),
  supplier_id     INTEGER NOT NULL REFERENCES suppliers(id),
  amount          NUMERIC(15,0) NOT NULL,
  offset_date     DATE NOT NULL,
  note            TEXT,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX debt_offsets_customer_idx ON debt_offsets(customer_id);
CREATE INDEX debt_offsets_supplier_idx ON debt_offsets(supplier_id);
```

**Ledger entries on offset creation:**
- `ADJUSTMENT` debit on customer ledger (reduces AR).
- `ADJUSTMENT` credit on supplier ledger (reduces AP).

### Backend changes

**New endpoint:** `GET /api/v1/finance/dual-entities`
- Returns customers that have a `linked_supplier_id` (or suppliers with `linked_customer_id`).
- Response includes `arBalance`, `apBalance`, `netBalance` for each.

**New endpoint:** `POST /api/v1/finance/debt-offsets`
```json
{
  "customerId": 5,
  "supplierId": 12,
  "amount": 50000000,
  "offsetDate": "2026-06-01",
  "note": "Đối trừ Q2/2026"
}
```
- Validates `amount ≤ min(arBalance, apBalance)`.
- Inserts `debt_offsets` row.
- Writes two ledger entries.

**New endpoint:** `GET /api/v1/finance/debt-offsets?customerId=X&supplierId=Y`
- Returns offset history for this pair.

**Existing `GET /api/v1/customers/:id/ledger`** — add `offsetAmount` to response so AR aging reflects net.

### Frontend changes

**`/config/suppliers`** (or supplier management page) — add "Liên kết khách hàng" field: a customer dropdown, saved to `linked_customer_id`.

**`DebtListPage` (`/debt`)** — AR table:
- Add "Đối tác 2 chiều" badge for customers who are also suppliers.
- Add "Net công nợ" column showing `AR − AP` for dual-role entities.
- Link to offset modal from this column.

**`DebtDetailPage` (`/debt/:id`)** — if customer has `linked_supplier_id`:
- Add "Công nợ phải trả" card showing AP balance for the linked supplier.
- Add "Đối trừ" button → opens offset modal.

**New offset modal:**
- Shows: AR balance (phải thu), AP balance (phải trả), max offsettable amount.
- Input: amount, date, note.
- On submit: calls `POST /api/v1/finance/debt-offsets`.
- On success: refreshes both balances.

**AP page (`/debt-payable` or the "Công nợ phải trả" section)** — symmetric: dual-role badge + net column.

---

## Implementation Order (suggested)

| Phase | Work | Rationale |
|-------|------|-----------|
| **P1** | DB migrations (all 3 features) | Schema-first; unblocks all backend/frontend in parallel |
| **P2a** | Req 1 backend: `tripExpenses` buy/sell | Most impactful for daily operations |
| **P2b** | Req 2 backend: external carrier on trips | Needed before next external dispatch |
| **P2c** | Req 3 backend: netting endpoints | Less urgent, can follow |
| **P3a** | Req 1 frontend: trip form expenses grid | Paired with P2a |
| **P3b** | Req 2 frontend: carrier type toggle in trip form | Paired with P2b |
| **P3c** | Req 3 frontend: netting modal + dual-entity badges | Paired with P2c |
| **P4** | P&L report updates (include service margin, external margin) | Ties all features into reporting |
| **P5** | Integration tests + migration rollback plan | Before production deploy |

---

## Open Questions for Pete

1. **Req 1 — Supplier for services:** When recording ancillary service buy-costs, is the supplier always a specific named supplier (từ danh sách nhà cung cấp), or can some fees be "no supplier" (e.g. port authority fees without a vendor record)?
2. **Req 2 — Management fee:** Is the NePO management fee (lãi điều xe ngoài) a fixed percentage or just the natural margin (sell − buy)? Should it be configurable?
3. **Req 2 — Driver for external trips:** When dispatching xe ngoài, does NePO still record which external driver is driving, or just the partner company?
4. **Req 3 — Approval flow:** Should "đối trừ" entries require manager approval before taking effect on the ledger, or can accountants post them directly?
5. **Req 3 — Partial netting:** Can an offset be partial (e.g. offset 50M out of 200M AR), or must it always fully clear the smaller of the two balances?

---

## Affected Files Summary

```
DB migrations
  backend/src/db/migrations/XXXX_service_costs_external_carrier_netting.sql

Schema
  backend/src/db/schema.ts                        (trips, trip_expenses, suppliers, customers, + debt_offsets)

Shared
  shared/src/types/index.ts                       (Trip, TripExpense, DebtOffset)
  shared/src/schemas/index.ts                     (trip create/update, expense schemas)
  shared/src/calculations/tripTotals.ts           (serviceMargin, externalMargin)

Backend
  backend/src/services/trip.service.ts            (lockTrip, createExpense, updateExpense)
  backend/src/routes/trips.ts                     (expense endpoints)
  backend/src/routes/financial.ts                 (debt-offsets, dual-entities)

Frontend
  frontend/src/pages/TripCreatePage.tsx
  frontend/src/pages/TripEditPage.tsx
  frontend/src/pages/TripDetailPage.tsx
  frontend/src/pages/DebtListPage.tsx
  frontend/src/pages/DebtDetailPage.tsx
  frontend/src/pages/FinancePage.tsx              (P&L line additions)
  frontend/src/api/tripClient.ts                  (new API calls)
  frontend/src/components/DebtOffsetModal.tsx     (new component)
```
