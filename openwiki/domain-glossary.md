---
type: domain-glossary
title: Vietnamese Domain Glossary
description: Mapping of Vietnamese business terms to system concepts — trip lifecycle states, ledger entity types, fuel modes, allowance rules, penalty semantics, salary periods, fleet & personnel.
tags: [glossary, vietnamese, domain, lifecycle, fuel, allowance, penalty, salary]
verified:
  - by: openwiki/0.5.0
    at: 2026-09-21T11:26:37.739Z
sources:
  - id: openwiki-source-d4152f04311d0c8c58c1afbe
    resource: repo://backend/src/casbin/policy.csv
  - id: openwiki-source-9157af8dcdd677c49fac3ce8
    resource: repo://backend/src/db/schema.ts
  - id: openwiki-source-a490be0187e4955ac4723d56
    resource: repo://backend/src/services/ledger.service.ts
  - id: openwiki-source-bfcd93e3d979ef79dcea9cab
    resource: repo://backend/src/services/trip-status-machine.service.ts
  - id: openwiki-source-39c3295efc089133e87a9c80
    resource: repo://CONTEXT.md
  - id: openwiki-source-f7fd2de8ba29e8649d8291fb
    resource: repo://shared/src/calculations/tripTotals.ts
  - id: openwiki-source-1d8ade489420d496695e0c37
    resource: repo://shared/src/constants/index.ts
generated: { by: "opencode", at: "2026-09-21T11:26:37.739Z" }
---

This page is a navigation index over `/CONTEXT.md`, which is authoritative. Use
the CONTEXT entries for canonical wording; this page is the cross-reference
table that maps each Vietnamese term to the system concept, the page that
implements it, and the relevant enums in `@tingting/shared/constants`.

## Trips (Chuyến xe)

| Term | English | System concept |
|---|---|---|
| Chuyến xe | Trip | `trips` table; `TripStatus` enum |
| Mới tạo | Created | `TripStatus.CREATED` |
| Đang chạy | In Transit | `TripStatus.IN_TRANSIT` |
| Hoàn thành | Completed | `TripStatus.COMPLETED` |
| Đã chốt | Locked / Finalized | `TripStatus.LOCKED` (post-trip-lock ledger entries are immutable) |
| Đã hủy | Canceled | `TripStatus.CANCELED` |
| Chặng | Leg | `trip_legs`; legs have `loading_type` (HANG/VO) |
| Hàng | Loaded | `LoadingType.HANG` |
| Vỏ | Empty | `LoadingType.VO` |

The 5-state lifecycle is enforced by `backend/src/services/trip-status-machine.service.ts`.
See [backend/services.md](backend/services.md) for the transition matrix.

## Financials (Tài chính)

| Term | English | System concept |
|---|---|---|
| Sổ cái | Ledger | `ledger` table — append-only |
| Công nợ phải thu | Accounts Receivable | Receivable read model (FIFO aging) |
| Công nợ phải trả | Accounts Payable | Payable read model on `entity_type='VENDOR'` |
| Doanh thu | Revenue | `TRIP_RECEIVED` ledger row |
| Chi phí | Cost / Expense | Expense flow (`expense_categories`, `expenses`, `expense_photos`) |
| Hóa đơn điều chỉnh | Adjustment E-Invoice | `ADJUSTMENT` ledger row + `debitNoteTemplates` |
| Phí quản lý | Management Fee | `management_fees` table; flat 24,000,000 ₫/month |
| Lợi nhuận gộp | Gross Profit | Per truck per month = Revenue − Trip Cost − Truck-linked Expenses |
| Lợi nhuận ròng | Net Profit | Gross Profit − Management Fee − Trailer/unassigned Expenses + Other Income |
| Thu nhập khác | Other Income | Penalty revenue (recorded here, NOT as expense) |
| Giấy báo nợ | Debit Note | `billing_documents` (`DEBIT_NOTE`) + `debit_note_templates` |
| Phân bổ lợi nhuận | Profit Distribution | `cap_table_history`, `truck_cap_table`, `distributions` |

The full glossary is in `/CONTEXT.md`. See
[backend/ledger.md](backend/ledger.md) for the ledger rules.

## Drivers / Customers / Forwarders

| Term | English | System concept |
|---|---|---|
| Lái xe | Driver | `drivers`; one driver per trip |
| Khách hàng | Customer | `customers` (`customer_status`: ACTIVE/LOCKED) |
| Nhà cung cấp | Vendor / Supplier | `suppliers` + `entity_type='VENDOR'` |
| Giao nhận / Forwarder | Forwarder | `FORWARDER` role + `trip_expenses` / `advance_requests` / `advance_settlements` |
| Chuyến chè | Tea cargo | Cargo type with universal photo rule before LOCKED |
| Lương sản lượng | Trip Income | Per-trip driver income field, separate from base salary |
| Kỷ luật | Penalty | Salary deduction, NOT company expense |

## Fuel & allowance

| Term | English | System concept |
|---|---|---|
| TTBQ | Fuel Consumption (L/100km) | `(total_liters / total_km) × 100`, derived |
| Định mức nhiên liệu | Fuel Norm | `fuel_empty_norm`, `fuel_loaded_norm` on routes; +3L/trip supplement |
| AUTO | Auto fuel calc | `FuelMode.AUTO` — Σ(leg × norm) × unitPrice |
| Khoán | Flat-rate fuel | `FuelMode.FLAT_RATE` — manual liters override |
| Bổ sung | Supplement | Add-on liters on top of AUTO or FLAT_RATE |
| Cây dầu ngoài | External pump (cash) | Virtual fuel supplier — cash fill, never enters Vendor debt |
| Giá nhiên liệu | Fuel unit price | `fuelPriceApplied` (snapshot) + `fuelActualUnitPrice` (override) |
| Lịch sử giá nhiên liệu | Fuel price history | `fuel_price_history` (append-only) |
| Tiền đi đường | Road allowance (cash) | `Tiền chuẩn - (Số trạm × 55k) ± Vé ± Trả hàng` |
| Tiền chuẩn | Base rate | Lookup table keyed by Route × TrailerType |
| Phí đường bộ | Annual road-use fee | Renewable `Expense Item`, NOT part of per-trip road allowance |
| Định mức nhiên liệu cố định | Fixed route fuel allowance | Per-route total fuel (e.g. Yên Sơn 180L) — overrides per-km |

The fuel + allowance math lives in
`shared/src/calculations/tripTotals` and is reused on both backend and frontend.
See [shared/calculations.md](shared/calculations.md).

## Penalties & salary

| Term | English | System concept |
|---|---|---|
| Kỷ luật | Penalty | `penalties` table; status `ACTIVE`/`CANCELED` |
| Lý do kỷ luật | Penalty reason | `penalty_reasons` catalog |
| Kỳ lương | Salary period | `salary_periods` (DRAFT → CONFIRMED) |
| Ngày công | Work day | `driver_work_days` (`workDayStatus`: TRIP_DAY/STANDBY/PERSONAL_LEAVE/WEEKLY_OFF) |
| Xác nhận lương | Salary confirmation | `salary_confirmations` (`salary_confirmation_status`) |
| Hoa hồng | Commission | `commission.service.ts`, deducted on top of base salary |

Penalties reduce the **driver's** salary debit balance; P&L surfaces them as
**Other Income**, not as company cost. See [backend/ledger.md](backend/ledger.md).

## Fleet & personnel

| Term | English | System concept |
|---|---|---|
| Xe đầu kéo | Tractor / Truck | `trucks` |
| Rơ-moóc | Trailer | `trailers` (TRAILER_TYPE: 20FT/40FT) |
| Lốp xe | Tire | `tires`, `tire_positions` (install/dispose/transfer lifecycle) |
| Lịch phương tiện | Vehicle Schedule | `vehicle_schedules` (MAINTENANCE/INSPECTION/INSURANCE/ROAD_FEE/DOCUMENT/OTHER) |
| Đội xe | Fleet | The driver / vehicle team managed from `/fleet` |

## System / audit / RBAC

| Term | English | System concept |
|---|---|---|
| Sự kiện / Hành động | Intention (audit) | One mutation API call = one audit row |
| Vai trò | Role | ADMIN / MANAGER / ACCOUNTANT / DRIVER / FORWARDER |
| Quyền | Permission | Casbin policy (`backend/src/casbin/policy.csv`) |
| Quản trị viên | Admin | `Role.ADMIN` (full access; not a business user) |
| Giám đốc | Manager / Director | `Role.MANAGER` |
| Kế toán | Accountant | `Role.ACCOUNTANT` (financial-fields-only trip writes) |
| Lái xe | Driver | `Role.DRIVER` (mobile portal) |

## Reference docs

- Authoritative glossary — `/CONTEXT.md`
- Product spec — `PRODUCT-SPECS.md`
- Trip-lifecycle QA guide — `docs/flows/DELIVERY_TRIP_LIFECYCLE.md`
- Per-role test scripts — `docs/flows/00-…15-*.md`
