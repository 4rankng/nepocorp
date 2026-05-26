# Frontend Audit — NEPO TMS
**Audited against:** `CONTEXT.md` + `docs/product-spec.md`  
**Date:** 2026-05-25  
**Scope:** All pages in `frontend/src/pages/` + routing in `App.tsx`

---

## Summary

The frontend is solid overall — every MVP module has a corresponding page, and the core data entry flows (trip creation, actuals entry, debt tracking, penalty recording) work as designed. However there are **7 functional gaps** relative to the spec, **3 data-integrity / UX problems**, and **several cosmetic/display inconsistencies** that need fixing before the app can be considered spec-complete.

---

## ✅ What's Working Correctly

| Area | Status |
|---|---|
| Trip creation (Phase 1 fields: customer, route, trailer, truck, driver, cargo type, departure date, customer reference) | ✅ Complete |
| Trip legs (dynamic rows: origin, destination, km, loading type) | ✅ Complete |
| Fuel modes: AUTO and KHOÁN (FLAT_RATE) with supplement + reason | ✅ Complete |
| Road allowance fields: Giảm vé QL5, Tăng vé theo lệnh, Số trạm, Về có hàng (+300k) | ✅ Complete |
| Chuyến chè warning + photo upload | ✅ Complete |
| 5 trip status states with correct transitions (CREATED→IN_TRANSIT→COMPLETED→LOCKED + CANCELED) | ✅ Complete |
| Trip detail shows: revenue, total cost, gross profit, fuel liters, road allowance, driver salary, legs with calculated liters | ✅ Complete |
| TTBQ (L/100km) display with colour-coded warning bar in trip list | ✅ Complete |
| Debt list with 4 aging buckets (0-30, 31-60, 61-90, 90+), risk colour coding, overdue count | ✅ Complete |
| Debt detail: full ledger table per customer, payment modal with trip-specific matching and receipt ID | ✅ Complete |
| P&L report with per-truck breakdown, month/year selector | ✅ Complete |
| Net profit calculation: Gross Profit − Management Fee + Other Income | ✅ Complete |
| Cap table + quarterly profit distribution + frozen distribution records | ✅ Complete |
| Penalty creation (catalog reasons + custom reason + auto-fill default amount) | ✅ Complete |
| Penalty monthly KPIs and per-driver scorecards | ✅ Complete |
| Config pages: trucks, trailers, routes, cargo types, pricing tables, road allowances, penalty reasons, drivers, fuel norms, cap table, customers | ✅ Complete |
| Driver mobile pages: DriverTripsPage, DriverEarningsPage | ✅ Complete |
| Audit log page | ✅ Complete |

---

## 🔴 Functional Gaps (spec requirements not implemented)

### 1. No "Hoàn thành" button — IN_TRANSIT → COMPLETED transition is implicit
**Spec (§4.1, Trip Entry Flow Phase 4):** "Driver returns. Accountant finalizes these numbers and moves it to Hoàn thành."

The backend correctly moves the trip to COMPLETED when `/trips/:id/actuals` is called. But in `TripDetailPage`, when status is `IN_TRANSIT`, the only action shown is **"Nhập số liệu thực tế"** which navigates to the edit page. There is no visual indication that saving actuals also advances the status — users may not realize submitting the edit form is what triggers the transition. Consider a clear "Xác nhận về bến → Hoàn thành" button, or at minimum a label on the edit save button that communicates the state change.

---

### 2. Revenue override has no audit trail in UI
**Spec (§4.2 + Trip Data Fields table):** "Kế toán có thể ghi đè; hệ thống ghi nhận giá gốc, giá ghi đè, người thay đổi và thời điểm."

In `TripEditPage`, revenue is a plain `<input type="number">` with no auto-population from the pricing table and no display of the original price. If a user types a different number, there is no visible audit trail showing the original vs. overridden value. `TripDetailPage` also does not surface this.

**Fix needed:** When opening the edit form, pre-populate revenue from `GET /pricing-tables?customer_id=&route_id=`. If the user changes it, show "Giá gốc: X → Giá ghi đè: Y" in the detail view.

---

### 3. Payment modal requires typing Trip IDs manually — FIFO not surfaced
**Spec (§4.10):** "The system suggests FIFO ordering by default (oldest unpaid trips first) but the accountant can override."

In `DebtDetailPage`, the payment modal has `<input type="number" placeholder="ID lệnh">` — the accountant must type raw trip IDs. There is no dropdown of unpaid trips, no FIFO ordering displayed, and no per-trip outstanding balance shown.

**Fix needed:** Replace the trip ID number inputs with a list of the customer's unpaid trips (loaded from the statement), sorted FIFO by default, with checkboxes and pre-filled amounts. The accountant can then adjust amounts per trip or reorder.

---

### 4. No Management Fee entry UI
**Spec (Module 8, item 6):** "Kế toán muốn nhập phí quản lý hàng tháng."

The backend has a `/management-fees` CRUD endpoint (in `config.ts`) but there is **no frontend page or config section** for it. The finance and profit pages read the fee from the API but users have no way to create or update it through the UI.

**Fix needed:** Add a "Phí quản lý" section to `ConfigPage` (or a dedicated `/config/management-fees` route) that lets the accountant enter the monthly amount and effective period.

---

### 5. Adjustment E-Invoice (Hóa đơn điều chỉnh) has no UI
**Spec (§4.9):** "Số liệu đã chốt không thể sửa đổi quá khứ. Tuân thủ chuẩn kế toán Việt Nam, nếu sai sót phải xuất Hóa đơn điều chỉnh."

There is no UI anywhere for creating adjustment invoices against locked trips. `TripDetailPage` correctly hides the edit button for LOCKED trips but provides no alternative correction path.

**Note:** The spec places this in "Hậu MVP" via the correction rules, but the CONTEXT.md marks it as a core accounting standard. Recommend adding a "Tạo điều chỉnh" button on locked trip detail pages that opens a flow for the adjustment entry + bilateral agreement note.

---

### 6. Tea cargo photo validation not enforced at lock time in the UI
**Spec (§4.12):** "Bắt buộc upload ảnh Container & Seal khi đóng chuyến."

`TripEditPage` shows a warning banner for tea cargo but does not prevent saving without photos. The **"Chốt chuyến"** button in `TripDetailPage` calls `/trips/:id/lock` directly. If backend enforcement fails or returns an error, it is shown generically. The UI should proactively disable or visually gate the lock button when `cargoType === 'chè'` and `photoUrls.length === 0`.

---

### 7. Export buttons are all stubs (`alert(...)`)
The following actions show alert dialogs instead of real functionality:
- TripListPage → "Xuất Excel"
- DebtListPage → "Xuất báo cáo" and "Gửi nhắc nợ hàng loạt"
- FinancePage → "Xuất PDF" and "Xuất Excel"

These are called out explicitly in user stories (Module 5 §4, Module 4 §2). Even a simple CSV download or print-to-PDF would meet the spec.

---

## 🟡 Data Integrity / UX Problems

### 8. TripListPage uses different status labels than the rest of the app
`TripListPage` defines its **own local** `TRIP_STATUS_LABEL` map that overrides the shared constants from `@nepocorp/shared`:

| Status | Shared label (used everywhere else) | TripListPage local label |
|---|---|---|
| CREATED | Mới tạo | **Lên lịch** |
| COMPLETED | Hoàn thành | **Chờ duyệt** |

This inconsistency means the same trip shows different labels depending on which page the user is on. Remove the local map and use `TRIP_STATUS_LABELS` from shared, adding a local alias only if the UX intent genuinely differs (e.g. "Chờ duyệt" is a valid reframe for the accountant workflow but should be applied everywhere consistently).

---

### 9. FinancePage fabricates cost-line breakdown and YoY figures
The P&L report hardcodes cost category percentages (`fuelCost = costs * 0.38`, `driverCost = costs * 0.22`, etc.) and prior-year figures as fixed ratios of current data. This means:
- "Bảo dưỡng & sửa chữa" and "Văn phòng & hành chính" appear as real tracked costs even though the spec's `Total Cost` formula is only: **Fuel + Road Allowance + Driver Trip Income**.
- YoY percentages ("+12.4% MoM", "+8.2% MoM") are **always the same regardless of actual data**.
- The hardcoded `officeCost = 58,000,000` has no basis in the spec.

The P&L table should only show line items that exist in the actual data model. Fabricated rows erode accountant trust in the system.

---

### 10. TripListPage month filter has hardcoded months
```tsx
<option value="2026-05">Tháng 5/2026</option>
<option value="2026-06">Tháng 6/2026</option>
```
This will show incorrect options as time passes. Generate the option list dynamically (e.g. last 12 months from current date, plus any months present in `trips` data).

---

## 🟢 Minor / Low-Priority Issues

| # | Location | Issue |
|---|---|---|
| 11 | `DashboardPage` | Subtitle hardcodes "+8.2% MoM" regardless of actual data. Should be omitted or calculated. |
| 12 | `DashboardPage` | "Cần chú ý" action items (Hoàng Long debt, pending dispatches) are mostly hardcoded placeholders rather than live data-driven alerts. |
| 13 | `ProfitPage` | `isPhung = partner.partnerName.includes('Phụng')` hardcodes primary partner by name. Should use a cap table flag (e.g. highest %) or be data-driven. |
| 14 | `TripDetailPage` | `canEdit` is `true` for COMPLETED status but the spec says "Data can still be edited if typos are found" — this is correct. However the `Chỉnh sửa` button coexists with `Nhập số liệu thực tế` for IN_TRANSIT, showing two edit buttons that do the same thing. |
| 15 | `DispatchPage` | Fleet cards show "Long Biên, Hà Nội" as hardcoded parking location. This should come from truck data or be omitted. |
| 16 | `TripListPage` | Bulk select checkboxes render in the table but have no wired-up functionality. |
| 17 | `PenaltyPage` | Penalty list shows all-time penalties with no month filter, but the summary KPIs are month-scoped. Consider adding a month filter to the list for consistency. |

---

## Recommended Priority Order

1. **[Critical]** Fix IN_TRANSIT → COMPLETED UX clarity (#1)
2. **[Critical]** Implement management fee entry UI (#4)
3. **[High]** Fix revenue override audit trail (#2)
4. **[High]** Fix payment modal FIFO trip selector (#3)
5. **[High]** Fix fabricated P&L line items and YoY data (#9)
6. **[High]** Fix TripListPage status label inconsistency (#8)
7. **[Medium]** Gate lock button for tea cargo without photos (#6)
8. **[Medium]** Dynamic month filter in TripListPage (#10)
9. **[Medium]** Implement export (at minimum CSV/print) (#7)
10. **[Low]** Adjustment E-Invoice UI (#5) — post-MVP per roadmap
