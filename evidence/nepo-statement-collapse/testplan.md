# NEPO-43 — Testplan & evidence: statement công nợ hết noise "Hoàn tác khóa chuyến"

Ticket: NEPO-43 · Branch: `fix/nepo-statement-edit-cycle-noise` · DB: local restore prod 16:30 (container `tingting-db`, database `tingting`), NAM PHONG = customer 7.

## Fixes

1. **Source** — `backend/src/services/trip-ledger-inputs.ts` (mới, helper thuần `ledgerInputsChanged`) + `backend/src/services/trip-mutations.service.ts` (nhánh `tripStatus === COMPLETED` của `updateTripFigures`): skip cả cặp `postTripUnlock` + `postTripLock` khi không có input ledger-relevant nào đổi. So sánh: revenue, driverSalary, carrierType, externalCarrierId, externalFreightCost, customerId, driverId, totalFuelCost, fuelActualUnitPrice, fuelPriceApplied, fuelSupplierId, fuel allocations (multiset supplier+liters+unitPrice+paymentMethod), fees (cùng list 2 bên nên không thể đổi trong 1 call — param giữ trên signature làm seam).
2. **Display collapse** — `backend/src/services/statement.service.ts`: `collapseEditCyclePairs()` ẩn cặp UNLOCK_REVERSAL + TRIP_REVENUE cùng `txnId` + cùng số tiền + cùng instant khỏi `ledgerRows` trả về (chi tiết). Chỉ áp dụng cho statement khách (`getStatementData`); aging/balance/periodSummary/unpaidTrips tính từ rows CHƯA collapse nên giữ nguyên.

## Local verify (API thật, backend :3090, data prod restore)

### Statement customer 7 — trước/sau fix

| | Trước fix | Sau fix |
|---|---|---|
| Chi tiết (`ledgerRows`) | 25 rows, 9 UNLOCK_REVERSAL noise | 7 rows, 0 UNLOCK_REVERSAL noise |
| totalOutstanding | 44.820.000 ₫ | 44.820.000 ₫ (giữ nguyên) |
| currentTotalOutstanding | 44.820.000 ₫ | 44.820.000 ₫ (giữ nguyên) |
| Các field khác (aging, periodSummary, unpaidTrips…) | — | **byte-identical** với trước fix |

9/9 cặp noise (trip 296 ×3, trip 297 ×3, trip 306 ×2, trip 7 ×1) collapse 1:1; net trước = net sau = 44.820.000 ₫.
Files: `statement-customer7-before.json`, `statement-customer7-after.json`, `ledger-customer7-before.csv`, `ledger-customer7-after.csv`.

### updateTrip COMPLETED qua API (PUT /api/trips/:id/actuals)

- **Trip 296 (TRP-202609-0020), payload KHÔNG đổi gì ledger-relevant** (mirror đủ số liệu đã lưu): ledger txnId=296 **16 → 16 rows, 0 row mới** — trước fix cặp save này sinh thêm 1 cặp noise. P&L figures trên trip giữ nguyên so với backup (revenue 6.480.000, driver_salary 384.615, total_fuel_cost 2.976.320, toll_cost 0, total_cost 4.539.856, gross_profit 1.460.144 — đối chiếu dump backup 16:30). File: `updatetrip-296-noop.json`.
- **Trip 297 (TRP-202609-0021), đổi revenue 6.480.000 → 7.000.000**: sinh **đúng 1 cặp mới trên ledger CUSTOMER** (UNLOCK_REVERSAL credit 6.480.000 + TRIP_REVENUE debit 7.000.000, cùng instant `09:20:36.790Z`) + cặp VENDOR fuel và DRIVER salary theo hành vi hiện tại cho thay đổi thật (16 → 22). Cặp mới khác số tiền → KHÔNG bị collapse, hiện đúng trong chi tiết; tổng công nợ 44.820.000 → 45.340.000 (+520.000 = đúng delta revenue). Files: `updatetrip-297-revchange.json`, `statement-customer7-after-realchange.json`.

Cách chạy lại: `scripts/capture-statement.mjs`, `scripts/verify-updatetrip.mjs` (cần `NEPO_TOKEN` admin JWT mint bằng JWT_SECRET của backend).

## Gates (số thật)

- Scoped tests mới: 21 pass — `ledger-inputs-changed.test.ts` (9 nhánh helper), `statement-collapse.test.ts` (10 nhánh collapse: same-instant ẩn, lone unlock hiện, khác instant/amount/txnId hiện, PAYMENT/PENALTY không đụng, 1:1 consumption, net không đổi), `trip-edit-cycle-ledger.test.ts` (2 integration DB: no-op không sinh row; đổi revenue sinh đúng cặp; save lặp cùng số liệu im lặng; statement không collapse cặp thật).
- FULL backend unit suite: `cd backend && npx tsx --test --test-concurrency=1 src/tests/*.test.ts` → **1033 tests: 1031 pass / 2 fail**. 2 fail (advance-request-amend-delete "deleting an APPROVED request…", comprehensive "E2E — Auth flow") là **pre-existing**: chạy lại với 2 file fix stash (code gốc) → fail y hệt.
- `cd backend && npx tsc --noEmit` → 0 lỗi.

## Phạm vi không đụng (đúng brief)

- Ledger append-only: không đụng data cũ, không migration/schema.
- aging.service.ts, ledger.service.ts: không đổi.
- API contract: giữ nguyên (PUT /actuals trả trip như cũ; statement shape giữ nguyên, chỉ ít row hơn trong chi tiết).
- Duplicate customer id 12 (NAM PHONG trùng tên trong data): chỉ report, KHÔNG merge. Fact: id 12 = cùng tên "CÔNG TY TNHH PHÁT TRIỂN DỊCH VỤ VẬN TẢI NAM PHONG", đã soft-delete ngày 2026-06-26 (deleted_at set), không còn active; ledger cũ của id 12 (nếu có) vẫn giữ nguyên theo append-only.

## Phát hiện phụ (report lại, không sửa)

- `notes: data.notes ?? null` trong updateTripFigures sẽ xoá notes đã lưu nếu payload không gửi `notes` — ngoài scope ticket này, nên cân nhắc ticket riêng.
