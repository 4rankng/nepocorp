---
title: Cập nhật projection và kiểm thử
status: completed
---

# Pha 01 — Cập nhật projection và kiểm thử

**Trạng thái:** Hoàn thành

## Bối cảnh

`computeTripTotals` lưu `totalRoadAllowance` là khoản ròng lái xe nhận, còn
`tollCost` là chi phí trạm riêng trong P&L. Trip list hiện cộng hai trường nên
diễn giải sai con số tại điểm đối chiếu lái xe.

## Thay đổi

- `frontend/src/features/trips/tripColumns.tsx`: thay tiêu đề thành `Tổng tiền
  đi đường lái xe nhận` và giá trị cột `road` sang `totalRoadAllowance`.
- `frontend/src/features/trips/TripMobileCard.tsx`: dùng cùng giá trị và nhãn.
- `frontend/src/features/trips/tripExports.ts` và thao tác xuất trực tiếp của
  `TripListPage.tsx`: xuất cùng giá trị và nhãn.
- Bổ sung/sửa focused tests và cập nhật tài liệu danh sách chuyến nếu cần.

## Không thay đổi

- Không đổi `computeTripTotals`, API, database, quick-edit input hoặc cách
  `totalCost`/`grossProfit` bao gồm `tollCost`.

## Xác minh

- [x] Fixture `totalRoadAllowance=2.480.000`, `tollCost=980.000` hiển thị/xuất
  đúng 2.480.000; không phải 3.460.000, ở cả mapper của nút Xuất CSV.
- [x] Chạy focused tests, shared trip-total tests và frontend typecheck/build.
- [ ] Kiểm tra ảnh render xác thực `/trips` ở desktop và kích thước điện thoại:
  bị chặn do môi trường local chỉ trả về màn hình đăng nhập, không có tài khoản
  được cung cấp.
