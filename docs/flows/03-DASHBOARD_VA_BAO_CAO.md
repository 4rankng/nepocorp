# Dashboard & Báo cáo

> Tài liệu QA testing & Hướng dẫn sử dụng — Dashboard & Báo cáo Tài chính
> **Routes:** `/` (Dashboard), `/finance` (Báo cáo P&L)
> **Roles:** ADMIN, MANAGER (đầy đủ), ACCOUNTANT (đầy đủ tài chính), DRIVER (chỉ thống kê cá nhân)

---

## 1. Tổng quan

### 1.1 Mô tả

| Trang | Route | Mục đích |
|-------|-------|----------|
| **Dashboard** | `/` | Tổng quan kinh doanh — KPI, biểu đồ xu hướng, bảng xếp hạng |
| **Finance P&L** | `/finance` | Báo cáo Kết quả Hoạt động Kinh doanh chi tiết theo kỳ |

### 1.2 Phân quyền

| Role | Dashboard | Finance P&L |
|------|-----------|-------------|
| ADMIN | Tất cả dữ liệu | Đầy đủ |
| MANAGER | Tất cả dữ liệu | Đầy đủ |
| ACCOUNTANT | Tất cả dữ liệu | Đầy đủ |
| DRIVER | Chỉ thống kê chuyến cá nhân | Không truy cập |

### 1.3 API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/trips` | Danh sách chuyến (lọc theo kỳ) |
| GET | `/api/financial/profit-loss` | Báo cáo P&L theo kỳ |

---

## 2. Hướng dẫn sử dụng

### 2.1 Dashboard (`/`)

**4 thẻ KPI:**

| Thẻ | Nội dung | Đơn vị |
|-----|----------|--------|
| Tổng doanh thu | Tổng `customer_price` chuyến COMPLETED trong kỳ | VND |
| Tổng chi phí | Tổng tất cả khoản chi (NL, cầu đường, lương, phụ phí) | VND |
| Lợi nhuận ròng | Doanh thu − Chi phí | VND |
| Số chuyến | Số chuyến COMPLETED trong kỳ | chuyến |

**Biểu đồ xu hướng 12 tháng:** Đường doanh thu (xanh) + đường chi phí (đỏ), tooltip khi hover.

**Biểu đồ chi phí Donut:** Phân bổ 6 hạng mục — Nhiên liệu, Cầu đường, Công lương, Bốc xếp, Dỡ hàng, Khác.

**Bảng lợi nhuận theo xe:** Biển số, Số chuyến, Doanh thu, Chi phí, Lợi nhuận, Biên LN (%). Sắp xếp mặc định theo lợi nhuận giảm dần.

**Bảng xếp hạng tuyến đường:** Top tuyến theo doanh thu — Tuyến, Số chuyến, Doanh thu, Chi phí TB.

**Cảnh báo hành động:** Chuyến quá hạn, Công nợ quá hạn, Dữ liệu thiếu.

### 2.2 Finance P&L (`/finance`)

**Bộ chọn kỳ:** Dropdown tháng (1–12) + năm. Mặc định tháng hiện tại.

**Biểu đồ cột (Bar Chart):** So sánh thu/chi theo hạng mục.

**Biểu đồ tròn (Pie Chart):** Phân bổ chi phí theo hạng mục trong kỳ.

**Bảng Kết quả HKD (Income Statement):**

| Mục | Nguồn |
|-----|-------|
| I. Doanh thu vận tải | Σ customer_price |
| II. Chi phí nhiên liệu | Σ fuel_cost |
| Chi phí cầu đường | Σ toll_cost |
| Công lương tài xế | Σ driver_pay |
| Chi phí bốc xếp | Σ loading_cost |
| Chi phí dỡ hàng | Σ unloading_cost |
| Chi phí khác | Σ other_cost |
| **Tổng chi phí** | Tổng các khoản trên |
| III. Lợi nhuận gộp | Doanh thu − Tổng chi phí |
| Biên lợi nhuận | LN / Doanh thu × 100% |

**Phân bổ theo xe (Per-truck Breakdown):** Biển số, Doanh thu, Chi phí, Lợi nhuận thuần.

---

## 3. Luồng nghiệp vụ

### 3.1 Dashboard

```
[User truy cập /]
    │
    ├─ LOAD trips (tháng hiện tại)
    │   ├─ ADMIN/MANAGER/ACCOUNTANT: tất cả
    │   └─ DRIVER: chỉ chuyến của mình
    │
    ├─ Tính KPI (chỉ chuyến COMPLETED)
    │   ├─ Doanh thu = Σ customer_price
    │   ├─ Chi phí = Σ (fuel + toll + driver_pay + loading + unloading + other)
    │   ├─ Lợi nhuận = Doanh thu − Chi phí
    │   └─ Số chuyến = COUNT
    │
    ├─ Render biểu đồ
    │   ├─ Line chart 12 tháng → group by month
    │   ├─ Donut chi phí → group by category
    │   ├─ Bảng lợi nhuận xe → group by vehicle
    │   └─ Bảng xếp hạng tuyến → group by route
    │
    └─ Cảnh báo hành động
```

### 3.2 Finance P&L

```
[User truy cập /finance]
    │
    ├─ DRIVER → 403 / redirect
    │
    ├─ User chọn kỳ (tháng/năm)
    │
    ├─ Gọi API /api/financial/profit-loss?month=X&year=Y
    │   ├─ Lọc trips theo kỳ
    │   ├─ Tính từng khoản thu/chi bằng round2dp()
    │   └─ Group by vehicle cho per-truck breakdown
    │
    └─ Render: Bar chart + Pie chart + Income statement + Per-truck table
```

---

## 4. Bảng tra cứu

### 4.1 Hạng mục chi phí

| Mã | Tên hiển thị | Trường |
|----|-------------|---------|
| FUEL | Nhiên liệu | fuel_cost |
| TOLL | Cầu đường | toll_cost |
| DRIVER_PAY | Công lương tài xế | driver_pay |
| LOADING | Bốc xếp | loading_cost |
| UNLOADING | Dỡ hàng | unloading_cost |
| OTHER | Khác | other_cost |

### 4.2 Màu sắc KPI

| Điều kiện | Màu |
|-----------|-----|
| Giá trị > 0 | Xanh (#22c55e) |
| Giá trị < 0 | Đỏ (#ef4444) |
| Giá trị = 0 | Xám (#6b7280) |

### 4.3 Định dạng số

| Loại | Format | Ví dụ |
|------|--------|-------|
| Tiền VND | `0,0` (không decimal) | 125,000,000 |
| Tỷ lệ % | `0.0%` | 42.5% |
| Số chuyến | Số nguyên | 127 |

---

## 5. QA Test Checklist

### 5.1 Dashboard — KPI Cards (TC-DB-001 → TC-DB-010)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-DB-001 | Hiển thị 4 thẻ KPI | ADMIN | Truy cập `/` | 4 thẻ: Doanh thu, Chi phí, Lợi nhuận, Số chuyến | High |
| TC-DB-002 | Doanh thu đúng | 3 chuyến COMPLETED: 10M, 20M, 30M | Xem Dashboard | Tổng doanh thu = 60,000,000 | High |
| TC-DB-003 | Chi phí đúng | Chuyến: fuel=5M, toll=1M, driver_pay=3M, other=0.5M | Xem Dashboard | Tổng chi phí = 9,500,000 | High |
| TC-DB-004 | Lợi nhuận ròng | Doanh thu=50M, Chi phí=35M | Xem Dashboard | Lợi nhuận = 15,000,000 | High |
| TC-DB-005 | Số chuyến đúng | 5 chuyến COMPLETED | Xem Dashboard | Số chuyến = 5 | High |
| TC-DB-006 | Không tính DRAFT | 3 COMPLETED + 2 DRAFT | Xem Dashboard | Số chuyến = 3 | High |
| TC-DB-007 | Không tính CANCELLED | 4 COMPLETED + 1 CANCELLED | Xem Dashboard | Số chuyến = 4 | High |
| TC-DB-008 | Lợi nhuận âm màu đỏ | Revenue=10M, Costs=15M | Xem Dashboard | LN = −5,000,000, màu đỏ | Medium |
| TC-DB-009 | Không có dữ liệu | Chọn tháng trống | Xem Dashboard | KPI = 0, màu xám | Medium |
| TC-DB-010 | Định dạng VND không decimal | Xem Dashboard | Kiểm tra số tiền | Hiển thị 125,000,000 (không .00) | Medium |

### 5.2 Dashboard — Biểu đồ (TC-DB-011 → TC-DB-020)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-DB-011 | Line chart 12 tháng | ADMIN | Truy cập `/` | Biểu đồ đường hiển thị 12 tháng | High |
| TC-DB-012 | Hai đường thu/chi | Có dữ liệu | Xem line chart | Đường doanh thu (xanh) + chi phí (đỏ) | High |
| TC-DB-013 | Tooltip hover | Có dữ liệu | Hover vào điểm | Hiện tháng + giá trị VND | Medium |
| TC-DB-014 | Tháng không dữ liệu | Tháng trống | Xem biểu đồ | Điểm = 0, đường không đứt | Medium |
| TC-DB-015 | Donut chart hiển thị | Có chi phí | Xem Dashboard | Donut hiển thị đầy đủ hạng mục | High |
| TC-DB-016 | Đúng 6 hạng mục chi phí | Chuyến có đầy đủ cost fields | Xem donut | 6 phần tương ứng | High |
| TC-DB-017 | Tỷ lệ % chính xác | fuel=10M, toll=5M, total=20M | Xem donut | Fuel = 50%, Toll = 25% | High |
| TC-DB-018 | Bỏ qua hạng mục = 0 | Chỉ có fuel_cost | Xem donut | Chỉ hiện phần fuel | Medium |
| TC-DB-019 | Click phần donut | Có donut | Click "Nhiên liệu" | Hiển thị tooltip chi tiết | Low |
| TC-DB-020 | Trục Y tự điều chỉnh | Dữ liệu dao động mạnh | Xem line chart | Trục Y co giãn, không cắt dữ liệu | Medium |

### 5.3 Dashboard — Bảng lợi nhuận xe (TC-DB-021 → TC-DB-025)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-DB-021 | Bảng lợi nhuận xe | Nhiều xe có chuyến | Xem Dashboard | Bảng: biển số, số chuyến, doanh thu, chi phí, LN, biên LN | High |
| TC-DB-022 | Sắp xếp mặc định giảm | Xe A: LN=10M, Xe B: LN=20M | Xem bảng | Xe B trước Xe A | Medium |
| TC-DB-023 | Click header đảo chiều | Đang sắp xếp giảm | Click "Lợi nhuận" | Đảo thành tăng dần | Low |
| TC-DB-024 | Biên LN đúng | DT=100M, LN=30M | Xem bảng | Biên LN = 30.0% | High |
| TC-DB-025 | Xe không có chuyến | Xe mới chưa chạy | Xem bảng | Không hiển thị hoặc hiển thị 0 | Medium |

### 5.4 Dashboard — Xếp hạng tuyến & Cảnh báo (TC-DB-026 → TC-DB-031)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-DB-026 | Bảng xếp hạng tuyến | Nhiều chuyến khác tuyến | Xem Dashboard | Bảng: tuyến, số chuyến, doanh thu, chi phí TB | Medium |
| TC-DB-027 | Sắp xếp doanh thu giảm | Tuyến A: 50M, Tuyến B: 30M | Xem bảng | Tuyến A trước B | Medium |
| TC-DB-028 | Chi phí TB đúng | Tuyến: 3 chuyến, tổng chi phí=15M | Xem bảng | Chi phí TB = 5,000,000 | High |
| TC-DB-029 | Cảnh báo chuyến quá hạn | Chuyến chưa hoàn thành quá hạn | Xem Dashboard | Alert hiển thị số chuyến quá hạn | Medium |
| TC-DB-030 | Không cảnh báo khi OK | Tất cả COMPLETED đúng hạn | Xem Dashboard | Không hiển thị alert | Medium |
| TC-DB-031 | Click cảnh báo điều hướng | Có alert | Click alert "chuyến quá hạn" | Điều hướng đến trang Trips | Low |

### 5.5 Dashboard — Phân quyền (TC-DB-032 → TC-DB-035)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-DB-032 | DRIVER chỉ thấy chuyến mình | Login DRIVER_A | Truy cập `/` | KPI chỉ tính chuyến DRIVER_A | High |
| TC-DB-033 | ADMIN thấy tất cả | Login ADMIN | Truy cập `/` | KPI tính tất cả chuyến | High |
| TC-DB-034 | DRIVER không thấy bảng LN xe | Login DRIVER | Xem Dashboard | Bảng lợi nhuận xe bị ẩn | Medium |
| TC-DB-035 | ACCOUNTANT thấy đầy đủ | Login ACCOUNTANT | Truy cập `/` | Tất cả KPI, biểu đồ hiển thị | High |

### 5.6 Finance P&L — Bộ chọn kỳ & Biểu đồ (TC-DB-036 → TC-DB-044)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-DB-036 | Bộ chọn tháng/năm | ADMIN | Truy cập `/finance` | Dropdown tháng + năm hiển thị | High |
| TC-DB-037 | Mặc định tháng hiện tại | Tháng 5/2026 | Truy cập `/finance` | Tháng = 5, Năm = 2026 | High |
| TC-DB-038 | Chọn tháng khác | ADMIN | Chọn tháng 3/2026 → Xem | Dữ liệu tải lại cho T3/2026 | High |
| TC-DB-039 | Tháng không dữ liệu | ADMIN | Chọn T1/2020 → Xem | Báo cáo trống, giá trị = 0 | Medium |
| TC-DB-040 | Bar chart hiển thị | Có dữ liệu | Xem `/finance` | Biểu đồ cột thu/chi hiển thị | High |
| TC-DB-041 | Bar chart đúng giá trị | DT=100M, CP=70M | Xem bar chart | Cột thu cao hơn cột chi | High |
| TC-DB-042 | Pie chart hiển thị | Có dữ liệu | Xem `/finance` | Pie chart phân bổ chi phí | High |
| TC-DB-043 | Tooltip bar chart | Có dữ liệu | Hover vào cột | Hiển thị giá trị VND chính xác | Medium |
| TC-DB-044 | Pie chart cập nhật khi đổi kỳ | Đổi tháng | Xem pie chart | Pie chart cập nhật kỳ mới | High |

### 5.7 Finance P&L — Bảng Income Statement (TC-DB-045 → TC-DB-052)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-DB-045 | Bảng đầy đủ | ADMIN | Truy cập `/finance` | Bảng gồm: Doanh thu, 6 khoản chi phí, Tổng CP, LN gộp, Biên LN | High |
| TC-DB-046 | Doanh thu vận tải đúng | 3 chuyến: 10M, 20M, 30M | Xem bảng | Doanh thu = 60,000,000 | High |
| TC-DB-047 | Chi phí nhiên liệu đúng | fuel_cost = 5M + 3M | Xem bảng | Chi phí NL = 8,000,000 | High |
| TC-DB-048 | Tổng chi phí đúng | fuel=10M, toll=3M, driver=8M, loading=2M, unloading=1M, other=1M | Xem bảng | Tổng CP = 25,000,000 | High |
| TC-DB-049 | Lợi nhuận gộp đúng | DT=80M, CP=55M | Xem bảng | LN gộp = 25,000,000 | High |
| TC-DB-050 | Biên LN đúng | DT=100M, LN=30M | Xem bảng | Biên LN = 30.0% | High |
| TC-DB-051 | LN âm hiển thị đỏ | DT=30M, CP=50M | Xem bảng | LN = −20,000,000, màu đỏ | Medium |
| TC-DB-052 | Chỉ tính COMPLETED | 1 COMPLETED (50M) + 1 DRAFT (20M) | Xem P&L | Chỉ tính 50M | High |

### 5.8 Finance P&L — Phân bổ xe & Footnote (TC-DB-053 → TC-DB-059)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-DB-053 | Bảng per-truck | Nhiều xe | Xem `/finance` | Bảng: biển số, DT, CP, LN từng xe | High |
| TC-DB-054 | DT xe đúng | Xe A: 2 chuyến 15M + 20M | Xem bảng | Xe A DT = 35,000,000 | High |
| TC-DB-055 | Tổng per-truck khớp tổng | Xe A: LN=10M, Xe B: LN=15M | So sánh | Tổng per-truck = 25M = Tổng bảng chính | High |
| TC-DB-056 | Cap table footnote | ADMIN | Xem cuối trang | Ghi chú: tổng xe, tổng chuyến, phương pháp | Low |
| TC-DB-057 | DRIVER bị từ chối | Login DRIVER | Truy cập `/finance` | 403 / redirect | High |
| TC-DB-058 | ADMIN truy cập đầy đủ | Login ADMIN | Truy cập `/finance` | Xem đầy đủ P&L | High |
| TC-DB-059 | ACCOUNTANT truy cập đầy đủ | Login ACCOUNTANT | Truy cập `/finance` | Xem đầy đủ P&L | High |

### 5.9 Edge Cases & Performance (TC-DB-060 → TC-DB-065)

| TC-ID | Tiêu đề | Tiền điều kiện | Các bước | Kết quả mong đợi | Ưu tiên |
|-------|---------|----------------|----------|-------------------|---------|
| TC-DB-060 | Số tiền lớn (>1 tỷ) | Chuyến customer_price = 2 tỷ | Xem Dashboard | Hiển thị đúng 2,000,000,000 | Medium |
| TC-DB-061 | Nhiều chuyến (500+) | 500+ COMPLETED trong tháng | Load Dashboard | Trang load < 3s, KPI đúng | Medium |
| TC-DB-062 | round2dp đúng | Chi phí 10.333M + 5.667M | Xem P&L | Tổng = 16,000,000 (không float) | High |
| TC-DB-063 | Chuyến không có chi phí | COMPLETED chỉ có customer_price, costs=null | Xem Dashboard | CP = 0, LN = customer_price | Medium |
| TC-DB-064 | Đổi tháng nhanh liên tục | ADMIN | Click đổi tháng 5 lần nhanh | Không crash, đúng kỳ cuối | Low |
| TC-DB-065 | Session hết hạn | Token hết hạn | Thử đổi kỳ trên `/finance` | Redirect /login, không crash | Medium |

---

## 6. Ghi chú & Lưu ý

- Tất cả tính toán tài chính dùng `round2dp()` từ `shared/src/calculations/`
- Dashboard lọc client-side theo tháng; Finance P&L lọc server-side
- Timezone: giờ Việt Nam (UTC+7)
- Chỉ chuyến COMPLETED được tính vào KPI và báo cáo
- KPI màu xanh (>0), đỏ (<0), xám (=0)
- Responsive: KPI 4 cột → 2 cột → 1 cột; biểu đồ full-width; bảng scroll ngang
