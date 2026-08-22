---
title: Gộp trả hàng 2 điểm vào tiền đi đường lái xe nhận
status: completed
priority: P1
effort: small
branch: main
tags: [trips, finance, driver, migration]
created: 2026-08-22
---

# Gộp trả hàng 2 điểm vào tiền đi đường lái xe nhận

**Mục tiêu:** `totalRoadAllowance` là toàn bộ tiền đi đường thực nhận của lái xe: tiền đi đường đã tính/điều chỉnh cộng với **Trả hàng 2 điểm**. Phí trạm và Lưu ca xe vẫn là khoản riêng.

## Pha

1. [Pha 01 — Công thức, dữ liệu lịch sử và projection](phase-01-calculation-and-backfill.md) — Hoàn thành

## Tiêu chí hoàn thành

- Với tiền đi đường 2.380.000đ và Trả hàng 2 điểm 100.000đ, `totalRoadAllowance` là 2.480.000đ.
- `totalCost` và `grossProfit` không đổi; Trả hàng 2 điểm không bị cộng hai lần.
- Chuyến đã lưu được tái phân loại an toàn, có điều kiện, chỉ cho xe nhà không hủy.
- Bảng `/trips`, thẻ di động, CSV, chi tiết tài chính và tổng tiền lái xe nhận dùng cùng giá trị.
- Kiểm thử tính toán, projection và build/typecheck phù hợp đều qua.

## Kết quả

- `Tổng tiền đi đường lái xe nhận` đã gồm Trả hàng 2 điểm; 2.380.000đ + 100.000đ hiển thị/lưu là 2.480.000đ.
- Dòng tổng chi phí, phần chi tiết và tổng dòng export không cộng lặp Trả hàng 2 điểm.
- Migration được tạo nhưng chưa chạy trên môi trường dùng chung hay production.

## Ngoài phạm vi

- Không đổi giá trị phí trạm, Lưu ca xe, lương sản lượng, sổ cái, hay tổng chi phí/lợi nhuận của bất kỳ chuyến nào.
- Không chạy migration lên môi trường dùng chung hoặc production trong task này.
