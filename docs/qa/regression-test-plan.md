# Regression Test Plan — Bug Register

> Mục đích: mỗi bug đã fix → một ca kiểm thử hồi quy. Chạy toàn bộ register trước
> mỗi lần deploy production/demo để bắt bug tái phát. Ca kiểm thử thực thi chi
> tiết (auth, lifecycle, catalog) nằm ở [`test-checklist.md`](./test-checklist.md);
> runbook deploy lên staging xem [`staging-qa-flow.md`](./staging-qa-flow.md).

## Cách dùng

1. Trước deploy: chạy các ca có trạng thái khác SKIP.
2. Bug mới được fix → thêm ca mới với ID tiếp theo (BUG-REG-xxx), ghi rõ
   symptom / repro / expected / guard (test tự động + thủ công nếu có).
3. Bug tái phát → mở lại ca, điều tra vì sao guard không bắt được, tăng cường guard.

## Ca kiểm thử hồi quy

| ID | Khu vực | Bug (symptom) | Repro | Expected | Root cause (đã fix) | Guard |
|----|---------|---------------|-------|----------|---------------------|-------|
| BUG-REG-001 | Trip form — Phân bổ nơi đổ dầu | Chỉ hiện "Cây dầu ngoài", mất các cây dầu (nhà cung cấp) trong form sửa chuyến | Sửa một chuyến OWN: Danh mục (DANH MỤC → Nhà cung cấp dầu) có ≥1 cây dầu ACTIVE; mở Sổ chuyến đi → chọn chuyến OWN → Chỉnh sửa → card "Nhiên liệu" | Hiện đủ: mỗi cây dầu ACTIVE trong Danh mục + dòng "Cây dầu ngoài"; tổng "Đã phân bổ" cập nhật khi nhập lít; không tăng kép khi catalog refetch | Khi trip query trả về sau catalogs (đã cache), effect nạp dữ liệu chuyến (`useTripFormDispatch` trip-load) ghi đè rows bằng saved-only rows; effect chuẩn hóa của editor không chạy lại vì deps không đổi. Fix: thêm `rowKeys` vào deps để reseed luôn kích hoạt re-normalize. | `frontend/src/components/trip/FuelAllocationEditor.test.ts` (8 ca, incl. reseed merge); thủ công: mở edit page chuyến OWN, đếm số dòng phân bổ = N suppliers + 1 |
| BUG-REG-002 | P&L — Xăng dầu | P&L đếm kép chi phí nhiên liệu khi có expense "Xăng dầu" riêng | Tạo expense Xăng dầu cho chuyến có total_cost đã gồm nhiên liệu → xem P&L tháng | Chi phí nhiên liệu không bị tính 2 lần; nếu Redis cache cũ, flush `reports:*` | `getPnlReport` cộng thêm fuel expense ngoài trip.total_cost vốn đã chứa fuel. Fix: loại trừ fuel khỏi expense aggregation khi đã nằm trong total_cost. | Thủ công: so tổng fuel P&L vs Σ trip.total_fuel_cost cho cùng kỳ; flush `reports:*` trước khi so |
| BUG-REG-003 | Driver road allowance | totalRoadAllowance sai sau reclassification (toll lệch, thiếu bonus 2 điểm) | Mở chi tiết chuyến OWN có toll/bonus; so `totalRoadAllowance` vs công thức (toll excluded, twoPointDeliveryBonus gộp) | `totalRoadAllowance` = toàn bộ tiền đường driver nhận; toll không cộng vào allowance (toll paid by company) | Reclassification `0e6d8d37` + `9cb93bb1` (đã deploy prod 2026-08-22); 2 bug review: P&L double-count + quick-edit derived-field seeding | Shared calc tests (`shared/` calc tests) + thủ công: quick-edit override round-trip giữ nguyên giá trị |
| BUG-REG-004 | Fuel price snapshot vs actual | Sửa giá dầu làm sai lịch sử chuyến cũ | Mở chuyến LOCKED/COMPLETED cũ → sửa cấu hình giá dầu → mở lại chuyến cũ | Chuyến cũ giữ `fuelPriceApplied` (snapshot); effective = `fuelActualUnitPrice ?? fuelPriceApplied` | Snapshot immutable; actual-only mutation. Legacy NULL = spec-permitted (không phải bug). | Thủ công: sửa giá cấu hình → chuyến cũ không đổi |
| BUG-REG-005 | Ledger append-only | Sửa/bật lại kỳ lương làm mất dòng ledger | Unlock kỳ lương (CONFIRMED→DRAFT) → kiểm tra ledger | Ledger append-only: unlock tạo UNLOCK_REVERSAL, reconcile = ADJUSTMENT; không có DELETE/UPDATE destructive | Thiết kế append-only; unlock path dùng UNLOCK_REVERSAL | Thủ công: unlock → đếm dòng ledger trước/sau (chỉ thêm, không mất) |
| BUG-REG-006 | Tire transfer | Lốp dự phòng mount lên xe khác mất `installedAt` | Trạm lốp: transfer lốp dự phòng → mount lên xe | `installedAt` được giữ nguyên qua transfer; transfer atomic; 3-dot kebab menu có Transfer | Fix: `POST /transfer` atomic + preserve installedAt | Thủ công: transfer → mount → kiểm tra installedAt trong trang lốp |
| BUG-REG-007 | VAT asymmetry | Biên lợi nhuận dịch vụ âm/sai do VAT | Chuyến dịch vụ: doanh thu ex-VAT, chi phí incl-VAT | Doanh thu ex-VAT, chi phí incl-VAT (spec §4.6.1); service margin = sell ex-VAT, buy incl-VAT | Quy ước VAT bất đối xứng (locked design) | Thủ công + shared calc tests |
| BUG-REG-008 | Demo snapshot anonymization | Dữ liệu thật lộ trong demo.tingting.vip | Vào demo.tingting.vip, rà các trang chính | 0 identifier leak (tên/điện thoại/mã thuế thật); password chung Abc123 | One-time anonymized snapshot (2026-09-03); refresh procedure trong [[demo-staging-anonymization]] memory | Trước mỗi refresh demo: rerun anonymization checks (0/185 leaks) |
| BUG-REG-009 | List pages | Phân trang tải toàn bộ dữ liệu client-side | Mở list page đã migrate server-side pagination (`dab54734`) | List page dùng server-side pagination (`{items,total}`), không fetch-all | `dab54734` (2026-08-23); suite quirks: `--test-force-exit` REQUIRED cho backend tests; non-hermetic flakiness | Thủ công: mở list page → network tab: có `page`/`limit` params |
| BUG-REG-010 | Chatbot navigate | Bot chỉ in `/path` dạng text, không điều hướng | Nhắn bot "mở trang công nợ" | Bot điều hướng thật (navigate directive), không in path dạng text | Infra navigate+highlight tồn tại; LLM phải dùng ui.navigate | Thủ công: nhắn bot lệnh điều hướng → SPA đổi trang |
| BUG-REG-011 | Tìm kiếm địa điểm (autocomplete) | Gõ tên công ty/địa điểm không ra — phải copy-paste từ Google Maps | Gõ "SINOVNL" hoặc "Trà Xanh Ngọc" vào ô địa điểm (tạo chuyến, cấu hình tuyến) | Ra đúng gợi ý tên công ty như Google Maps; gõ 2 ký tự là có gợi ý | Đổi nguồn autocomplete sang Google Places Autocomplete (New) + fallback Geocoding; `languageCode: 'vi'`; sessiontoken xuyên suốt; `geocodePlace` thêm comma-tail fallback; cache v3; Places-outage chỉ cache 5 phút | Trực quan: gõ "SINOVNL" → ra bãi SINOVNL Hải Phòng; test `map4d.test.ts` 18/18 |

## Chạy tự động (mỗi PR/deploy)

- Frontend unit: `cd frontend && npx vitest run`
- Backend: `cd backend && npm test` (integration cần PG+Redis; lưu ý `--test-force-exit`)
- Shared calc: chạy qua backend tests + frontend vitest

## Liên quan

- Execution checklist theo iteration: [`test-checklist.md`](./test-checklist.md)
- Staging runbook: [`staging-qa-flow.md`](./staging-qa-flow.md)