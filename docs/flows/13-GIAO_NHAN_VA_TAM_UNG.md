# Cổng thông tin Nhân viên giao nhận (Forwarder Portal)

> Tài liệu QA testing & Hướng dẫn sử dụng — Forwarder Portal
> **Routes:** `/my-forwarder-trips`, `/my-forwarder-trips/:id`
> **Role:** FORWARDER (đọc + ghi container/seal/chi phí)

---

## 1. Tổng quan

### 1.1 Mô tả

Cổng thông tin nhân viên giao nhận (Forwarder Portal) dành cho vai trò FORWARDER. Nhân viên giao nhận xem danh sách chuyến đi, nhập số container/seal (loại container từ danh mục, số container, số seal — nhập text), ghi nhận chi phí phát sinh (nâng hạ, hải quan, cân xe, kiểm tra). Khác với Lái xe (chỉ đọc), FORWARDER có thao tác ghi (tạo container, tạo/xóa chi phí). Lưu ý: Kế toán và Giám đốc cũng có thể nhập container/seal từ form chuyến đi chính (không chỉ qua Forwarder Portal).

### 1.2 Nguyên tắc

| Nguyên tắc | Chi tiết |
|-----------|----------|
| **Đọc + Ghi** | FORWARDER có thể tạo container/seal và chi phí phát sinh. Kế toán/Giám đốc cũng nhập được container/seal từ form chính. |
| **Xóa có điều kiện** | Chỉ xóa được chi phí do chính mình tạo (ownership check) |
| **Xem tất cả chuyến** | FORWARDER xem danh sách mọi chuyến (không giới hạn theo phân công) |
| **Không xem tài chính** | API loại trừ các trường revenue, totalCost, grossProfit, totalFuelCost |
| **Chỉ FORWARDER** | ADMIN/MANAGER/DRIVER truy cập /my-forwarder-trips → redirect trang chủ |

### 1.3 Loại chi phí phát sinh

| Mã (Enum) | Tên tiếng Việt | Trường bổ sung | Giá bán ra mặc định |
|-----------|---------------|----------------|---------------------|
| `LIFTING` | Phí nâng container | Số HĐ, Ngày HĐ | Bằng giá mua (at cost) |
| `LOWERING` | Phí hạ container | Số HĐ, Ngày HĐ | Bằng giá mua |
| `WEIGHING` | Phí cân hàng | Số HĐ, Ngày HĐ | Bằng giá mua |
| `CUSTOMS` | Phí làm tờ khai hải quan | Số tờ khai, Số container | Cộng thêm phí quản lý (markup) |
| `INFRASTRUCTURE` | Phí kết cấu hạ tầng (nộp hộ) | Số container | Bằng giá mua |
| `INSPECTION` | Phí kiểm hóa tại cảng | Số HĐ, Ngày HĐ | Bằng giá mua |
| `INSPECTION_SVC` | Phí phục vụ kiểm hóa | Diễn giải chi tiết | Cộng thêm phí quản lý |
| `OTHER` | Phí chi hộ khác | Diễn giải chi tiết, Số container | Theo từng trường hợp (có thể = 0) |

> Tất cả mặc định là `FORWARDER_ADVANCE`. Giá bán ra được gợi ý tự động theo loại phí nhưng luôn có thể sửa. Một số khoản có thể đặt giá bán = 0 (phí nội bộ không báo khách). Xem PRODUCT-SPECS §4.6.1 để biết quy tắc đầy đủ.

### 1.4 API Endpoints

#### Forwarder Portal (`/api/forwarder/me`)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/api/forwarder/me/trips` | JWT + forwarder_portal:read | Danh sách tất cả chuyến (không có trường tài chính) |
| `GET` | `/api/forwarder/me/trips/:id` | JWT + forwarder_portal:read | Chi tiết chuyến + containers + chi phí |
| `POST` | `/api/forwarder/me/trips/:tripId/containers` | JWT + forwarder_portal:write | Thêm số container/seal |
| `POST` | `/api/forwarder/me/expenses` | JWT + forwarder_portal:write | Ghi nhận chi phí phát sinh |
| `DELETE` | `/api/forwarder/me/expenses/:id` | JWT + forwarder_portal:write | Xóa chi phí (chỉ của mình) |

#### Admin Forwarder (`/api/forwarder-expenses`)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/api/forwarder-expenses` | JWT + financial:read | Danh sách chi phí forwarder (filter: tripId, forwarderId, expenseType) |

### 1.5 Sidebar Forwarder

| Menu | Route | Icon |
|------|-------|------|
| Chuyến đi | /my-forwarder-trips | Package |

---

## 2. Hướng dẫn sử dụng

### 2.1 Danh sách chuyến (/my-forwarder-trips)

- Card list: icon MapPin, tên tuyến, status pill, biển số xe, ngày khởi hành, tên khách hàng, số container
- Click card → `/my-forwarder-trips/:id`
- Empty state: "Chưa có chuyến đi nào"
- Mọi chuyến trong hệ thống hiển thị (không giới hạn theo phân công)

**Tìm kiếm & lọc (C1.1):**
- **Ô tìm kiếm:** gõ theo **số container**, **tên khách hàng**, hoặc **ngày** (YYYY-MM-DD). Hỗ trợ tìm gần đúng (contains).
- **Bộ lọc ngày:** date range picker (từ ngày → đến ngày). Lọc theo `departureDate` hoặc `arrivalDate`.

**Mã màu theo trạng thái chi phí (C1.2):**

| Màu | Trạng thái | Ý nghĩa |
|------|------------|---------|
| 🟢 Xanh | Đã thanh toán | Phiếu chi đã được tất toán với khách/NCC |
| 🟡 Vàng | Chờ duyệt / chờ thanh toán | Phiếu yêu cầu hoàn ứng đã tạo, chờ kế toán duyệt |
| ⚪ Trắng (mặc định) | Chưa làm | Phiếu chi phí phát sinh chưa được tạo / tạm ứng chưa yêu cầu |

Mỗi card chuyến có **badge nhỏ** ở góc trên phải hiển thị màu tổng hợp của trạng thái chi phí.

### 2.2 Chi tiết chuyến (/my-forwarder-trips/:id)

- **Header:** Tên tuyến + status pill + tên khách + mã chuyến
- **Thông tin chuyến:** Xe đầu kéo, ngày khởi hành, loại hàng, mã tham chiếu
- **Phần Container/Seal:** Danh sách số container đã nhập + nút "Thêm" để mở form nhập mới
  - Form nhập: Số container (bắt buộc), Số seal (tuỳ chọn), Ghi chú (tuỳ chọn)
- **Phần Chi phí phát sinh:** Danh sách chi phí đã ghi + nút "Thêm" để mở form
  - Form nhập: Loại chi phí (dropdown), Giá mua vào (VNĐ), Giá bán ra (VNĐ, mặc định tính theo markup cấu hình), Đối tác cung cấp (dropdown), Hình thức chi (COMPANY_DIRECT / FORWARDER_ADVANCE), Số hóa đơn, Ngày hóa đơn, Số tờ khai (hải quan), Ghi chú.
  - Mỗi chi phí có nút xóa (chỉ hiển thị với chi phí do mình tạo)
- **Chân tuyến:** Legs numbered, origin → destination, km, badge Hàng/Vô
- **Ghi chú:** Nội dung ghi chú của chuyến

### 2.3 Thêm Container/Seal

1. Mở chi tiết chuyến `/my-forwarder-trips/:id`
2. Click nút **"Thêm"** ở phần Container/Seal
3. Nhập **Số container** (bắt buộc, ví dụ: MSKU-123456)
4. Nhập **Số seal** (tuỳ chọn, ví dụ: SEAL-001)
5. Nhập **Ghi chú** (tuỳ chọn)
6. Click **"Lưu"**
7. Container mới xuất hiện trong danh sách

> **Lưu ý readonly (C1.3):** Khi giao nhận mở form nhập chi phí từ một **dòng container đã chọn** (click row container để mở phiếu chi), trường `containerNumber` hiển thị ở chế độ **readonly + auto-fill** từ container đã chọn. Hệ thống vẫn ghi nhận FK `tripContainerId` để phiếu thanh toán group theo container chính xác, không phụ thuộc chuỗi text. Giao nhận xác nhận lại bằng mắt trước khi nhập số tiền — tránh click nhầm dòng.

### 2.4 Ghi nhận chi phí phát sinh

1. Mở chi tiết chuyến `/my-forwarder-trips/:id`
2. Click nút **"Thêm"** ở phần Chi phí phát sinh
3. Chọn **Loại chi phí** từ dropdown (Nâng container / Hạ container / Cân hàng / Hải quan / Hạ tầng / Kiểm hóa / Phục vụ kiểm hóa / Khác)
4. Nhập **Giá mua vào VNĐ** (số dương)
5. Nhập/Sửa **Giá bán ra VNĐ** (mặc định gợi ý tự động)
6. Nhập các thông tin hóa đơn (nếu có): Số hóa đơn, Ngày hóa đơn, Số tờ khai hải quan.
7. Chọn **Hình thức chi**: COMPANY_DIRECT hoặc FORWARDER_ADVANCE.
8. Nhập **Ghi chú** (tuỳ chọn)
9. Click **"Lưu"**
10. Chi phí mới xuất hiện trong danh sách

**Phiếu thanh toán theo số container (C1.4):** Khi in/xem phiếu thanh toán cho kế toán, mỗi phiếu hiển thị **rõ số container** mà khoản chi phí đó phát sinh (từ `tripContainerId` FK). Nếu 1 chuyến có nhiều container và mỗi container phát sinh chi phí riêng, hệ thống nhóm theo container — phiếu thanh toán **per-container** (mỗi container 1 block, header ghi rõ containerNumber).

### 2.5 Xóa chi phí

1. Tìm chi phí cần xóa trong danh sách chi phí phát sinh
2. Click icon **thùng rác** bên cạnh chi phí
3. Chi phí bị xóa, danh sách cập nhật
4. **Lưu ý:** Chỉ xóa được chi phí do chính mình tạo. Thử xóa chi phí của người khác → 403

### 2.6 Tạm ứng (Advances) — 4 KPI

Trang "Tạm ứng" của giao nhận hiển thị 4 KPI tổng quan (C2.1–C2.3):

| KPI | Nguồn |
|-----|-------|
| **Tổng tạm ứng đã nhận** | Σ tất cả phiếu tạm ứng đã duyệt của giao nhận |
| **Đã yêu cầu hoàn ứng** | Σ phiếu yêu cầu hoàn ứng (trạng thái Yêu cầu) |
| **Đã thanh toán (tất toán)** | Σ phiếu hoàn ứng đã thanh toán (trạng thái Đã thanh toán) |
| **Số dư còn tạm ứng** | `Tổng đã nhận − Đã thanh toán` (= KPI quan trọng nhất) |

Click mỗi KPI → lọc danh sách phiếu tương ứng.

### 2.7 Phiếu thanh toán (Vouchers) — sắp xếp theo ngày vận chuyển (C3)

Trang "Phiếu thanh toán" hiển thị danh sách phiếu thanh toán đã tạo:

- **Sắp xếp mặc định:** theo **ngày vận chuyển** (`departureDate` của chuyến) **tăng dần** (cũ → mới). Hành vi này khớp với FIFO trong quy trình duyệt.
- Click header "Ngày vận chuyển" để đảo chiều.
- Mỗi phiếu hiển thị: Mã chuyến, Tuyến, Ngày vận chuyển, Số tiền, Trạng thái, Số container liên quan.

### 2.8 Duyệt hoàn ứng (D3)

Kế toán/giám đốc duyệt phiếu yêu cầu hoàn ứng từ giao nhận:

1. Truy cập `/payables/forwarder-advances` (hoặc menu tương đương) → danh sách phiếu yêu cầu hoàn ứng.
2. Mỗi phiếu hiển thị: giao nhận, số tiền, container/lô liên quan, ngày yêu cầu, lý do.
3. Bấm **Duyệt** → chuyển trạng thái Yêu cầu → **Đã duyệt** (ghi nhận ledger FORWARDER_ADVANCE_SETTLED).
4. Sau khi chi tiền → bấm **Đã thanh toán** → trạng thái **Đã thanh toán** (ghi nhận FORWARDER_PAYMENT).
5. Số dư tạm ứng của giao nhận giảm tương ứng sau bước 4.

---

## 3. Luồng nghiệp vụ

### 3.1 Xem danh sách chuyến

```
FORWARDER mở /my-forwarder-trips
→ GET /api/forwarder/me/trips (identity check: user.role = 'FORWARDER')
→ Hiển thị card list tất cả chuyến (không có trường tài chính)
→ Click card → GET /api/forwarder/me/trips/:id
```

### 3.2 Thêm container/seal

```
FORWARDER click "Thêm" ở phần Container/Seal
→ Điền form (containerTypeId, container_number, seal_number, notes)
→ POST /api/forwarder/me/trips/:tripId/containers
→ Schema validation: tripContainerSchema (containerTypeId + containerNumber bắt buộc)
→ Insert vào trip_containers, createdBy = forwarder user.id
→ 201 Created, container xuất hiện trong danh sách
```

### 3.3 Ghi nhận chi phí phát sinh

```
FORWARDER click "Thêm" ở phần Chi phí phát sinh
→ Điền form (expenseType, buyAmount, sellAmount, settlementMethod, invoiceNumber, invoiceDate, declarationNumber, supplierId, note)
→ POST /api/forwarder/me/expenses
→ Schema validation: tripExpenseSchema (tripId + expenseType + buyAmount > 0)
→ Insert vào trip_expenses, forwarderId = forwarder user.id
→ Nếu settlementMethod = COMPANY_DIRECT → Xử lý công nợ NCC lúc khóa chuyến
→ 201 Created, chi phí xuất hiện trong danh sách
```

### 3.4 Xóa chi phí (ownership check)

```
FORWARDER click icon xóa chi phí
→ DELETE /api/forwarder/me/expenses/:id
→ Service kiểm tra: expense.forwarderId === forwarder.id?
  ├── CÓ → Hard delete → 200 OK
  ├── KHÔNG → 403 "Không có quyền xóa chi phí này"
  └── Không tồn tại → 404 "Không tìm thấy chi phí"
```

### 3.5 Truy cập trái phép

```
FORWARDER cố vào /finance → Redirect /my-forwarder-trips
ADMIN cố vào /my-forwarder-trips → Redirect /dashboard
DRIVER cố vào /my-forwarder-trips → Redirect /my-trips
FORWARDER gọi API admin (VD: POST /api/trips) → 403 Forbidden
```

### 3.6 Admin xem chi phí forwarder

```
ADMIN/MANAGER/ACCOUNTANT gọi GET /api/forwarder-expenses
→ Có thể filter: ?tripId=1&forwarderId=5&expenseType=LIFTING
→ Trả về danh sách chi phí với forwarderName, tripCode
```

---

## 4. Bảng tra cứu

### 4.1 Response — GET /api/forwarder/me/trips

```json
{
  "items": [
    {
      "id": 1,
      "tripCode": "TRP-202606-0001",
      "departureDate": "2026-06-01",
      "status": "IN_TRANSIT",
      "routeName": "HCM - Đà Lạt",
      "truckPlate": "60C-12345",
      "customerName": "Công ty ABC",
      "customerReference": "PO-123",
      "containerCount": 2,
      "cargoTypeName": "Container"
    }
  ]
}
```

> **Lưu ý:** Response KHÔNG chứa các trường tài chính: revenue, totalCost, grossProfit, totalFuelCost, driverSalary

### 4.2 Response — GET /api/forwarder/me/trips/:id

```json
{
  "id": 1,
  "tripCode": "TRP-202606-0001",
  "departureDate": "2026-06-01",
  "status": "IN_TRANSIT",
  "routeName": "HCM - Đà Lạt",
  "truckPlate": "60C-12345",
  "customerName": "Công ty ABC",
  "customerReference": "PO-123",
  "containerCount": 2,
  "cargoTypeName": "Container",
  "notes": "Giao gấp trước 15h",
  "legs": [
    { "id": 1, "sequence": 1, "origin": "Kho A", "destination": "Kho B", "km": 310, "loadingType": "HANG" }
  ],
  "containers": [
    { "id": 1, "containerNumber": "MSKU-123456", "sealNumber": "SEAL-001", "notes": null, "createdBy": 5 }
  ],
  "expenses": [
    { "id": 1, "tripId": 1, "forwarderId": 5, "expenseType": "LIFTING", "amount": "500000", "note": "Nâng hạ tại kho", "createdAt": "2026-06-01T08:00:00Z", "forwarderName": "Nguyễn Văn Giao" }
  ]
}
```

### 4.3 Request — POST /api/forwarder/me/trips/:tripId/containers

```json
{
  "tripId": 1,
  "containerNumber": "MSKU-123456",
  "sealNumber": "SEAL-001",
  "notes": "Container lạnh"
}
```

### 4.4 Request — POST /api/forwarder/me/expenses

```json
{
  "tripId": 1,
  "expenseType": "LIFTING",
  "amount": 500000,
  "note": "Nâng hạ tại kho"
}
```

### 4.5 Response — GET /api/forwarder-expenses (Admin)

```json
{
  "items": [
    {
      "id": 1,
      "tripId": 1,
      "forwarderId": 5,
      "expenseType": "LIFTING",
      "amount": "500000",
      "note": "Nâng hạ tại kho",
      "createdAt": "2026-06-01T08:00:00Z",
      "forwarderName": "Nguyễn Văn Giao",
      "tripCode": "TRP-202606-0001"
    }
  ]
}
```

### 4.6 Validation Rules

#### Container (tripContainerSchema)

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---------|------|-----------|-----------|
| `tripId` | number | ✅ | Số nguyên dương |
| `containerNumber` | string | ✅ | Không rỗng |
| `sealNumber` | string | — | Tuỳ chọn, nullable |
| `notes` | string | — | Tuỳ chọn, nullable |

#### Chi phí (tripExpenseSchema)

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---------|------|-----------|-----------|
| `tripId` | number | ✅ | Số nguyên dương |
| `expenseType` | enum | ✅ | LIFTING \| LOWERING \| WEIGHING \| CUSTOMS \| INFRASTRUCTURE \| INSPECTION \| INSPECTION_SVC \| OTHER |
| `buyAmount` | number | ✅ | Số dương (> 0) |
| `sellAmount`| number | — | Giá bán ra (>= 0) |
| `settlementMethod` | enum | ✅ | COMPANY_DIRECT \| FORWARDER_ADVANCE |
| `invoiceNumber` | string | — | |
| `invoiceDate` | date | — | |
| `declarationNumber`| string | — | |
| `supplierId` | number | — | |
| `note` | string | — | Tuỳ chọn, nullable |

### 4.7 Error Responses

| Status | Mã lỗi | Nguyên nhân |
|--------|--------|-------------|
| 400 | ZodError | Validation thất bại (thiếu trường, amount ≤ 0) |
| 403 | Forbidden | Xóa chi phí của forwarder khác |
| 404 | Not Found | Chuyến đi hoặc chi phí không tồn tại |

---

## 5. QA Test Checklist

### 5.1 Xác thực & Phân quyền

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-GN-001 | FORWARDER truy cập portal | FORWARDER | Mở /my-forwarder-trips | Hiển thị danh sách chuyến, sidebar có 3 menu "Chuyến đi", "Tạm ứng", "Phiếu thanh toán" | High |
| TC-GN-002 | ADMIN không vào forwarder portal | ADMIN | Mở /my-forwarder-trips | Redirect /dashboard | High |
| TC-GN-003 | DRIVER không vào forwarder portal | DRIVER | Mở /my-forwarder-trips | Redirect /my-trips | High |
| TC-GN-004 | FORWARDER không vào trang admin | FORWARDER | Mở /finance | Redirect /my-forwarder-trips | High |
| TC-GN-005 | FORWARDER gọi API admin | FORWARDER | Gọi GET /api/trips | 403 Forbidden | High |
| TC-GN-006 | Token hết hạn | Token cũ | Mở bất kỳ trang | Redirect /login | High |
| TC-GN-007 | Tài khoản không phải FORWARDER gọi API forwarder | ADMIN | Gọi GET /api/forwarder/me/trips | 403 Forbidden (Casbin) hoặc 404 (NoForwarderProfileError) | High |

### 5.2 Danh sách chuyến (/my-forwarder-trips)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-GN-010 | Hiển thị danh sách | Hệ thống có ≥ 3 chuyến | Mở /my-forwarder-trips | Card list với: tên tuyến, status, biển số, ngày, tên khách, số container | High |
| TC-GN-011 | Empty state | Không có chuyến nào | Mở /my-forwarder-trips | "Chưa có chuyến đi nào" | Medium |
| TC-GN-012 | Click → chi tiết | Có chuyến | Click card | Chuyển đến /my-forwarder-trips/:id | High |
| TC-GN-013 | Không có trường tài chính | Có chuyến | Kiểm tra API response GET /api/forwarder/me/trips | Response không chứa: revenue, totalCost, grossProfit, totalFuelCost, driverSalary | High |
| TC-GN-014 | Tất cả chuyến hiển thị | FORWARDER | Xem danh sách | Hiển thị mọi chuyến (không giới hạn theo phân công) | Medium |

### 5.3 Chi tiết chuyến (/my-forwarder-trips/:id)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-GN-020 | Hiển thị đầy đủ | Chuyến có đủ data | Mở /my-forwarder-trips/:id | Header, thông tin chuyến, container/seal, chi phí, legs, ghi chú | High |
| TC-GN-021 | Chuyến không tồn tại | Chuyến không tồn tại | Mở /my-forwarder-trips/999999 | Thông báo lỗi "Không tìm thấy chuyến đi" | Medium |
| TC-GN-022 | Nút quay lại | Đang xem chi tiết | Nhấn quay lại | Về /my-forwarder-trips | Medium |
| TC-GN-023 | Legs hiển thị | Chuyến có 3 legs | Xem chân tuyến | Hiển thị 3 legs: số thứ tự, origin → destination, km, badge Hàng/Vô | High |
| TC-GN-024 | Ghi chú hiển thị | Chuyến có ghi chú | Xem chi tiết | Hiển thị phần ghi chú | Medium |

### 5.4 Thêm Container/Seal

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-GN-030 | Thêm container thành công | Đang xem chi tiết chuyến | 1. Click "Thêm"<br>2. Nhập containerNumber: "MSKU-123456"<br>3. Nhập sealNumber: "SEAL-001"<br>4. Click "Lưu" | Container mới xuất hiện trong danh sách, form ẩn đi | High |
| TC-GN-031 | Thêm container không có seal | Đang xem chi tiết | 1. Nhập containerNumber: "MSKU-789"<br>2. Để trống sealNumber<br>3. Click "Lưu" | Container được tạo, seal null | High |
| TC-GN-032 | Thiếu số container | Đang xem chi tiết | 1. Click "Thêm"<br>2. Để trống containerNumber<br>3. Click "Lưu" | Nút "Lưu" bị disabled (hoặc lỗi validation 400) | High |
| TC-GN-033 | Toggle form | Đang xem chi tiết | 1. Click "Thêm" → form hiện<br>2. Click "Thêm" lần nữa → form ẩn | Form toggle đúng | Low |
| TC-GN-034 | Container hiển thị đủ thông tin | Có container với seal | Xem danh sách container | Hiển thị: số container, seal (nếu có), ghi chú (nếu có) | Medium |
| TC-GN-035 | Thêm nhiều container | Đã có 1 container | Thêm container thứ 2 | Cả 2 container đều hiển thị | High |

### 5.5 Ghi nhận chi phí phát sinh

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-GN-040 | Tạo chi phí nâng hạ | Đang xem chi tiết | 1. Click "Thêm"<br>2. Chọn loại: "Nâng hạ"<br>3. Nhập số tiền: 500000<br>4. Click "Lưu" | Chi phí mới xuất hiện, hiển thị "Nâng hạ" + 500,000 ₫ | High |
| TC-GN-041 | Tạo chi phí hải quan | Đang xem chi tiết | Chọn loại: "Hải quan", nhập 300000 | Chi phí hiển thị "Hải quan" + 300,000 ₫ | High |
| TC-GN-042 | Tạo chi phí với ghi chú | Đang xem chi tiết | Nhập loại, tiền, ghi chú: "Cân tại trạm A" | Chi phí hiển thị đầy đủ loại + tiền + ghi chú | Medium |
| TC-GN-043 | Số tiền không hợp lệ | Đang xem chi tiết | Nhập số tiền: 0 hoặc âm | Nút "Lưu" bị disabled hoặc lỗi validation | High |
| TC-GN-044 | Dropdown đủ 8 loại | Đang xem chi tiết | Click dropdown loại chi phí | Hiển thị: Nâng container, Hạ container, Cân hàng, Hải quan, Hạ tầng, Kiểm hóa, Phục vụ kiểm hóa, Khác | Medium |
| TC-GN-045 | Tạo nhiều chi phí khác loại | Chưa có chi phí | Tạo 3 chi phí: LIFTING, CUSTOMS, WEIGHING | Cả 3 hiển thị đúng loại và số tiền | High |

### 5.6 Xóa chi phí (Ownership Check)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-GN-050 | Xóa chi phí của mình | FORWARDER A có chi phí | Click icon xóa | Chi phí bị xóa, danh sách cập nhật | High |
| TC-GN-051 | Không xóa chi phí người khác | FORWARDER A, chi phí của FORWARDER B | Click icon xóa chi phí của B | 403 "Không có quyền xóa chi phí này" | High |
| TC-GN-052 | Xóa chi phí không tồn tại | Chi phí ID không tồn tại | Gọi DELETE /api/forwarder/me/expenses/999999 | 404 "Không tìm thấy chi phí" | Medium |
| TC-GN-053 | Xóa rồi danh sách cập nhật | Có 2 chi phí | Xóa 1 chi phí | Chi phí bị xóa biến mất, chi phí còn lại vẫn hiện | High |

### 5.7 Admin xem chi phí forwarder

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-GN-060 | ADMIN xem danh sách chi phí | ADMIN, có chi phí forwarder | Gọi GET /api/forwarder-expenses | Trả về danh sách với forwarderName, tripCode | High |
| TC-GN-061 | Lọc theo chuyến | ADMIN | Gọi GET /api/forwarder-expenses?tripId=1 | Chỉ trả về chi phí của chuyến 1 | Medium |
| TC-GN-062 | Lọc theo loại | ADMIN | Gọi GET /api/forwarder-expenses?expenseType=LIFTING | Chỉ trả về chi phí nâng hạ | Medium |
| TC-GN-063 | FORWARDER không truy cập admin API | FORWARDER | Gọi GET /api/forwarder-expenses | 403 Forbidden (Casbin: FORWARDER không có financial:read) | High |

### 5.8 Mobile UX

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-GN-070 | Layout mobile 375px | iPhone | Mở /my-forwarder-trips | Cards full width, text không cắt | Medium |
| TC-GN-071 | Touch target card | Mobile | Nhấn card | Vùng nhấn ≥ 44px | Medium |
| TC-GN-072 | Form nhập container mobile | Mobile | Mở form nhập container | Các trường nhập hiển thị đúng, dropdown/keyboard phù hợp | Medium |
| TC-GN-073 | Sidebar mobile | Mobile | Toggle sidebar | 3 menu item "Chuyến đi", "Tạm ứng", "Phiếu thanh toán" đúng | Medium |

---

## 6. Ghi chú & Lưu ý

### Đặc điểm FORWARDER

- FORWARDER được xác định trực tiếp bằng `user.id` (không có bảng riêng như DRIVER có bảng `drivers`)
- Danh sách chuyến hiển thị **tất cả** chuyến (không giới hạn theo phân công) vì nhân viên giao nhận xử lý container/chi phí cho mọi chuyến
- API `/api/forwarder/me/trips` loại trừ các trường tài chính: revenue, totalCost, grossProfit, totalFuelCost, driverSalary
- Chi phí phát sinh là **hard delete** (không có deletedAt) — nhưng audit log middleware vẫn ghi lại thao tác DELETE
- Mỗi chi phí ghi nhận `forwarderId` (user.id) để kiểm tra ownership khi xóa

### API Response Format

- Tất cả API forwarder portal trả về JSON với key snake_case (serializer middleware)
- `amount` trả về dạng string (numeric PostgreSQL)
- `sealNumber`, `notes` có thể null

### Demo Account

| Vai trò | Username | Password | Trang chủ |
|---------|----------|----------|-----------|
| Nhân viên giao nhận (FORWARDER) | `giaonhan` | `admin123` | `/my-forwarder-trips` |
