# 16 — Lô hàng (Shipment) và liên kết Chuyến

> NEPO-61 — module quản lý lô hàng biển: mã tự động, thông tin biển, chứng từ, chi phí, giấy báo nợ và gắn chuyến vào lô.

---

## 1. Tổng quan

Lô hàng (shipment) là **đối tượng cha** của side vận tải biển: một lô gom booking, tờ khai hải quan, chứng từ, chi phí, các chuyến xe kéo cont và giấy báo nợ của cùng một lô hàng cho một khách hàng.

| Khái niệm | Lưu trữ | Ghi chú |
|---|---|---|
| Lô hàng | `shipments` | mã tự động, thông tin biển, tờ khai HQ |
| Chứng từ | `shipment_documents` | file PDF/ảnh lưu trên đĩa (`shipments/<id>/...`), row chỉ đăng ký |
| Chi phí lô | `shipment_costs` | 6 nhóm phí FeeGroup, thu/ trả NCC, VND/USD, "chờ hóa đơn" |
| Chuyến liên quan | `trips.shipment_id` | chi phí chạy xe tự động trừ vào lợi nhuận lô |
| Giấy báo nợ | `billing_documents.shipment_id` | một báo nợ chính/lô (partial unique index) |

## 2. Mã lô tự động

Định dạng `[Mã KH][Năm][STT]` — ví dụ **MCT26026** = MCT + năm 26 + số thứ tự 026.

- Tiền tố = `shortName` của khách hàng (bỏ dấu, đ→D, chỉ A–Z0–9, tối đa 6 ký tự, tối thiểu 2). Khách chưa có tên viết tắt hợp lệ → chặn tạo lô với lỗi tiếng Việt rõ ràng.
- STT theo **tiền tố + năm**, cấp phát trong transaction với advisory lock — hai lô tạo đồng thời không trùng số. Nếu một khách có >999 lô/năm, STT tự mở rộng 4 chữ số (không cắt cụt).
- Không thể **đổi khách hàng** của lô sau khi tạo (mã gắn với Mã KH).

## 3. Thông tin biển (lô)

Hãng tàu, Số Booking, Số B/L, Tàu/Chuyến, POL/POD, ETD/ETA, Cut-off, Số cont/Seal (dạng tự do; số cont/seal chính xác từng chuyến vẫn nằm ở `trip_containers`/`trip_container_seals`), Tờ khai HQ (số + ngày), Loại hình **Xuất/Nhập** (`flowType` — quyết định thứ tự phí trên báo nợ).

## 4. Chứng từ

Upload trực tiếp trên chi tiết lô: **B/L, C/O, Kiểm dịch, Hun trùng, Booking, Tờ khai, Khác**. PDF/JPG/PNG/WEBP ≤15MB, lưu nguyên bản (không re-encode), tải xuống lại đúng file gốc. Xóa chứng từ cho phép (sai upload), xóa lô thì không có endpoint.

## 5. Chi phí lô và lợi nhuận

Mỗi dòng chi phí mang: nhóm FeeGroup (Cước biển / Nộp hộ hãng tàu / DV Hải quan / DV Chứng từ / Cước bộ / Nâng hạ / Khác), chiều **Thu khách** hay **Trả NCC**, Dịch vụ/Nộp hộ, VND (số nguyên) hoặc USD (giữ fxAmount + tỷ giá, VND được server làm tròn), VAT, và cờ **Chờ hóa đơn** (in không có số tiền trên báo nợ, không vào tổng).

**Lợi nhuận lô** (thẻ chi tiết + `/api/shipments/:id/costs/register`):

```
Lợi nhuận = Doanh thu (Σ giấy báo nợ của lô, gồm VAT)
          − Chi trả NCC (Σ direction=SUPPLIER, trừ dòng chờ hóa đơn)
          − Chi chạy xe (Σ totalCost chuyến OWN / externalFreightCost chuyến EXTERNAL, trừ chuyến đã hủy)
```

Chi phí chạy xe **không** nhập tay — chuyến gắn lô tự động cộng vào. Nhóm "Nộp hộ hãng tàu" chỉ dùng đối soát (đã nằm trong Trả NCC).

## 6. Gắn chuyến vào lô

- Cột **MÃ LÔ HÀNG** ở Sổ chuyến (`/trips`) + ô chọn lô ở tạo/sửa chuyến; chỉnh sửa dùng `PATCH /api/trips/:id/shipment` (null = gỡ).
- Ràng buộc: chuyến chưa chốt/hủy; lô phải **cùng khách hàng** với chuyến.
- Chuyến đường bộ/thủy không gắn lô giữ nguyên sổ Tháng+Chuyến như cũ.

## 7. Phân quyền (4 vai trò)

| Vai trò | Lô hàng | Chứng từ / Chi phí | Chuyến | Giấy báo nợ |
|---|---|---|---|---|
| **Ops biển** (FORWARDER) | tạo/sửa | tạo/sửa/xóa | — (chỉ xem lô) | xem |
| **Điều xe** (DISPATCHER) | xem | — | tạo/sửa, gắn lô | — |
| **Kế toán** (ACCOUNTANT) | xem (+ sửa chi phí qua SHIPMENT_WRITE_ROLES) | sửa chi phí | số liệu | **tạo + chốt** |
| **Admin** (ADMIN) | toàn quyền | toàn quyền | toàn quyền | **sửa báo nợ đã phát hành (có log audit)** |

- Casbin resource `shipments`: MANAGER/ACCOUNTANT/DISPATCHER `read`; MANAGER/FORWARDER `write`/`delete`; ADMIN wildcard.
- **PUT/DELETE `/api/finance/billing-documents/:id` giờ chỉ còn ADMIN** (trước đây MANAGER/ACCOUNTANT cũng sửa được) — thay đổi hành vi có chủ đích theo yêu cầu NEPO-61. Mọi sửa đều qua audit log tiếng Việt có sẵn.

## 8. API chính

| Method | Path | Ghi chú |
|---|---|---|
| GET/POST | `/api/shipments` | danh sách (search mã lô/booking/B/L/khách) / tạo |
| GET/PUT | `/api/shipments/:id` | chi tiết (documents, costs, trips, profit, báo nợ) / sửa |
| POST/DELETE | `/api/shipments/:id/documents[/:docId]` | upload multipart / xóa |
| GET | `/api/shipments/:id/documents/:docId/file` | tải file gốc |
| POST/PUT/DELETE | `/api/shipments/:id/costs[/:costId]` | chi phí |
| GET | `/api/shipments/:id/costs/register` | bảng chi phí theo lô (nhóm FeeGroup + chi chạy xe) |
| PATCH | `/api/trips/:id/shipment` | gắn/gỡ chuyến |

## 9. QA checklist

1. Tạo lô cho khách có shortName → mã đúng mẫu `MCT26026`, tạo tiếp → STT +1; khách khác → STT riêng từ 001.
2. Khách thiếu tên viết tắt → chặn tạo với lỗi tiếng Việt.
3. Upload chứng từ PDF → tải xuống lại đúng file; xóa → mất khỏi danh sách.
4. Thêm chi phí thu khách 30tr + trả NCC 1tr + chờ hóa đơn 5tr + chuyến 18tr → lợi nhuận = −19tr (chờ hóa đơn không vào tổng).
5. Gắn chuyến khách khác → lỗi 400; gắn chuyến đã chốt → lỗi 400; gỡ lô → cột MÃ LÔ HÀNG trống.
6. Kế toán sửa báo nợ đã phát hành → 403; Admin sửa → thành công + có dòng audit.
7. FORWARDER thấy menu Lô hàng (tạo/sửa được); DISPATCHER thấy menu mới ở lane NEPO-63; DRIVER không thấy.
