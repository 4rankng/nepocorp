# NEPO Logistics: User Stories & Development Tasks

## Context

The NEPO logistics system has a comprehensive backend and frontend with most core features implemented: trip lifecycle management, financial ledger, configuration management, penalty system, profit distribution, and audit logging. This document identifies remaining gaps between the product spec (`docs/product-spec.md`) and the current implementation, organized as actionable user stories and tasks.

**Key files:**
- Backend routes: `backend/src/routes/config.ts`, `backend/src/routes/trips.ts`
- Backend services: `backend/src/services/trip.service.ts`
- Frontend pages: `frontend/src/pages/*.tsx`
- Shared types/schemas: `shared/src/schemas/index.ts`, `shared/src/constants/index.ts`

---

## EPIC 1: Trip Management Completion

### US-1.1: Accountant enters trip legs with fuel mode selection
**As a** kế toán (accountant),
**I want to** enter trip legs with origin, destination, km, and loading type (hàng/vỏ),
**So that** the system can automatically calculate fuel consumption from configured norms.

**Status:** Partially implemented. TripEditPage supports legs and fuel mode. Missing: fuel calculation audit trail display.

**Tasks:**
- [ ] **T-1.1.1:** In TripEditPage, show calculated liters per leg with norm breakdown (e.g., "120km x 43L/100km = 51.6L") in a read-only column
- [ ] **T-1.1.2:** Display total auto-calculated fuel vs flat-rate override with visual distinction (badge or color)
- [ ] **T-1.1.3:** Add mountain route indicator — when route has `fixed_fuel_allowance`, show "Tuyến đèo — định mức: X L" and disable per-leg norm calculation
- [ ] **T-1.1.4:** Show supplement liters separately in the fuel summary section with the reason

### US-1.2: Revenue override with audit trail
**As a** kế toán,
**I want to** see the auto-looked-up price and optionally override it with a different value,
**So that** I can correct pricing while maintaining a full audit trail.

**Status:** Backend stores `revenue_original`, `revenue_overridden_by`, `revenue_overridden_at`. Frontend allows manual entry but doesn't display the audit trail.

**Tasks:**
- [ ] **T-1.2.1:** In TripEditPage, show "Giá tự động: X VNĐ" badge when revenue was auto-populated from pricing table
- [ ] **T-1.2.2:** When accountant changes revenue, show a confirmation dialog: "Xác nhận ghi đè giá? Giá gốc: X VNĐ → Giá mới: Y VNĐ"
- [ ] **T-1.2.3:** In TripDetailPage, show override history: original price, who changed it, and when (if override exists)
- [ ] **T-1.2.4:** Ensure backend `PUT /trips/:id/actuals` correctly saves `revenue_original`, `revenue_overridden_by`, `revenue_overridden_at` when revenue differs from pricing table lookup

### US-1.3: Trip photo upload for special cargo
**As a** kế toán,
**I want to** upload container & seal photos when closing a tea cargo trip,
**So that** we have mandatory photo evidence for insurance and tracking.

**Status:** Implemented in TripEditPage. No changes needed — verify it works end-to-end.

**Tasks:**
- [ ] **T-1.3.1:** Verify photo upload works with backend `POST /upload` endpoint (confirm file storage and retrieval)
- [ ] **T-1.3.2:** Verify photo display in TripDetailPage for locked trips
- [ ] **T-1.3.3:** Add validation: block trip lock transition if `cargo_type = chè` and no photos uploaded

---

## EPIC 2: Fuel Consumption & Norm Control

### US-2.1: Configurable fuel norm thresholds with warnings
**As a** quản lý (manager),
**I want to** see warnings when a trip's fuel consumption exceeds configured norms,
**So that** I can identify fuel waste or theft proactively.

**Status:** TripListPage has hardcoded thresholds (37/40 L/100km). Need configurable thresholds from `fuel_config`.

**Tasks:**
- [ ] **T-2.1.1:** Add `warning_threshold` and `critical_threshold` fields to `fuel_config` table and schema
- [ ] **T-2.1.2:** Add threshold configuration UI in ConfigPage fuel-config tab
- [ ] **T-2.1.3:** Update TripListPage and TripDetailPage to use configured thresholds instead of hardcoded 37/40 values
- [ ] **T-2.1.4:** Show TTBQ comparison against norm in TripDetailPage: "TTBQ: 42.5 L/100km (Định mức: 43 L/100km — ✅ Trong định mức)"
- [ ] **T-2.1.5:** Add fuel warning indicator on DashboardPage for recent trips exceeding norms

---

## EPIC 3: Accounts Receivable (Công nợ phải thu)

### US-3.1: Record payments with FIFO suggestion
**As a** kế toán,
**I want to** record customer payments with the system suggesting oldest unpaid trips first,
**So that** I can quickly allocate payments without manually sorting through trips.

**Status:** DebtDetailPage supports payment recording and trip-specific allocation. Missing FIFO suggestion.

**Tasks:**
- [ ] **T-3.1.1:** Add backend endpoint or modify existing `GET /ledger/customers/:id/statement` to return unpaid trips sorted by date (oldest first) with outstanding amounts
- [ ] **T-3.1.2:** In DebtDetailPage payment modal, add "Gợi ý FIFO" button that auto-fills payment amounts starting from oldest unpaid trip
- [ ] **T-3.1.3:** Allow accountant to override FIFO suggestions — select specific trips and enter custom amounts
- [ ] **T-3.1.4:** Show running total: "Đã phân bổ: X / Y VNĐ" as accountant fills in amounts

### US-3.2: Overdue customer alerts
**As a** quản lý,
**I want to** see automatic 30/60/90-day overdue alerts on the dashboard,
**So that** I can prioritize debt collection for high-risk customers.

**Status:** Backend `GET /ledger/customers/:id/statement` returns aging data. No dashboard alerts.

**Tasks:**
- [ ] **T-3.2.1:** Add overdue summary endpoint: `GET /reports/receivables-summary` returning counts/amounts for 30/60/90+ day buckets
- [ ] **T-3.2.2:** Add alerts widget to DashboardPage showing: "X khách hàng quá hạn 30 ngày (Y VNĐ), Z khách hàng quá hạn 60 ngày (W VNĐ)"
- [ ] **T-3.2.3:** Color-code customers in DebtListPage: green (< 30d), yellow (30-60d), red (60-90d), dark red (90d+)
- [ ] **T-3.2.4:** Click alert to navigate to DebtListPage filtered by overdue status

### US-3.3: Export customer statement
**As a** kế toán,
**I want to** export a customer debt statement as PDF/Excel,
**So that** I can send it to customers for payment follow-up.

**Status:** Not implemented. DebtDetailPage shows data but has no export.

**Tasks:**
- [ ] **T-3.3.1:** Add backend endpoint `GET /ledger/customers/:id/statement/export?format=pdf|xlsx` that generates downloadable file
- [ ] **T-3.3.2:** Add "Xuất sao kê" button to DebtDetailPage with PDF/Excel format selector
- [ ] **T-3.3.3:** PDF template: company header, customer info, trip-by-trip ledger with running balance, aging summary at bottom
- [ ] **T-3.3.4:** Excel export with same data in tabular format, auto-column-widths, conditional formatting for overdue rows

---

## EPIC 4: Driver Mobile Experience

### US-4.1: Driver views trip schedule on mobile
**As a** lái xe (driver),
**I want to** see my upcoming and past trips on my phone,
**So that** I know my schedule without calling the office.

**Status:** DriverTripsPage exists but uses desktop table layout, not mobile-first.

**Tasks:**
- [ ] **T-4.1.1:** Redesign DriverTripsPage with mobile-first card layout (stacked cards, not table rows)
- [ ] **T-4.1.2:** Each trip card shows: date, route name, truck plate, fuel allocated, status badge
- [ ] **T-4.1.3:** Tab navigation: "Sắp chạy" (upcoming) / "Đã hoàn thành" (completed)
- [ ] **T-4.1.4:** Tap card to expand trip detail with legs, fuel info, and notes
- [ ] **T-4.1.5:** Add pull-to-refresh on mobile

### US-4.2: Driver views earnings and penalties on mobile
**As a** lái xe,
**I want to** see my earnings breakdown and penalty history on my phone,
**So that** I understand my pay without asking accounting.

**Status:** DriverEarningsPage exists but uses desktop layout.

**Tasks:**
- [ ] **T-4.2.1:** Redesign DriverEarningsPage with mobile-first layout
- [ ] **T-4.2.2:** Show summary cards: "Lương cơ bản", "Lương sản lượng tháng này", "Tổng phạt", "Thực nhận"
- [ ] **T-4.2.3:** List recent trip incomes with date, route, and amount
- [ ] **T-4.2.4:** Penalty list with reason, amount, and date
- [ ] **T-4.2.5:** Monthly selector to view different periods

### US-4.3: Driver views fuel allocation on mobile
**As a** lái xe,
**I want to** see how much fuel is allocated for my trip,
**So that** I can verify I received the correct amount.

**Status:** Fuel info available in trip detail, but not highlighted for drivers.

**Tasks:**
- [ ] **T-4.3.1:** In driver trip detail view, add prominent fuel section: "Nhiên liệu cấp: X Lít" with breakdown by leg
- [ ] **T-4.3.2:** Show fuel mode (AUTO/FLAT_RATE) and norm reference so driver understands the calculation
- [ ] **T-4.3.3:** Show supplement fuel separately with reason if applicable

---

## EPIC 5: Dashboard & Reporting Enhancements

### US-5.1: Manager views real-time dashboard
**As a** quản lý,
**I want to** see a comprehensive dashboard with revenue, costs, gross profit, and fleet status,
**So that** I can make quick operational decisions.

**Status:** DashboardPage exists with KPIs and charts.

**Tasks:**
- [ ] **T-5.1.1:** Verify dashboard data matches backend `GET /reports/dashboard` endpoint
- [ ] **T-5.1.2:** Add monthly revenue trend line chart
- [ ] **T-5.1.3:** Add cost breakdown pie chart (fuel vs road allowance vs driver salary)
- [ ] **T-5.1.4:** Add top 5 profitable routes table
- [ ] **T-5.1.5:** Add fleet status overview (trucks in transit, available, maintenance)

### US-5.2: P&L report with drill-down
**As a** quản lý,
**I want to** view a monthly P&L report with drill-down to individual trips,
**So that** I understand what drives profitability.

**Status:** FinancePage calls `GET /reports/pnl`. Needs drill-down capability.

**Tasks:**
- [ ] **T-5.2.1:** In FinancePage, make monthly rows clickable to show trip-level breakdown
- [ ] **T-5.2.2:** Drill-down shows: per-trip revenue, cost components, gross profit
- [ ] **T-5.2.3:** Add export button for P&L report (Excel)
- [ ] **T-5.2.4:** Add year-over-year comparison view

---

## EPIC 6: Profit Distribution

### US-6.1: Profit distribution with cap table history
**As a** quản lý,
**I want to** execute quarterly profit distribution based on partner equity percentages,
**So that** each partner receives their correct share.

**Status:** ProfitPage and backend endpoint exist. Cap table management in ConfigPage.

**Tasks:**
- [ ] **T-6.1.1:** Verify distribution calculation uses correct cap table history percentages for the period
- [ ] **T-6.1.2:** Show distribution preview before execution: "Q1/2026 — Ông Thương: X VNĐ (29.55%), Ông Phụng: Y VNĐ (70.45%)"
- [ ] **T-6.1.3:** After execution, show immutable distribution records with confirmation
- [ ] **T-6.1.4:** Add historical distribution view: list all past distributions by quarter/year

---

## EPIC 7: Pre-existing Issues & Bug Fixes

### US-7.1: Fix frontend TypeScript compilation errors
**As a** developer,
**I want to** have zero TypeScript compilation errors in the frontend,
**So that** the codebase is maintainable and type-safe.

**Tasks:**
- [ ] **T-7.1.1:** Fix snake_case/camelCase property mismatches between backend API responses and frontend types (e.g., `entityType` vs `entity_type`, `distance` vs `distance_km`)
- [ ] **T-7.1.2:** Align frontend TypeScript interfaces with shared package types from `shared/src/types/index.ts`
- [ ] **T-7.1.3:** Run `cd frontend && npx tsc --noEmit` and fix all errors to zero

### US-7.2: Fix API endpoint consistency
**As a** developer,
**I want to** ensure all frontend API calls match backend endpoints,
**So that** no silent failures occur in production.

**Tasks:**
- [ ] **T-7.2.1:** Audit all `api.get/post/put/delete` calls across frontend for path correctness
- [ ] **T-7.2.2:** Ensure frontend uses shared constants for API paths where possible
- [ ] **T-7.2.3:** Verify all 96+ API calls return expected response shapes

---

## Implementation Priority

| Priority | Epic | Rationale |
|----------|------|-----------|
| **P0** | EPIC 7 (Bug fixes) | Foundation must be solid before adding features |
| **P1** | EPIC 1 (Trip mgmt) | Core operational flow — highest business value |
| **P1** | EPIC 3 (Receivables) | Financial control — 71% debt concentrated in 4 customers |
| **P2** | EPIC 2 (Fuel control) | Cost optimization — deferred per spec |
| **P2** | EPIC 5 (Dashboard) | Decision support |
| **P3** | EPIC 4 (Driver mobile) | Driver portal — read-only, lower urgency |
| **P3** | EPIC 6 (Profit distribution) | Quarterly action, not daily |

## Verification

After implementation of each epic:
1. `cd backend && npx tsc --noEmit` — zero errors
2. `cd frontend && npx tsc --noEmit` — zero errors
3. Start dev environment: `cd backend && npm run dev` + `cd frontend && npm run dev`
4. Login with each role (admin, manager, accountant, driver) and verify role-appropriate access
5. Test the specific epic's user stories manually in the browser
6. Verify audit logs capture all mutation actions with proper Vietnamese messages
