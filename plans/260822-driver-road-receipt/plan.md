---
title: Hiển thị tiền đi đường lái xe nhận
status: completed
priority: P2
effort: small
branch: main
tags: [trips, finance, export]
created: 2026-08-22
---

# Hiển thị tiền đi đường lái xe nhận

**Trạng thái:** Hoàn thành  
**Phạm vi:** Danh sách chuyến `/trips`, thẻ di động và CSV.

## Mục tiêu

Hiển thị đúng khoản lái xe thực nhận: `totalRoadAllowance`. Không cộng
`tollCost` vào con số này; phí trạm vẫn thuộc tổng chi phí và lợi nhuận của
chuyến.

## Pha

1. [Pha 01 — Cập nhật các projection và kiểm thử](phase-01-projections-and-tests.md) — Hoàn thành

## Tiêu chí hoàn thành

- Cột bảng và CSV dùng nhãn `Tổng tiền đi đường lái xe nhận`.
- Bảng, thẻ di động và CSV cùng hiển thị `totalRoadAllowance`.
- `totalCost`, `grossProfit`, backend, schema và công thức tính không thay đổi.
- Kiểm thử focused và typecheck/build frontend xác nhận không hồi quy.
