---
title: Công thức, dữ liệu lịch sử và projection
status: completed
---

# Pha 01 — Công thức, dữ liệu lịch sử và projection

## Nguồn sự thật

- `shared/src/calculations/tripTotals.ts` tính và lưu các tổng chuyến.
- `twoPointDeliveryBonus` là khoản chi đã nằm trong `totalCost` trước thay đổi.
- `totalRoadAllowance` được hiển thị ở danh sách, mobile, CSV và phần lái xe.

## Thay đổi

1. Cộng `twoPointDeliveryBonus` vào `totalRoadAllowance` sau khi áp dụng điều chỉnh tiền đi đường.
2. Loại riêng khoản đó khỏi phép cộng `totalCost` để tổng chi phí và lợi nhuận không đổi.
3. Thêm custom Drizzle migration, giới hạn cho chuyến `OWN` không hủy có trả hàng 2 điểm, để cộng đúng khoản vào số tiền đi đường cũ mà không đụng `totalCost`/`grossProfit`.
4. Cập nhật phép đối chiếu chi tiết tài chính, metric contract và tài liệu để không diễn giải hoặc cộng lặp.
5. Bổ sung regression tests cho công thức, export và đối chiếu tài chính.

## Rủi ro và hoàn tác

- Migration chỉ đổi phân loại một trường derived. Hoàn tác bằng phép trừ `two_point_delivery_bonus` với cùng điều kiện; không cần phục hồi `total_cost`, `gross_profit` hay ledger.
- Migration không được chạy trong task này; áp dụng theo quy trình deploy được phê duyệt.

## Xác minh

- Frontend regression: 7 file, 26 tests.
- Shared calculation: 30 tests; metric registry backend: 30 tests.
- Typecheck shared/backend/frontend và production frontend build thành công.
