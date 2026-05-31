# Chi phí vận hành, Nhà cung cấp & Công nợ phải trả

> Tài liệu QA testing & Hướng dẫn sử dụng — Danh mục Nhà cung cấp, nhập phiếu chi phí (sửa chữa/phụ tùng/bảo hiểm/đăng kiểm/phí đường bộ), công nợ phải trả, nhắc gia hạn
> **Routes:** `/suppliers`, `/expenses`, `/payables`, `/payables/:id` (+ khối "Hạng mục chi phí" trong `/config`)
> **Roles:** ADMIN, MANAGER, ACCOUNTANT (DRIVER không truy cập được)

---

## 1. Tổng quan

### 1.1 Mô tả

Module bổ sung phần chi phí vận hành mà quy trình Excel cũ vẫn theo dõi nhưng web MVP còn thiếu: **sửa chữa, phụ tùng, vật tư, bảo hiểm, đăng kiểm, phí đường bộ**. Gồm 4 phần:

1. **Nhà cung cấp (NCC)** — danh mục mọi bên nhận tiền (gara, trạm lốp, cửa hàng phụ tùng, công ty bảo hiểm, trung tâm đăng kiểm, đơn vị thu phí đường bộ).
2. **Hạng mục chi phí** — danh mục cấu hình được; mỗi hạng mục là **một lần** hoặc **định kỳ** (có nhắc gia hạn).
3. **Phiếu chi phí** — ghi nhận một khoản chi, gắn NCC + (tùy chọn) một xe, **trả ngay** hoặc **ghi nợ**.
4. **Công nợ phải trả** — số tiền đang nợ NCC, tuổi nợ, ghi nhận thanh toán.

### 1.2 Phân quyền

| Vai trò | Danh mục NCC | Hạng mục CP | Nhập phiếu CP | Công nợ phải trả | Thanh toán NCC |
|---------|:------------:|:-----------:|:-------------:|:----------------:|:--------------:|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ✅ | ✅ | ✅ | ✅ |
| ACCOUNTANT | ✅ | ✅ | ✅ | ✅ | ✅ |
| DRIVER | ❌ | ❌ | ❌ | ❌ | ❌ |

### 1.3 API Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET/POST/PUT/DELETE` | `/api/suppliers` | JWT + config:* | CRUD Nhà cung cấp |
| `GET/POST/PUT/DELETE` | `/api/expense-categories` | JWT + config:* | CRUD Hạng mục chi phí |
| `GET` | `/api/expenses` | JWT + financial:read | Danh sách phiếu chi phí (lọc theo xe/NCC/hạng mục/khoảng ngày) |
| `POST` | `/api/expenses` | JWT + financial:write | Tạo phiếu chi phí (PAID/UNPAID) |
| `PUT` | `/api/expenses/:id` | JWT + financial:write | Sửa phiếu (ADJUSTMENT bù trừ nếu đã ghi nợ) |
| `DELETE` | `/api/expenses/:id` | JWT + financial:write | Soft-delete (ADJUSTMENT bù trừ nếu đã ghi nợ) |
| `GET` | `/api/reports/payables-summary` | JWT + financial:read | Tổng hợp công nợ phải trả + tuổi nợ |
| `GET` | `/api/ledger/suppliers/:id/statement` | JWT + financial:read | Sao kê chi tiết NCC |
| `POST` | `/api/payments/vendor` | JWT + financial:write | Ghi nhận thanh toán cho NCC |
| `GET` | `/api/reports/renewals` | JWT + financial:read | Danh sách hạng mục định kỳ sắp/đã tới hạn |

---

## 2. Hướng dẫn sử dụng

### 2.1 Danh mục Nhà cung cấp (/suppliers)

CRUD đơn giản (theo mẫu Khách hàng): Tên, Người liên hệ, SĐT, Mã số thuế, Ghi chú, Trạng thái. Không có trường "phân loại" — phân loại nằm ở hạng mục của từng phiếu chi.

### 2.2 Hạng mục chi phí (trong /config)

- Tạo hạng mục tự do theo nhu cầu (VD: Sửa chữa, Phụ tùng, Vật tư, Bảo hiểm, Đăng kiểm, Phí đường bộ).
- Cờ **Định kỳ (`is_renewable`)**: bật nếu khoản này cần gia hạn (bảo hiểm, đăng kiểm, phí đường bộ).
- **Nhắc trước (`reminder_lead_days`)**: số ngày nhắc trước hạn, mặc định **30** (chỉ áp dụng khi định kỳ).

### 2.3 Nhập Phiếu chi phí (/expenses)

Form nhập:
1. **Ngày** (bắt buộc)
2. **Nhà cung cấp** (bắt buộc, từ danh mục)
3. **Hạng mục** (bắt buộc, từ danh mục)
4. **Xe** — chọn xe đầu kéo **hoặc** rơ-mooc, **hoặc để trống** (chi phí chung)
5. **Số tiền** (bắt buộc, VND)
6. **Trạng thái:** Trả ngay (PAID) / Ghi nợ (UNPAID)
7. **Hiệu lực từ – đến** (`valid_from`/`valid_to`) — **chỉ hiện khi hạng mục là định kỳ**
8. **Ghi chú**, **Ảnh hóa đơn** (upload)

> Một hóa đơn gara nhiều khoản → nhập nhiều phiếu (mỗi hạng mục một phiếu), cùng NCC + cùng ngày.

### 2.4 Công nợ phải trả (/payables, /payables/:id)

- `/payables`: danh sách NCC kèm số dư nợ + tuổi nợ (4 bucket: 0–30 / 31–60 / 61–90 / 90+), giống màn Công nợ phải thu.
- `/payables/:id`: sao kê NCC (các phiếu ghi nợ + thanh toán + số dư chạy) + nút **Ghi thanh toán** (một ô số tiền — không khớp từng phiếu).

### 2.5 Nhắc gia hạn (Dashboard)

Widget liệt kê xe có bảo hiểm/đăng kiểm/phí đường bộ **sắp tới hạn** (trong `reminder_lead_days`) hoặc **đã quá hạn**, dựa trên `valid_to` mới nhất theo (xe × hạng mục).

---

## 3. Luồng nghiệp vụ

### 3.1 Tạo phiếu chi phí — Ghi nợ (UNPAID)

```
POST /api/expenses { expenseDate, supplierId, categoryId, truckId?|trailerId?, amount, paymentStatus: "UNPAID", validFrom?, validTo?, note? }
  → BE: Transaction + Advisory Lock trên VENDOR:supplierId
  → INSERT expenses
  → LedgerService.postEntry: VENDOR_EXPENSE, credit = amount → balance = prev + credit − debit (tăng nợ)
  → Response 200
```

### 3.2 Tạo phiếu chi phí — Trả ngay (PAID)

```
POST /api/expenses { ..., paymentStatus: "PAID" }
  → INSERT expenses
  → KHÔNG tạo dòng sổ cái (hệ thống không có tài khoản tiền mặt)
  → Vẫn được tính vào P&L tháng thanh toán
```

### 3.3 Thanh toán cho NCC

```
POST /api/payments/vendor { supplierId, receiptId, amount, date }
  → Advisory Lock VENDOR:supplierId
  → LedgerService.postEntry: VENDOR_PAYMENT, debit = amount → balance = prev + credit − debit (giảm nợ)
  → Tuổi nợ tính lại theo FIFO (trừ phiếu cũ nhất trước)
```

### 3.4 Sửa/Xóa phiếu đã ghi nợ

```
PUT/DELETE /api/expenses/:id
  → Nếu phiếu đã post VENDOR_EXPENSE: post ADJUSTMENT bù trừ (sổ cái append-only, không sửa dòng cũ)
  → Soft-delete dòng expenses (set deletedAt)
```

### 3.5 P&L (theo tháng)

```
getPnlReport(month, year)
  → Per-truck: Tổng chi phí xe = Σ chi phí chuyến của xe + Σ bảo dưỡng gắn xe trong tháng
              Lãi gộp xe = Doanh thu − Tổng chi phí xe
  → Company-level: Σ chi phí gắn rơ-mooc + chi phí không gắn xe
  → Lãi ròng = Σ Lãi gộp xe − Phí quản lý − (Chi phí rơ-mooc + chung) + Thu nhập khác
```

---

## 4. Bảng tra cứu

### 4.1 Loại giao dịch mới (TxnType)

| Giá trị | Dấu | Ý nghĩa |
|---------|-----|---------|
| VENDOR_EXPENSE | Credit (+nợ) | Phát sinh công nợ phải trả khi ghi nợ một phiếu chi phí |
| VENDOR_PAYMENT | Debit (−nợ) | Thanh toán cho NCC, giảm công nợ |

### 4.2 Quy ước sổ cái cho VENDOR

- **Dấu:** `balance = balance trước + Credit − Debit` (giống DRIVER — công nợ phải trả).
- **Tuổi nợ (aging):** ngược với phải thu — *chi phí là Credit* (cần tính tuổi), *thanh toán là Debit* (áp FIFO).
- **IMMUTABLE** — append-only; sửa/xóa dùng ADJUSTMENT bù trừ.
- **Advisory lock** `pg_advisory_xact_lock(3, supplierId)` (type key VENDOR = 3).

### 4.3 Hành vi hạng mục chi phí

| Trường | Ý nghĩa |
|--------|---------|
| `is_renewable` | `false` = một lần (sửa chữa, phụ tùng, vật tư). `true` = định kỳ (bảo hiểm, đăng kiểm, phí đường bộ) → phiếu cần `valid_from/to`, có nhắc gia hạn |
| `reminder_lead_days` | Số ngày nhắc trước `valid_to` (mặc định 30) |

### 4.4 Quy về P&L theo loại gắn xe

| Phiếu gắn | Quy về |
|-----------|--------|
| Xe đầu kéo | Trừ vào **Lãi gộp** của chính xe đó |
| Rơ-mooc | **Chi phí chung công ty** (trừ ở Lãi ròng) — vì rơ-mooc hoán đổi giữa các đầu kéo |
| Không gắn xe | **Chi phí chung công ty** (trừ ở Lãi ròng) |

---

## 5. QA Test Checklist

### 5.1 Happy Path

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-CP-001 | Tạo NCC | ketoan | /suppliers → Thêm → lưu | NCC xuất hiện trong danh sách | High |
| TC-CP-002 | Tạo hạng mục một lần | ketoan | /config → Hạng mục CP → thêm "Sửa chữa" (is_renewable off) | Lưu thành công, không hỏi ngày hiệu lực | High |
| TC-CP-003 | Tạo hạng mục định kỳ | ketoan | Thêm "Bảo hiểm" (is_renewable on, lead 30) | Lưu thành công | High |
| TC-CP-004 | Phiếu Ghi nợ gắn đầu kéo | Có NCC + hạng mục | /expenses → nhập, UNPAID, chọn xe X | 1 dòng VENDOR_EXPENSE credit, số dư NCC tăng | High |
| TC-CP-005 | Phiếu Trả ngay | Có NCC | Nhập PAID | Không tạo dòng sổ cái; vẫn vào P&L | High |
| TC-CP-006 | Phiếu định kỳ có hạn | Hạng mục định kỳ | Nhập Bảo hiểm, valid_to = +1 năm, ảnh hóa đơn | Lưu thành công, hiện trên nhắc gia hạn khi tới gần | High |
| TC-CP-007 | Phiếu không gắn xe | — | Nhập phiếu để trống xe | Lưu thành công (chi phí chung) | Medium |
| TC-CP-008 | Thanh toán NCC | NCC có nợ | /payables/:id → Ghi thanh toán | Dòng VENDOR_PAYMENT debit, số dư giảm | High |

### 5.2 Validation

| TC-ID | Tiêu đề | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------|-------------------|---------|
| TC-CP-020 | Thiếu NCC | Tạo phiếu không chọn NCC | Lỗi validation | High |
| TC-CP-021 | Thiếu hạng mục/số tiền | Bỏ trống | Lỗi validation | High |
| TC-CP-022 | Gắn cả đầu kéo và rơ-mooc | Chọn cả hai | Bị chặn (chỉ một) | Medium |
| TC-CP-023 | Hạng mục định kỳ thiếu valid_to | is_renewable on, bỏ trống ngày | Lỗi validation | Medium |
| TC-CP-024 | Số tiền ≤ 0 | Nhập 0 | Lỗi validation | Medium |

### 5.3 Permission

| TC-ID | Tiêu đề | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------|-------------------|---------|
| TC-CP-030 | DRIVER chặn /expenses | Đăng nhập laixe → /expenses | Redirect /my-trips | High |
| TC-CP-031 | DRIVER chặn /payables | laixe → /payables | Redirect | High |
| TC-CP-032 | DRIVER gọi API | laixe → POST /api/expenses | 403 Forbidden | High |
| TC-CP-033 | ketoan/giamdoc được phép | Đăng nhập → thao tác | Thành công | High |

### 5.4 Edge Cases & Sổ cái

| TC-ID | Tiêu đề | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------|-------------------|---------|
| TC-CP-040 | Tuổi nợ AP đúng chiều | NCC có phiếu cũ + thanh toán | Tuổi nợ tính trên credit (chi phí), FIFO áp debit (thanh toán) | High |
| TC-CP-041 | Xóa phiếu đã ghi nợ | DELETE phiếu UNPAID | ADJUSTMENT bù trừ, số dư về đúng, dòng soft-delete | High |
| TC-CP-042 | Sửa số tiền phiếu đã ghi nợ | PUT đổi amount | ADJUSTMENT chênh lệch, số dư khớp | Medium |
| TC-CP-043 | Xóa phiếu Trả ngay | DELETE phiếu PAID | Không tạo ADJUSTMENT (chưa từng post sổ cái) | Medium |
| TC-CP-044 | Sổ cái immutable | PUT/DELETE trực tiếp ledger | Lỗi 405 | High |

### 5.5 Concurrency

| TC-ID | Tiêu đề | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------|-------------------|---------|
| TC-CP-050 | Thanh toán đồng thời | 2 request cùng NCC | Advisory lock tuần tự, số dư cuối đúng | High |

### 5.6 P&L & Nhắc gia hạn

| TC-ID | Tiêu đề | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------|-------------------|---------|
| TC-CP-060 | Bảo dưỡng đầu kéo vào lãi gộp | Phiếu gắn xe X trong tháng | /finance: lãi gộp xe X giảm đúng số tiền | High |
| TC-CP-061 | Chi phí rơ-mooc vào lãi ròng | Phiếu gắn rơ-mooc | Không trừ vào xe nào; trừ ở dòng chi phí chung (lãi ròng) | High |
| TC-CP-062 | Chi phí chung vào lãi ròng | Phiếu không gắn xe | Trừ ở dòng chi phí chung | Medium |
| TC-CP-063 | Lát cắt cơ cấu chi phí | Có nhiều hạng mục | Pie chart hiện lát sửa chữa/phụ tùng/bảo hiểm/đăng kiểm/phí đường bộ | Medium |
| TC-CP-064 | Nhắc gia hạn sắp tới hạn | Bảo hiểm valid_to trong 30 ngày | Dashboard hiện cảnh báo | High |
| TC-CP-065 | Nhắc gia hạn quá hạn | đăng kiểm valid_to đã qua | Dashboard hiện "quá hạn" | High |
| TC-CP-066 | Gia hạn xóa nhắc | Nhập phiếu mới valid_to xa hơn | Cảnh báo biến mất (dùng valid_to mới nhất) | Medium |

### 5.7 Responsive

| TC-ID | Tiêu đề | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------|-------------------|---------|
| TC-CP-070 | Mobile danh sách chi phí | < 768px | Card view thay bảng | Low |
| TC-CP-071 | Mobile công nợ phải trả | < 768px | Card view | Low |

---

## 6. Ghi chú & Lưu ý quan trọng

- **Tổng chi phí bao gồm TẤT CẢ chi phí** ở tầng P&L (chuyến + bảo dưỡng). Thẻ từng chuyến vẫn chỉ là dầu + tiền đi đường + lương — `computeTripTotals` không đổi.
- **Không đếm trùng:** nhiên liệu mua nợ **ngoài phạm vi** — chi phí dầu đã tính theo chuyến.
- **Phí đường bộ** (phí bảo trì đường bộ năm, theo xe) **khác** **Tiền đi đường** (vé cầu đường mỗi chuyến). Không nhầm.
- **Chi phí rơ-mooc luôn là chi phí chung công ty** — không gộp vào đầu kéo (rơ-mooc hoán đổi giữa các đầu kéo).
- **Không phân bổ (no amortization):** chi phí định kỳ ghi toàn bộ vào tháng thanh toán; chỉ nhắc gia hạn, không trải đều.
- Sổ cái VENDOR dùng chung bảng `ledger`, `entity_type='VENDOR'`, append-only.
- Tài khoản test: xem [README](./README.md) (ketoan / admin123).
