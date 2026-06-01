# Test Execution Checklist — Nepocorp QA Micro-Iteration

> Source: `PRODUCT-SPECS.md` + `docs/flows/*` (Vietnamese flow docs 00-13)
> Method: One role + one flow per item. Test in order. Stop at 2 bugs per iteration.
> Test accounts (all pwd `admin123`): `quan` (Director/MANAGER), `anh` (Accountant/ACCOUNTANT), `giaonhan` (Dispatcher/FORWARDER), `laixe` (Driver/DRIVER). Fallback usernames per docs: `giamdoc`, `ketoan`.
> App URL: http://localhost:7173/

Legend: `[ ]` pending · `[~]` in progress · `[x]` Passed · `[!]` Bug found (see iteration file)

---

## 1. Auth & Routing (flows/00)

- [x] **1.1** Director login (phung) → `/dashboard` — PASSED iter 03/08
- [x] **1.2** Accountant login (anh) → `/dashboard` — PASSED iter 06/08
- [x] **1.3** Driver login (thu) → `/my-trips` — PASSED iter 08
- [x] **1.4** Forwarder login (quan) → `/my-forwarder-trips` — PASSED iter 08
- [x] **1.5** Driver hits `/finance` → `/my-trips` — PASSED iter 08
- [x] **1.6** Forwarder hits `/dashboard` → `/my-forwarder-trips` — PASSED iter 08
- [x] **1.7** Session restore on reload preserves login — PASSED iter 08
- [x] **1.8** Logout clears localStorage and shows login — PASSED iter 08 (URL doesn't redirect but login form renders; minor UX nit)

## 2. User Admin (flows/10) — **Known issue starter**

- [x] **2.1** Director `/users` loads list (NOT stuck on "Đang tải…") — PASSED 2026-06-02. API returns `{items, total}`, 7 accounts render, no persistent loading text. Known issue was already fixed.
- [x] **2.2** Director creates new user — PASSED iter 03 (under phung; iter 02 false-bug withdrawn, see iteration files)
- [x] **2.3** Director edits existing user — PASSED iter 04 (under phung; PATCH /api/auth/users/:id fires, row updates)
- [x] **2.4** Director soft-deletes a user — PASSED iter 05. MANAGER cannot delete (per docs, by design). UX patch applied: Delete button now hidden for non-ADMIN. Re-test as ADMIN deferred (no admin account in current seed).
- [x] **2.5** Accountant `/users` → API 403 (or hidden in sidebar) — PASSED iter 06. Sidebar hides Users + Audit Logs links; route redirects to /dashboard; API returns 403.
- [x] **2.6** Director `/audit-logs` infinite-scroll loads pages — PASSED iter 07 (scroll fires IntersectionObserver, rows 10 → 20)

## 3. Trip Lifecycle (flows/01)

- [ ] **3.1** Director creates trip (Mới tạo): customer + route + truck + driver + cargo + date + containers
- [ ] **3.2** Accountant moves trip to Đang chạy
- [ ] **3.3** Accountant fills actuals on Đang chạy: legs, fuel mode AUTO, road allowance edits, lương SL, doanh thu
- [ ] **3.4** Trip computes total fuel cost, total cost, gross profit correctly per `computeTripTotals`
- [ ] **3.5** Accountant uploads container/seal photos and moves to Hoàn thành
- [ ] **3.6** Director locks trip to Đã chốt → ledger entry created, edits forbidden
- [ ] **3.7** Director cancels trip from Mới tạo → Đã hủy, history preserved
- [ ] **3.8** km = 0 leg allowed (regression: shipped recently)
- [ ] **3.9** Container "Loại cont" + "Số cont" columns visible on trip detail (regression)
- [ ] **3.10** Cảng/Bãi port catalog combobox in leg form (regression)

## 4. Trip List & Search (flows/02)

- [ ] **4.1** `/trips` renders 11-column table (regression: shipped recently)
- [ ] **4.2** Filter by status (Mới tạo / Đang chạy / Hoàn thành / Đã chốt / Đã hủy)
- [ ] **4.3** Filter by date range
- [ ] **4.4** Filter by truck and customer
- [ ] **4.5** Search box finds trip by id/customer/route
- [ ] **4.6** Pagination + CSV export

## 5. Dashboard (flows/03)

- [ ] **5.1** Director `/dashboard` renders `.dash-wf` scoped layout (regression)
- [ ] **5.2** KPI tiles (Doanh thu / Chi phí / LN gộp / LN ròng) populate with current month
- [ ] **5.3** 12-month trend chart renders
- [ ] **5.4** Chart Y-axis format = `tr₫` (regression)
- [ ] **5.5** Month navigation in topbar (regression)
- [ ] **5.6** Cost breakdown pie + top-route table
- [ ] **5.7** PWA install icon visible (regression)

## 6. Finance / P&L (flows/03)

- [ ] **6.1** Accountant `/finance` shows monthly P&L
- [ ] **6.2** YoY comparison column populated
- [ ] **6.3** Per-truck detail rows
- [ ] **6.4** Truck + trailer cost split (TRUCK vs TRAILER `vehicle_component`)

## 7. AR / Debt (flows/04)

- [ ] **7.1** Accountant `/debt` lists customers with aging buckets
- [ ] **7.2** Director clicks customer → `/debt/:id` statement loads
- [ ] **7.3** Accountant records full payment → FIFO matches oldest trip first
- [ ] **7.4** Accountant records partial payment → balance updates
- [ ] **7.5** Aging color codes (0-30/31-60/61-90/90+)
- [ ] **7.6** AR/AP netting (regression: shipped recently)

## 8. Profit Distribution (flows/05)

- [ ] **8.1** Director `/profit` shows cap table snapshot
- [ ] **8.2** Director runs quarter distribution → snapshot created, immutable
- [ ] **8.3** "Tiền kết hợp" label appears (renamed regression)

## 9. Penalties (flows/06)

- [ ] **9.1** Accountant `/penalties` creates penalty from catalog reason
- [ ] **9.2** New custom reason warns on duplicate
- [ ] **9.3** Penalty appears in driver income calc as deduction

## 10. Fleet & Dispatch (flows/07)

- [ ] **10.1** Director `/dispatch` shows CREATED trips, assigns vehicle/driver
- [ ] **10.2** Director `/fleet` CRUD on trucks (+ paired trailer plate)
- [ ] **10.3** Director CRUD on drivers
- [ ] **10.4** Trailer info auto-fills onto trip when truck selected (paired model)

## 11. Customers (flows/08)

- [ ] **11.1** Accountant `/customers` CRUD on customer
- [ ] **11.2** Risk score + credit limit fields visible

## 12. Config (flows/09)

- [ ] **12.1** Accountant `/config` hub renders 12 tiles
- [ ] **12.2** Routes CRUD (with peak-pass fuel quota for đèo đốc)
- [ ] **12.3** Pricing table edit per customer × route
- [ ] **12.4** Road allowance per route × trailer type
- [ ] **12.5** Fuel unit price update → fuel_price_history row appended
- [ ] **12.6** Cap table change with effective date
- [ ] **12.7** Container types CRUD
- [ ] **12.8** Ports/depots CRUD
- [ ] **12.9** Management fee monthly entry

## 13. Driver Portal (flows/11)

- [ ] **13.1** Driver `/my-trips` lists assigned trips
- [ ] **13.2** Driver `/my-trips/:id` shows fuel allocation
- [ ] **13.3** Driver `/my-earnings` shows current-month earnings
- [ ] **13.4** Driver `/my-penalties` shows violations + total deduction
- [ ] **13.5** Mobile layout (375px) usable

## 14. Expenses & AP (flows/12)

- [ ] **14.1** Accountant `/suppliers` CRUD
- [ ] **14.2** Accountant `/expenses/new` with vendor + category + vehicle + photo
- [ ] **14.3** `vehicle_component` = TRUCK/TRAILER toggle present
- [ ] **14.4** PAID expense → P&L only, no AP entry
- [ ] **14.5** UNPAID expense → ledger VENDOR credit row appears
- [ ] **14.6** `/payables` aging buckets render
- [ ] **14.7** Vendor payment (FIFO) reduces balance
- [ ] **14.8** Edit/delete expense → ADJUSTMENT entry, no UPDATE (audit-trail invariant)
- [ ] **14.9** Renewable category reminder when valid_to − lead_days reached

## 15. Forwarder Portal (flows/13)

- [ ] **15.1** Forwarder `/my-forwarder-trips` list
- [ ] **15.2** Forwarder opens trip detail
- [ ] **15.3** Forwarder enters container number / seal text
- [ ] **15.4** Forwarder uploads container photo
- [ ] **15.5** Forwarder records expense (giao nhận chi phí phát sinh)
- [ ] **15.6** Forwarder sidebar shows ONLY 1 menu item

## 16. Cross-cutting

- [ ] **16.1** Notification bell + drawer opens
- [ ] **16.2** `Cmd+B` toggles sidebar; `Cmd+K` focuses search
- [ ] **16.3** Topbar shows current month chip + auto-hide on scroll (recent ship)
- [ ] **16.4** Vietnamese labels render (no English fallback gibberish)
- [ ] **16.5** Currency formatting: no decimals in display (VND convention)

---

## Iteration Tracker

| # | Date | Item | Bugs Found | Status |
|---|------|------|------------|--------|
| 01 | 2026-06-02 | 2.1 Director /users hang | 0 (regression pass) | Passed |
| 02 | 2026-06-02 | 2.2 Director creates new user | 1 (parked) | Parked — env anomaly mid-test; quan demoted to FORWARDER. Retry under phung. |
| 03 | 2026-06-02 | 2.2 RETRY under phung | 0 (false-bug withdrawn) | Passed |
| 04 | 2026-06-02 | 2.3 Director edits user | 0 | Passed |
| 05 | 2026-06-02 | 2.4 Director deletes user | 1 (UX) | Passed + patched (delete hidden for non-ADMIN) |
| 06 | 2026-06-02 | 2.5 Accountant /users 403 | 0 | Passed |
| 07 | 2026-06-02 | 2.6 Audit-logs infinite scroll | 0 | Passed |
| 08 | 2026-06-02 | Section 1 (1.1-1.8) auth/routing | 0 | All Passed |
