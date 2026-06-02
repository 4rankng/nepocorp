# Test Execution Checklist — MANAGER (Quản lý)

> **Source guide:** `huong_dan_test_quan_ly.md` (4 scenarios scoped to MANAGER role)
> **Method:** One flow per item, MANAGER `phung` is the primary actor. Bridge to ACCOUNTANT/FORWARDER only where the guide explicitly demands it (e.g. fee created by forwarder → manager approves).
> **Hard cap 2 bugs per Phase 1 pass.**
>
> **Test accounts** (all pwd `admin123`):
> - MANAGER → `phung`
> - ACCOUNTANT → `anh`
> - FORWARDER → `quan`
> - DRIVERS → `thu`, `pho`, `quyet`, `quannt`
>
> **App URL:** http://localhost:7173/

Legend: `[ ]` pending · `[~]` in progress · `[x]` Passed · `[!]` Bug filed (see iteration)
Provenance: `via SCC-XX` means already verified in `service-cost-checklist.md` item XX — not retested unless guide demands UI exercise.

---

## M1. Cấu hình & Loại phí (Scenario 1 / Bước 1)

- [x] **M1.1** MANAGER `/config` shows "Loại chi phí giao nhận" card. Verify **8** entries with the exact Vietnamese names from the guide. — PASSED iter 01
- [x] **M1.2** Default VAT for entries is **8%** (or system VAT rate); each row exposes `defaultMarkup` + `billingLabel` + `vatRate` columns (depth of SCC-F1.8 needs UI confirmation as MANAGER, not ACCOUNTANT). — PASSED iter 01

## M2. Tạo phí dịch vụ đi kèm (Scenario 1 / Bước 2)

- [ ] **M2.1** From `/trips/:id` on a trip in `Mới tạo` / `Đang chạy` state, MANAGER can add an ancillary fee with: type select, buyPrice, sellPrice, settlement choice, supplier (when COMPANY_DIRECT), container number, invoice/declaration number per type. UI-only sanity check — schema is via SCC-F1.1/1.2.
- [ ] **M2.2** sellPrice is editable independently of buyPrice (no auto-resync after edit) — guide explicitly requires this.
- [ ] **M2.3** UI computes & displays Lãi DV = sellPrice − buyPrice live in the row.
- [ ] **M2.4** CUSTOMS fee without **Số tờ khai** → form-level validation error in UI (not backend 400 only). SCC-F1.4 verified backend; this is UI-side.
- [ ] **M2.5** Saving a row renders it in the grid with the correct margin column value.

## M3. Phê duyệt phí do Giao nhận sửa (Scenario 1 / Bước 3)

- [ ] **M3.1** MANAGER opens the trip whose forwarder-edited fee is `PENDING` and sees **"Chờ duyệt"** badge (cam/orange). UI-side, not API.
- [ ] **M3.2** MANAGER clicks approve in the UI and the badge flips to **"Đã duyệt"** without a hard refresh.

## M4. Khai báo Đối tác vận tải (Scenario 2 / Bước 1)

- [ ] **M4.1** MANAGER `/customers` form has `isCarrier` toggle + `debitNoteMode` (Theo tháng / Theo lô) + `linkedSupplierId` picker. UI sanity — SCC-F2.1 verified existence.
- [ ] **M4.2** Toggling `isCarrier` reveals dispatch-related fields without page reload.

## M5. Lập chuyến xe thuê ngoài (Scenario 2 / Bước 2)

- [ ] **M5.1** MANAGER `/trips/new` toggle to **Xe ngoài** hides Đầu kéo + Lái xe nhà selectors.
- [ ] **M5.2** Carrier dropdown lists only `is_carrier=true` customers (UI exercise).
- [ ] **M5.3** External plate + driver name + driver phone are required (UI-side Zod error) — SCC-F2.5 verified at API; verify form blocks submit.
- [ ] **M5.4** Lãi điều xe display shows `(sellPriceExVat − buyPriceExVat)` ex-VAT math live.

## M6. Khóa chuyến xe ngoài & Sổ cái (Scenario 2 / Bước 3) — gap, code-verified only

- [ ] **M6.1** MANAGER transitions an EXTERNAL trip: `Mới tạo → Đang chạy → Hoàn thành → Đã chốt` via UI.
- [ ] **M6.2** Open carrier customer's `/debt/:id` ledger; verify CREDIT (Có) entry for `EXTERNAL_CARRIER_COST` and balance is negative (company owes carrier). SCC-F2.7 was code-only.
- [ ] **M6.3** Same ledger: verify **NO** driver-salary entry was posted for the external trip.
- [ ] **M6.4** Customer (mua dịch vụ) ledger has DEBIT (Nợ) for revenue as usual.

## M7. Đối tác 2 chiều (Scenario 3 / Bước 1)

- [ ] **M7.1** MANAGER (or ACCOUNTANT — pivot to `anh`) on `/customers/:id` links to a Supplier and vice-versa; the inverse link appears on Supplier side. UI exercise of SCC-F3 setup.

## M8. Bảng danh sách công nợ — 2 chiều + Net (Scenario 3 / Bước 1.3)

- [ ] **M8.1** MANAGER `/debt` shows "2 chiều" green badge for the linked partner — UI confirm of SCC-F3.1.
- [ ] **M8.2** Net công nợ column displays `Phải thu − Phải trả` for that partner — UI confirm of SCC-F3.2.

## M9. Tạo yêu cầu đối trừ (Scenario 3 / Bước 2 — accountant)

- [ ] **M9.1** Login as `anh` (ACCOUNTANT). `/debt/:id` of dual partner shows **"Công nợ phải trả (NCC liên kết)"** orange box + **"Đối trừ công nợ"** button. SCC-F3.3 UI confirm.
- [ ] **M9.2** Modal opens; amount is `min(AR, AP)` and **read-only** (no editable input). SCC-F3.4 UI confirm.
- [ ] **M9.3** Submitting creates a request with `Chờ duyệt` status; AR/AP balances are NOT changed yet. SCC-F3.5 UI confirm.

## M10. MANAGER phê duyệt đối trừ (Scenario 3 / Bước 3)

- [ ] **M10.1** MANAGER `phung` opens the same `/debt/:id` and sees the pending offset under "Lịch sử đối trừ" with orange badge.
- [ ] **M10.2** Approve action flips status → APPROVED; reload shows AR balance reduced by offset amount AND AP balance reduced by the same amount. SCC-F3.6 code-verified; verify via UI.
- [ ] **M10.3** Customer ledger shows an ADJUSTMENT row reducing receivable; Supplier ledger shows an ADJUSTMENT row reducing payable.

## M11. Giấy báo nợ — Monthly (Scenario 4 / Bước 1 — SCC-F5 was code-only)

- [ ] **M11.1** MANAGER on customer with `debitNoteMode = MONTHLY` clicks **Xuất Giấy báo nợ**, picks the month, downloads file.
- [ ] **M11.2** Open XLSX: FREIGHT (cước chính) is a distinct row from each ancillary fee. Each fee appears on its own row with container/declaration/invoice columns populated.
- [ ] **M11.3** A `PENDING` ancillary fee on a locked trip does NOT appear; only `APPROVED` fees on locked trips.

## M12. Giấy báo nợ — Per-batch (Scenario 4 / Bước 1)

- [ ] **M12.1** MANAGER on customer with `debitNoteMode = PER_BATCH` is required to pick specific trips before export — UI gates correctly.
- [ ] **M12.2** Exported XLSX has the same itemized structure as M11.2.

## M13. Báo cáo Kết quả Kinh doanh (Scenario 4 / Bước 2 — SCC-F1.10 / F2.9 code-only)

- [ ] **M13.1** MANAGER `/finance` shows row **"Lãi dịch vụ đi kèm"** when at least one locked trip has approved fees with non-zero margin.
- [ ] **M13.2** Same page shows row **"Doanh thu điều xe ngoài (lãi quản lý)"** when at least one EXTERNAL trip is locked with non-zero margin.
- [ ] **M13.3** External trips are grouped under "Xe ngoài" and do NOT pull in fuel/driver-salary/maintenance lines of the own fleet.

## M14. Mẹo: kiểm tra thuế (Tips)

- [ ] **M14.1** Create a freight line with `sellPriceInclVat = 10,800,000` at `vatRate = 8%`. Verify P&L / pre-VAT revenue is exactly **10,000,000 VND** (no rounding drift), confirming the `freightExVat = revenue / (1 + vatRate)` math.

## M15. Mẹo: bất biến sổ cái sau khóa chuyến (Tips)

- [ ] **M15.1** On a `Đã chốt` trip, the **edit + delete buttons on each ancillary fee row are hidden**. Adjustments must go through a separate adjustment voucher flow (or be flagged UI-side as "khóa").

## M16. Mẹo: tìm kiếm theo container (Tips)

- [ ] **M16.1** On `/trips` list, type a known container number into the search bar — only trips with that container appear.
- [ ] **M16.2** On `/debt` list, same container search filters correctly.

---

## Iteration Tracker

| # | Date | Item(s) | Bugs Found | Status |
|---|------|---------|------------|--------|
| _none yet_ | | | | |

---

## Status

- **Items total:** 38
- **Items pending:** 38
- **Items passed:** 0
- **Items with bug:** 0

> **Cross-ref:** Many M1–M5 items have backend coverage in `service-cost-checklist.md`. This list re-exercises through UI as MANAGER per `huong_dan_test_quan_ly.md`. M6/M11–M13/M14–M16 are genuine gaps from "code-verified only" or "tip" entries in prior runs.
