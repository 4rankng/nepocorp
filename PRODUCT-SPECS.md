# PRODUCT SPECIFICATION & USER STORIES: HỆ THỐNG WEB QUẢN LÝ NEPO

## 1. TỔNG QUAN SẢN PHẨM (PRODUCT OVERVIEW)

Sản phẩm là một nền tảng web thống nhất nhằm thay thế quy trình vận hành và quản lý thủ công hiện tại dựa trên 7 file Excel và hơn 300 sheet của Công ty TNHH NEPO.

* **Quy mô quản lý:** 4 xe đầu kéo container, 38+ tuyến đường và 44+ khách hàng.
* **Mục tiêu chính:**
    * Giảm thời gian tổng hợp dữ liệu thủ công (tiết kiệm 2-3h/ngày cho kế toán, 1h/ngày cho quản lý).
    * Tự động hóa tính toán chi phí và doanh thu, giảm sai sót.
    * Cung cấp cảnh báo và báo cáo thời gian thực giúp ra quyết định nhanh chóng.

---

## 2. ĐỊNH NGHĨA NGƯỜI DÙNG & GIAO DIỆN (USER PERSONAS & UI STRATEGY)

| Vai trò | Mô tả nhiệm vụ | Giao diện |
| :--- | :--- | :--- |
| **Quản lý / Đối tác** | Điều hành toàn bộ quy trình, nhận đơn, phân xe, theo dõi tài chính, công nợ, quản lý kỷ luật và xem phân chia lợi nhuận. | Desktop-first (Dashboard, Báo cáo) |
| **Kế toán** | Nhập liệu/kiểm tra thông tin chuyến đi, kiểm soát nhiên liệu, tính toán tiền đi đường và đôn đốc công nợ phải thu. | Desktop-first (Bảng dữ liệu, Cấu hình) |
| **Giao nhận** | Nhập chi phí dịch vụ đi kèm (nâng/hạ, hải quan, cân hàng, hạ tầng...) và số container/seal theo từng chuyến, kèm số hóa đơn/tờ khai. Sử dụng tiền tạm ứng để chi hộ và lập phiếu thanh toán hoàn ứng. **Không xem dữ liệu tài chính.** | Mobile-first (Danh sách chuyến, Form nhập phí) |
| **Lái xe** | Xem lịch trình, kiểm tra số dầu được cấp, xem thu nhập và kỷ luật cá nhân. **Chỉ xem, không nhập liệu.** | Mobile-first (Nút bấm lớn, Tối giản) |

---

## 3. PHẠM VI SẢN PHẨM & LỘ TRÌNH MVP (PRODUCT SCOPE)

Hệ thống được triển khai theo từng giai đoạn để tối ưu hóa giá trị mang lại:

| Giai đoạn | Module | Giá trị cốt lõi |
| :--- | :--- | :--- |
| **MVP 1** | **Ghi nhận chuyến đi** | Giải quyết khối lượng nhập liệu Excel lớn nhất, số hóa dữ liệu gốc. |
| **MVP 2** | **Dashboard Doanh thu - Chi phí** | Cung cấp cái nhìn tổng hợp và trực quan về sức khỏe tài chính. |
| **MVP 3** | **Công nợ phải thu** | Kiểm soát rủi ro tài chính tập trung (71% nợ ở 4 KH), tự động hóa theo dõi nợ. |
| **Hậu MVP** | **Nhận đơn, Phân chia LN, Kỷ luật** | Hoàn thiện quy trình vận hành khép kín và quản trị nâng cao. |
| **Hậu MVP** | **Chi phí vận hành & Công nợ phải trả** | Số hóa chi phí sửa chữa/vật tư/bảo hiểm/đăng kiểm/phí đường bộ, quản lý nợ Nhà cung cấp, nhắc gia hạn. |
| **Hậu MVP** | **Lương & Chấm công tài xế** | Hệ thống chấm công ngày công (TRIP_DAY / STANDBY / PERSONAL_LEAVE), tính lương thực nhận tháng, phân bổ chi phí nhân công trực tiếp/gián tiếp vào P&L. |

**Ngoài phạm vi:** GPS tracking, variable pricing.

---

## 4. QUY TẮC NGHIỆP VỤ CỐT LÕI (BUSINESS RULES)

### 4.1 Chuyến đi (Trips)

* **Trip (Chuyến xe)** là đơn vị vận hành cốt lõi — mỗi chuyến là một lần xe chạy độc lập. Khách hàng và tuyến đường được chọn trực tiếp trên Trip.
* **Customer Reference (Tham chiếu KH):** Trường tùy chọn trên Trip để nhóm các chuyến phục vụ cùng một yêu cầu của khách hàng. Khái niệm Order/Đơn hàng chính thức được hoãn sang hậu MVP.
* **Trạng thái chuyến đi (5 trạng thái):**
    1. **Mới tạo**: Quản lý tạo thông tin cơ bản (chọn Xe nhà hoặc Xe ngoài, điền thuế VAT). Kế toán nhập các số liệu dự kiến (km, dầu, vé).
    2. **Đang chạy**: Tài xế đã xuất phát. Kế toán có thể cập nhật số liệu bất kỳ lúc nào.
    3. **Hoàn thành**: Xe đã về. Kế toán nhập/đối chiếu số liệu thực tế cuối cùng (đăng ảnh chuyến chè nếu có). Vẫn có thể sửa nếu gõ sai.
    4. **Đã chốt**: Khóa sổ, hệ thống tạo bản ghi Sổ cái (Ledger). Cấm sửa đổi.
    5. **Đã hủy**: Chuyến xe bị hủy bỏ giữa chừng, lưu lại lịch sử.
* **Quy trình nhập liệu:** Quản lý tạo chuyến -> Kế toán điền số dự kiến -> Xe chạy -> Xe về, kế toán chốt số thực tế -> Quản lý/Kế toán khóa chuyến (Đã chốt).

### 4.1.1 Thuế VAT & Doanh thu vận tải
* Giá cước bán cho khách hàng luôn được nhập **bao gồm VAT** (INCL VAT). 
* Hệ thống ghi nhận **Tỷ lệ VAT** (VD: 8% hoặc 10%) cho từng chuyến đi (mặc định cấu hình theo khách hàng).
* Doanh thu ghi nhận trên giấy báo nợ (phải thu) là giá gồm VAT. 
* Doanh thu ghi nhận vào Báo cáo Lãi lỗ nội bộ (P&L, DT xe) là doanh thu **chưa VAT** (= Giá bán / (1 + VAT)).

### 4.1.2 Điều động Xe ngoài (External Carrier)
* Một chuyến đi có thể được thực hiện bởi **Xe nhà** (OWN) hoặc **Xe ngoài** (EXTERNAL).
* **Xe nhà**: Sử dụng đầu kéo, tài xế, nhiên liệu, và tiền đi đường của công ty.
* **Xe ngoài**: Công ty thuê đối tác vận chuyển. Khi chọn xe ngoài:
    * Không nhập xe đầu kéo, tài xế công ty.
    * Nhập **Đối tác vận chuyển** (Nhà cung cấp).
    * Nhập **Giá cước thuê ngoài (gồm VAT)**, **Biển số xe ngoài**, **Tên lái xe ngoài**, **SĐT lái xe ngoài**.
    * Chi phí chuyến đi = Giá cước thuê ngoài (không có dầu, vé, lương).
    * **Lãi điều xe ngoài (Management Margin)** = Doanh thu chưa VAT - Giá cước thuê ngoài chưa VAT. Lãi này cộng vào P&L của công ty.

### 4.2 Doanh thu & Bảng giá

* **Doanh thu** được xác định bằng bảng tra cố định theo **Khách hàng × Tuyến đường** (cùng tuyến đường có thể có giá khác nhau cho từng khách hàng).
* Bảng giá hiện tại cố định; variable pricing có thể xem xét sau.
* **Phân biệt Tuyến đường vs. Chặng chi tiết:** Tuyến đường (Route) là khái niệm tổng quát (VD: "Hải Phòng - Hà Nội") dùng làm khóa tra **bảng giá** và **tiền đi đường chuẩn**. Các chặng chi tiết (Trip Legs: cảng → nhà máy A → kho B...) là dữ liệu bổ sung nhập trong quá trình thực hiện chuyến để tính **định mức nhiên liệu** chính xác theo từng đoạn. *(Pete xác nhận 19/5: "Chính xác")*

### 4.3 Chi phí nhiên liệu

* Kế toán nhập **số lít dầu**; hệ thống tự nhân với **đơn giá** để tính chi phí dầu. Mặc định dùng **đơn giá cấu hình** (được snapshot khi tạo chuyến). Kế toán có thể nhập **đơn giá thực tế** (giá thực mua tại trạm) nếu khác với giá cấu hình — khi đó chi phí = L dầu × đơn giá thực tế (xem §4.3.1).
* **Tiêu thụ bình quân (TTBQ)** = Số lít dầu / km × 100. Tự động đối chiếu với định mức để cảnh báo.
* **Định mức nhiên liệu:**
    * Hàng (đầy): 43L/100km
    * Vỏ (chạy không): 25L/100km
    * Bổ sung cố định: +3L/chuyến (áp dụng cho tuyến thường)
    * Tuyến đèo đốc: định mức cố định **tổng cả chuyến** theo tuyến (lưu trong bảng Tuyến đường, hệ thống tự tra). Thay thế hoàn toàn công thức tính theo km và +3L bổ sung. VD: Mộc Châu 240L, Sơn La 320L, Lai Châu 365L.
* **Mô hình chặng (Trip Legs) áp dụng cho cả tuyến đèo đốc:** Kế toán vẫn nhập chi tiết từng chặng (điểm đi, điểm đến, km, loại tải) để lưu lịch sử vận hành. Tuy nhiên, hệ thống sử dụng **định mức cố định theo tuyến** (không tính theo km chặng) để ra số L dầu. *(Pete xác nhận 19/5: "Vẫn áp dụng em ạ, và vẫn có lựa chọn bổ sung")*
* **3 chế độ nhập dầu (áp dụng cả tuyến đèo đốc):**
    1. **AUTO:** Hệ thống tự tính L dầu từ km từng chặng × định mức (hàng/vỏ), hoặc dùng định mức cố định nếu là tuyến đèo đốc.
    2. **KHOÁN (FLAT_RATE):** Kế toán nhập thủ công tổng L dầu, ghi đè toàn bộ tính toán tự động.
    3. **Bổ sung (Supplement):** L dầu cộng thêm do xe hỏng, đi sửa,... — cộng vào kết quả của cả 2 chế độ trên.

### 4.3.1 Điều chỉnh giá nhiên liệu theo thực tế

* **Vấn đề:** Giá nhiên liệu biến động theo thời gian. Giá cấu hình tại thời điểm kế toán nhập (VD: 28.760 VNĐ/lít) có thể khác với giá thực tế khi lái xe đổ dầu (VD: 27.650 VNĐ/lít). Chênh lệch làm sai chi phí chuyến, công nợ NCC nhiên liệu và báo cáo P&L.
* **Giải pháp 2 tầng:**
    1. **Lịch sử giá nhiên liệu** (`fuel_price_history`): Hệ thống tự ghi lại mọi thay đổi đơn giá kèm ngày hiệu lực. Cung cấp audit trail và đề xuất giá hiệu lực theo ngày xuất phát chuyến.
    2. **Giá thực tế theo chuyến** (`fuelActualUnitPrice`): Kế toán nhập giá thực mua cho từng chuyến. Khi có giá thực tế → hệ thống tính `chi phí dầu = L dầu × giá thực tế` (thay vì giá cấu hình). Chênh lệch (`fuelPriceVariance = chi phí thực tế − chi phí theo giá cấu hình`) được theo dõi cho báo cáo.
* **Luồng nghiệp vụ:**
    1. Khi mở form nhập liệu chuyến, hệ thống **đề xuất** giá hiệu lực từ bảng lịch sử giá theo ngày xuất phát.
    2. Kế toán chấp nhận đề xuất hoặc nhập giá khác. Nếu để trống → dùng giá cấu hình (hành vi hiện tại).
    3. Hệ thống tính lại `totalFuelCost`, `totalCost`, `grossProfit` khi giá thực tế thay đổi.
    4. Chênh lệch hiển thị trên thẻ chuyến và tổng hợp trong báo cáo P&L.
* **Ràng buộc:** Chỉ được nhập/sửa giá thực tế khi chuyến chưa khóa (trạng thái Mới tạo, Đang chạy, Hoàn thành). Chuyến đã chốt — giá bất biến. Chuyến cũ (trước khi có tính năng này) để trống giá thực tế → dùng giá cấu hình snapshotted như hiện tại.
* **Cập nhật giá cấu hình:** Mỗi lần kế toán thay đổi đơn giá trong Cấu hình hệ thống, hệ thống tự ghi một dòng mới vào bảng `fuel_price_history` (append-only, không sửa/xóa). Giá cấu hình hiện tại luôn đồng bộ với dòng mới nhất trong lịch sử.

### 4.3.2 Lựa chọn Nhà cung cấp nhiên liệu & Ghi nhận công nợ

* **Lựa chọn Nhà cung cấp:** Đối với các chuyến xe nhà (`OWN` carrier), kế toán có thể lựa chọn nhà cung cấp nhiên liệu tương ứng. Danh sách nhà cung cấp này được chọn lọc từ danh sách nhà cung cấp (`suppliers`) dựa trên việc đánh dấu cờ "Là nhà cung cấp nhiên liệu (xăng, dầu)" (`isFuelSupplier`). Điều này giúp phân biệt rõ ràng nhà cung cấp xăng dầu với các nhà cung cấp dịch vụ khác (ví dụ: sửa xe, đăng kiểm).
* **Xuất phiếu cấp nhiên liệu:** Kế toán có thể xuất bảng cấp nhiên liệu theo từng chuyến và từng biển số xe (từ màn hình Danh sách Chuyến đi dưới dạng CSV, có đầy đủ cột tên nhà cung cấp và tổng giá trị dầu cấp) để gửi đối chiếu cho nhà cung cấp nhiên liệu.
* **Ghi nhận công nợ tự động:**
    - Khi chuyến đi được Chốt khóa (`LOCKED`), hệ thống tự động ghi nhận một bút toán Có (`credit`) bằng `totalFuelCost` (Tổng chi phí nhiên liệu thực tế của chuyến) vào sổ cái của nhà cung cấp nhiên liệu tương ứng (`entity_type='VENDOR'`, loại giao dịch `FUEL_EXPENSE`).
    - Khi chuyến đi được Mở khóa (`COMPLETED`), hệ thống ghi nhận một bút toán đối ứng Nợ (`debit` loại `UNLOCK_REVERSAL`) để hoàn tác công nợ.
* **Tra cứu đối với lái xe:** Lái xe thông qua Driver Portal có thể tra cứu chi tiết từng chuyến để biết số dầu mình được cấp và nhà cung cấp nhiên liệu chỉ định.



### 4.4 Tiền đi đường (Road Allowance)

* Là khoản chi phí hoàn trả cho lái xe (chi phí đường bộ), **không tính là thu nhập của lái xe**.
* **Tiền chuẩn:** Bảng tra cố định theo Tuyến đường × Loại rơ-mooc (~38 tuyến × 2 loại).
* Điều chỉnh do kế toán/quản lý nhập thủ công từng chuyến: Tiền vé (công ty) đã thanh toán, Tổng tiền đi đường, Số trạm.
* **Công thức:**
  - Nếu nhập "Tổng tiền đi đường" (> 0), giá trị đó được sử dụng trực tiếp; ngược lại, hệ thống tự động tính: `Tổng tiền đi đường (tự tính) = Tiền chuẩn - (Số trạm × 55.000) + [300.000 nếu về có hàng]`.
  - Số tiền thanh toán thực tế cho lái xe: `Lái xe thực lĩnh = Tổng tiền đi đường + Tiền kết hợp + Tiền lưu ca xe + Tiền đóng trả hàng 2 điểm - Tiền vé (công ty) đã thanh toán`.

### 4.5 Lương tài xế & Chấm Công

> Xem chi tiết tại [`docs/flows/14-LUONG_VA_CHAM_CONG.md`](docs/flows/14-LUONG_VA_CHAM_CONG.md)

#### 4.5.1 Mô hình Chấm Công

Hệ thống quản lý ngày công qua hai luồng song song:
1. **Tự động từ chuyến đi:** Mỗi ngày tài xế có chuyến đang chạy → hệ thống tự ghi `TRIP_DAY`.
2. **Kế toán chấm công thủ công:** Các ngày còn lại kế toán gán `STANDBY` (chờ việc/sửa xe) hoặc `PERSONAL_LEAVE` (nghỉ không lương). Hệ thống tự điền `WEEKLY_OFF` cho Chủ nhật không có chuyến.

**Trạng thái ngày công (`WorkDayStatus`):**

| Mã | Tên | Mô tả | Hưởng lương |
| :--- | :--- | :--- | :--- |
| `TRIP_DAY` | Ngày đi chuyến | Tự động từ dữ liệu vận hành | Có |
| `STANDBY` | Chờ việc / Sửa xe | Trực bãi, không có hàng, xe hỏng do lỗi công ty | Có (đầy đủ) |
| `PERSONAL_LEAVE` | Nghỉ việc riêng | Tự xin nghỉ không lương | Không |
| `WEEKLY_OFF` | Nghỉ tuần | Chủ nhật không có chuyến | Không |

**Lưu ý Chủ nhật xuyên chuyến:** Nếu chuyến kéo dài qua ngày Chủ nhật, ngày đó được tính là `TRIP_DAY` (ngày làm việc bình thường).

#### 4.5.2 Số ngày công chuẩn (`standard_work_days`)

* Tính theo **thực tế từng tháng**: tổng số ngày trong tháng − số ngày Chủ nhật.
* **Không cố định 26 ngày.** Tháng có 27 ngày làm → tính thêm; tháng có 24 ngày làm → giảm tương ứng.

#### 4.5.3 Công thức tính lương thực nhận

```
Ngày công hưởng lương = trip_days + standby_days

daily_rate = (base_salary + social_insurance) / standard_work_days

Điều chỉnh:
  Nếu ngày công < standard_work_days → adjustment = -(personal_leave_days × daily_rate)
  Nếu ngày công > standard_work_days → adjustment = +(ngày dôi × daily_rate)
  Nếu bằng nhau → adjustment = 0

net_salary = base_salary + total_trip_salary + adjustment - penalties
```

* **BHXH/BHYT:** Phần doanh nghiệp đóng (`social_insurance`) cộng vào trước khi tính `daily_rate` để phân bổ chi phí đúng. Lương thực trả tài xế vẫn dùng `base_salary` gốc; BHXH hạch toán chi phí riêng. *(Pete xác nhận 4/6)*
* **Lương sản lượng / Tiền kết hợp (Trip Salary):** Kế toán nhập thủ công `driver_salary` trên form chuyến. Được cộng vào `total_trip_salary` khi kỳ lương được tính.
* **Trường `trip_wage_days`:** Tuỳ chọn trên form chuyến — cho phép kế toán ghi override số ngày công của chuyến khi chuyến dài xuyên ngày nghỉ. *(Pete xác nhận 4/6)*
* **Phạt kỷ luật (Penalty):** Trừ vào `net_salary` (không phải chi phí công ty — xem §4.11).

#### 4.5.4 Phân bổ chi phí lương vào P&L

| Loại | Hạch toán | Ghi chú |
| :--- | :--- | :--- |
| **Nhân công trực tiếp** | Vào từng chuyến qua trường `driver_salary` | Kế toán nhập thủ công |
| **Nhân công gián tiếp (chờ việc)** | Vào chi phí chung tháng (`standby_cost = standby_days × daily_rate`) | Không gán vào chuyến bất kỳ — tránh méo hiệu quả chuyến |

* Sau khi kế toán xác nhận kỳ lương (`CONFIRMED`), hệ thống tự tạo bản ghi `expenses` loại `STANDBY_LABOR` (truck_id = null) với số tiền = `standby_cost`, hạch toán vào chi phí chung trong báo cáo lãi lỗ.

#### 4.5.5 Phân quyền chấm công

* **Kế toán:** Chấm công, sửa ngày công, xác nhận kỳ lương. Xem thu nhập tất cả tài xế.
* **Quản lý:** Xem và xác nhận kỳ lương. Xem thu nhập tất cả tài xế.
* **Tài xế:** Chỉ xem lịch chấm công và thu nhập của chính mình qua `/my-earnings`. Không được sửa.

### 4.6 Tổng chi phí (Total Cost)

* **Công thức đối với Xe nhà:** `Tổng chi phí = Chi phí dầu (lít × đơn giá thực tế hoặc đơn giá cấu hình) + Tiền đi đường + Lương sản lượng + Chi phí dịch vụ đi kèm (nếu công ty trả trực tiếp)`.
* **Công thức đối với Xe ngoài:** `Tổng chi phí = Giá cước thuê ngoài`.
* **Thuế VAT trong chi phí:** Toàn bộ khoản chi phí được ghi nhận **gồm VAT** (incl. VAT). Không trừ VAT đầu vào trên chi phí. Điều này phản ánh thực tế doanh nghiệp: chi phí thực trả cho NCC đã bao gồm thuế GTGT.
* Phạt kỷ luật **không** tính vào tổng chi phí — đây là khoản trừ lương tài xế, không phải chi phí công ty.
* **Hai tầng:** thẻ **từng chuyến** giữ nguyên công thức trên (`computeTripTotals` không đổi). Ở **báo cáo lãi lỗ theo tháng**, Tổng chi phí bao gồm **TẤT CẢ chi phí** = Σ chi phí các chuyến (gồm VAT) + Σ chi phí vận hành/bảo dưỡng theo xe (sửa chữa, phụ tùng, vật tư, bảo hiểm, đăng kiểm, phí đường bộ — xem §4.14). Chi phí bảo dưỡng là theo xe/tháng, không tính vào từng chuyến.

### 4.6.1 Chi phí dịch vụ đi kèm (Ancillary Fees)
* Các chi phí phát sinh tại cảng/bãi (Nâng container, Hạ container, Cân hàng, Kiểm hóa, Hải quan, Hạ tầng, Phục vụ kiểm hóa, Phí chi hộ khác).
* Mỗi chi phí có **Giá mua vào** (Công ty/Giao nhận trả cảng/NCC) và **Giá bán ra** (Thu của khách hàng, luôn gồm VAT).
* **Thuế GTGT dịch vụ đi kèm:** Tất cả phí đi kèm chịu VAT **8%** (mức hiện hành; có thể điều chỉnh lên 10%). Mức thuế lưu dạng **cấu hình được**, không gán cứng.
* Giá bán ra do kế toán/giao nhận nhập/sửa tự do — hệ thống gợi ý theo loại phí (xem bảng dưới). Lãi dịch vụ (Service Margin) = Bán ra − Mua vào.
* **Phí nội bộ:** Giá bán ra có thể bằng 0 (khoản chi nội bộ không báo khách, hoặc báo dưới hạng mục khác). Mỗi loại phí có thể cấu hình nhãn hiển thị riêng trên Giấy báo nợ (`billing_label`) khác với tên nội bộ.

**Danh mục phí và quy tắc mặc định:**

| Mã | Tên tiếng Việt | Trường bổ sung | Hình thức chi mặc định | Giá bán ra mặc định |
| :--- | :--- | :--- | :--- | :--- |
| `LIFTING` | Phí nâng container | Số HĐ, Ngày HĐ | FORWARDER_ADVANCE | Bằng giá mua (at cost) |
| `LOWERING` | Phí hạ container | Số HĐ, Ngày HĐ | FORWARDER_ADVANCE | Bằng giá mua |
| `WEIGHING` | Phí cân hàng | Số HĐ, Ngày HĐ | FORWARDER_ADVANCE | Bằng giá mua |
| `CUSTOMS` | Phí làm tờ khai hải quan | Số tờ khai, Số container | FORWARDER_ADVANCE | Cộng thêm phí quản lý (markup) |
| `INFRASTRUCTURE` | Phí kết cấu hạ tầng (nộp hộ) | Số container | FORWARDER_ADVANCE | Bằng giá mua |
| `INSPECTION` | Phí kiểm hóa tại cảng | Số HĐ, Ngày HĐ | FORWARDER_ADVANCE | Bằng giá mua |
| `INSPECTION_SVC` | Phí phục vụ kiểm hóa | Diễn giải chi tiết | FORWARDER_ADVANCE | Cộng thêm phí quản lý |
| `OTHER` | Phí chi hộ khác | Diễn giải chi tiết, Số container | FORWARDER_ADVANCE | Theo từng trường hợp (có thể = 0) |

> Mặc định FORWARDER_ADVANCE cho tất cả. Chuyển sang COMPANY_DIRECT khi: phí nộp hộ tại hãng tàu có HĐ xuất tên NePO, **hoặc** khoản **> 5.000.000 VNĐ** (NePO chuyển khoản trực tiếp). Đây là gợi ý — người dùng luôn có thể ghi đè.

* **Đường dẫn thanh toán (Settlement Method):**
    * **COMPANY_DIRECT**: Công ty trả trực tiếp cho NCC/Cảng → Tạo công nợ phải trả NCC.
    * **FORWARDER_ADVANCE**: Giao nhận trả hộ bằng tiền tạm ứng → Trừ vào số dư tạm ứng của giao nhận; không tạo công nợ NCC. (Mặc định).
* Các khoản phí cần lưu trữ: Số hóa đơn, Ngày hóa đơn, Số tờ khai (hải quan), và Số container.

### 4.7 Lợi nhuận

* **Nguyên tắc VAT (bất đối xứng):** Doanh thu ghi nhận **chưa VAT** (ex-VAT), chi phí ghi nhận **gồm VAT** (incl. VAT). Đây là phương pháp tính của công ty: cước bán ra cho KH gồm VAT, nhưng nội bộ chỉ tính phần doanh thu thực (không VAT) trừ đi toàn bộ chi phí thực chi (đã có VAT). Khoản VAT đầu ra không phải thu nhập công ty; VAT đầu vào trên chi phí là chi phí thực tế không được khấu trừ trong bức tranh nội bộ.
* **Lợi nhuận gộp (Gross Profit):** = Doanh thu vận tải **chưa VAT** − Tổng chi phí **gồm VAT**, tính theo từng **xe đầu kéo** (hoặc gộp riêng thành mục Xe ngoài), theo tháng. **Tổng chi phí xe** = Σ chi phí các chuyến của xe (gồm VAT) + Σ chi phí bảo dưỡng gắn chính xe đầu kéo đó **hoặc rơ-mooc ghép cặp với xe đó** trong tháng (sửa chữa đầu kéo/rơ-mooc, bảo hiểm/đăng kiểm/phí đường bộ của cả cặp). Mỗi đầu kéo và rơ-mooc **ghép thành cặp cố định** — chi phí rơ-mooc tính chung vào chi phí của đầu kéo ghép cặp. Mỗi phiếu chi phí gắn xe đánh dấu thuộc **đầu kéo** hay **rơ-mooc** (`vehicle_component: 'TRUCK' | 'TRAILER'`), cho phép báo cáo phân tách chi phí sửa chữa/đăng kiểm/thay lốp theo thành phần xe *(Pete xác nhận 1/6)*.
* **Lợi nhuận ròng (Net Profit):** = Tổng LN gộp tất cả xe − Phí quản lý − **Chi phí không gắn xe (chi phí chung, gồm VAT)** + Thu nhập khác.
* **Phí quản lý:** Khoản cố định hàng tháng cho toàn công ty. Kế toán nhập thủ công. *(Mức cụ thể do Giám đốc ấn định — tạm thời placeholder 24.000.000 VNĐ/tháng; sẽ xác nhận chính thức sau.)*
* **Thu nhập khác (Other Income):** Ghi nhận doanh thu phạt kỷ luật. Lương tài xế ghi nhận đầy đủ, không trừ phạt.

### 4.8 Phân chia lợi nhuận

* **Mô hình Kết hợp (Hybrid Approach)**:
  * **Đầu vào (CapTableHistory)**: Theo dõi lịch sử thay đổi tỷ lệ cổ phần (VD hiện tại: Ông Thương 29.55%, Ông Phụng 70.45%).
  * **Đầu ra (Distribution Snapshot)**: Khi phân chia (theo quý/năm), hệ thống tính toán dựa trên tỷ lệ lịch sử hiện hành và khóa chết kết quả thành các bản ghi phân bổ (distributions) bất biến. Báo cáo năm chỉ cần `SUM` các bản ghi này.

### 4.9 Khóa chuyến đi & Điều chỉnh (Trip Locking & Corrections)

* Chuyến đi được quản lý/kế toán kiểm tra và **khóa (Đã chốt) theo từng chuyến** (trip-by-trip) khi dữ liệu đã chính xác. Không có cơ chế "chốt tháng" — từng chuyến là commit point duy nhất.
* Khi một chuyến chuyển sang "Đã chốt", hệ thống sinh ra bản ghi bất biến trong Sổ cái (Ledger).
* Dashboard hiển thị lợi nhuận cộng dồn của các chuyến `Đang chạy`, `Hoàn thành` và `Đã chốt`.
* **Nghiệp vụ sửa lỗi:** Số liệu đã chốt không thể sửa đổi quá khứ. Tuân thủ chuẩn kế toán Việt Nam, nếu sai sót phải xuất **Hóa đơn điều chỉnh** (Adjustment E-Invoice) ở kỳ hiện tại kèm biên bản thỏa thuận. Số âm cho điều chỉnh giảm (Credit Note), số dương cho điều chỉnh tăng (Debit Note).

### 4.10 Công nợ phải thu & Kiến trúc Sổ cái (Ledger)

* **Sổ cái trung tâm (Transaction Ledger):** Toàn bộ giao dịch tài chính (Công nợ KH, Lương/Phạt lái xe, Chi phí) đều được ghi nhận vào một bảng Sổ cái bất biến. (Gồm các trường: ID, date, txn_type, txn_id, receipt_id, entity_type, entity_id, credit, debit, balance, note).
* Mỗi chuyến `Đã chốt` tạo 1 dòng ghi nợ trên Sổ cái khách hàng với `txn_id` là ID của chuyến đi.
* **Ghi nhận thanh toán:** Thanh toán được khớp (match) với từng chuyến đi cụ thể. Một khoản chuyển khoản ngân hàng (có `receipt_id` chung) sẽ tạo ra nhiều dòng ghi có (mỗi dòng tương ứng với số tiền trả cho một `txn_id` cụ thể). Hệ thống cho phép thanh toán một phần (partial payment).
* **Tính nợ động:** Số dư nợ hiện tại là cột `balance` ở dòng cuối cùng của thực thể đó. Tình trạng nợ của từng chuyến đi được tính bằng tổng debit trừ tổng credit của chuyến đó.
* Kế toán xuất sao kê cho khách hàng ghi tổng công nợ. Cảnh báo: Quá hạn 30/60/90 ngày.
* **Giấy báo nợ (Debit Note):** Bản xuất ra PDF/Excel gửi cho khách hàng, bao gồm Cước vận tải + Chi phí dịch vụ đi kèm. Tùy chọn xuất theo tháng (MONTHLY) hoặc theo từng lô (PER_BATCH) cấu hình theo khách hàng.
* **Đối trừ công nợ (Debt Netting):** Đối với khách hàng đồng thời là đối tác/nhà cung cấp. Kế toán lập Bảng đối chiếu công nợ hàng tháng, lấy min(Công nợ phải thu, Công nợ phải trả) để cấn trừ (Full offset). Giám đốc duyệt mới ghi nhận vào Sổ cái.

### 4.11 Kỷ luật (Penalty)

* Kế toán ghi nhận thủ công các vi phạm.
* Hệ thống cung cấp **danh mục lý do vi phạm** có sẵn (VD: "Thiếu hóa đơn dầu - 100.000đ", "Vi phạm an toàn giao thông - 500.000đ").
* Kế toán có thể nhập lý do mới; hệ thống kiểm tra trùng lặp khi nhập.
* Phạt kỷ luật là khoản **thu nhập khác** của công ty, đồng thời là khoản trừ lương tài xế.

### 4.12 Container, Seal & Ảnh xác nhận chuyến

* **Theo dõi container theo chuyến:** Mỗi chuyến đi có thể chở nhiều container (VD: 2×20FT hoặc 1×40FT). Mỗi container được ghi nhận riêng biệt với 3 thông tin: **Loại container** (từ danh mục cấu hình), **Số container** và **Số seal**.
* **Nhập liệu kép (text + ảnh):** Số container và số seal được nhập **bằng text** (nhập tay) **và/hoặc** upload ảnh. Kế toán, Giám đốc và Giao nhận đều có thể nhập.
* **Loại container (Container Type):** Danh mục cấu hình do người dùng tự khai báo (VD: 20'DC, 20'OT, 20'RF, 40'DC, 40'HC...). Mỗi container trong chuyến chọn loại từ danh mục này. Khác với loại rơ-mooc (20FT/40FT) — một rơ-mooc 40FT có thể chở 1 container 40'HC hoặc 2 container 20'DC.
* **Ảnh xác nhận:** Tất cả loại hàng hóa đều yêu cầu upload ảnh khi hoàn thành chuyến. Kế toán thực hiện upload. *(Pete xác nhận: "tất cả đều yêu cầu chụp ảnh")*
* Trường `requires_photos` trên bảng **Loại hàng hóa** vẫn giữ để cấu hình mức độ bắt buộc theo từng loại hàng trong tương lai.
* **Chuyến chè (Special Cargo: Tea):** Đặc biệt yêu cầu ảnh Container **và** Seal (niêm phong). Không điều chỉnh thêm tiền đi đường.

### 4.13 Đội xe & Nhân sự

* 1 xe có thể có nhiều lái xe được phân công.
* **Rơ-mooc ghép cặp cố định:** Mỗi đầu kéo ghép với một rơ-mooc cố định — biển số và loại rơ-mooc (20FT/40FT) lưu trực tiếp trên bảng xe đầu kéo. Không có bảng rơ-mooc riêng. Khi tạo chuyến, hệ thống tự tra loại rơ-mooc từ xe được chọn để tính tiền đi đường chuẩn. *(Pete xác nhận 31/5)*
* **Đa container:** 1 chuyến xe có thể chở nhiều container (VD: 2 container 20ft hoặc 1 container 40ft). Mỗi container có **loại riêng** (20'DC, 40'HC...), **số container** và **số seal** — không phải chỉ đếm số lượng. *(Pete xác nhận: "có thể 1 chuyến chạy 2 cont 20'")*

### 4.14 Loại Container & Cảng/Bãi (Container Types & Ports/Depots)

* **Loại container:** Danh mục **cấu hình được** do người dùng tự khai báo trong Cấu hình hệ thống. Mỗi loại có: mã (VD: `20DC`, `40HC`), tên hiển thị (VD: 20'DC, 40'HC), kích thước nhóm (20FT/40FT) dùng để validate phù hợp với rơ-mooc, và trạng thái. Dữ liệu mẫu: 20'DC (Dry Container), 20'OT (Open Top), 20'RF (Reefer), 40'DC, 40'HC (High Cube)...
* **Cảng / Bãi:** Danh mục cấu hình các cảng và bãi (chủ yếu tại Hải Phòng). Mỗi cảng/bãi có: tên (VD: Cảng Đình Vũ, Cảng Nam Hải, Bãi ICD NL), địa chỉ, ghi chú, và trạng thái. Danh mục có thể do người dùng tự khai báo hoặc cập nhật.
* **Sử dụng trong chặng (Trip Legs):** Khi kế toán nhập chặng chi tiết (điểm đi, điểm đến), trường origin/destination hỗ trợ **combobox** — dropdown chọn từ danh mục Cảng/Bãi, đồng thời cho phép nhập text tự do nếu điểm chưa có trong danh mục. Mục mới nhập sẽ được gợi ý thêm vào danh mục.

### 4.15 Chi phí vận hành, Nhà cung cấp & Công nợ phải trả

* **Phạm vi:** ghi nhận chi phí vận hành ngoài chuyến đi — sửa chữa, phụ tùng, vật tư, bảo hiểm, đăng kiểm, phí đường bộ — gắn với Nhà cung cấp và (tùy chọn) một xe.
* **Nhà cung cấp (NCC):** danh mục mọi bên nhận tiền (gara, trạm lốp, cửa hàng phụ tùng, công ty bảo hiểm, trung tâm đăng kiểm, đơn vị thu phí đường bộ). **Bắt buộc** trên mọi khoản chi phí. Không có trường "phân loại" (phân loại nằm ở hạng mục từng khoản chi).
* **Hạng mục chi phí:** danh mục **cấu hình được** (người dùng tự thêm). Mỗi hạng mục là **một lần** hoặc **định kỳ** (`is_renewable`); hạng mục định kỳ có `reminder_lead_days` (mặc định 30 ngày).
* **Chi phí phát sinh:** một khoản chi = một hạng mục + một số tiền. Gắn NCC (bắt buộc) + một **xe đầu kéo** (tùy chọn, có thể để trống → chi phí chung). Khi chọn xe, kế toán đánh dấu chi phí thuộc **đầu kéo** hay **rơ-mooc** qua trường `vehicle_component` (`'TRUCK'` | `'TRAILER'`, mặc định `'TRUCK'`). Chi phí rơ-mooc vẫn gộp vào lãi gộp của đầu kéo ghép cặp — phân loại chỉ dùng cho báo cáo phân tách (sửa chữa, đăng kiểm, thay lốp). Đính được ảnh hóa đơn. Hóa đơn nhiều khoản → ghi nhận nhiều lần. *(Pete xác nhận 1/6: "chi phí sửa chữa và đăng kiểm, thay lốp nên tách theo rơ-mooc và đầu kéo")*
* **Trạng thái thanh toán:**
    * **Trả ngay (PAID):** chỉ ghi cho P&L, không phát sinh công nợ (hệ thống không có tài khoản tiền mặt).
    * **Ghi nợ (UNPAID):** tạo bản ghi Sổ cái `entity_type='VENDOR'` (credit = số tiền) → phát sinh **công nợ phải trả**.
* **Hạng mục định kỳ:** phiếu ghi `valid_from`/`valid_to`. Dashboard **nhắc gia hạn** khi `hôm nay >= valid_to − reminder_lead_days` hoặc đã quá hạn (dùng `valid_to` mới nhất theo từng xe × hạng mục). Gia hạn = tạo phiếu mới hạn xa hơn. **Không phân bổ** — ghi toàn bộ vào tháng thanh toán.
* **Công nợ phải trả (Accounts Payable):** mirror công nợ phải thu trên `entity_type='VENDOR'`. Quy ước dấu giống lái xe: `balance = balance trước + Credit − Debit`. **Tuổi nợ ngược chiều phải thu:** chi phí là Credit (tính tuổi), thanh toán là Debit (áp FIFO).
* **Thanh toán công nợ:** kế toán nhập tổng tiền trả cho một NCC → `VENDOR_PAYMENT` (debit) giảm số dư. **Khớp FIFO theo tổng số dư, không khớp từng khoản chi.**
* **Sửa/Xóa phiếu đã ghi nợ:** dùng bút toán **ADJUSTMENT** bù trừ (Sổ cái append-only); dòng phiếu soft-delete.
* **Bảng `expenses`** là bảng vận hành mới (không phải bảng cấu hình), kèm bảng `expense_photos` cho ảnh hóa đơn.

---

## 5. DANH SÁCH USER STORIES (THEO MODULE)

### MODULE 1: NHẬN ĐƠN HÀNG & PHÂN XE (ORDER & DISPATCH)
1. **[Quản lý]** Tôi muốn tạo chuyến đi mới với: khách hàng, tuyến đường, xe đầu kéo, lái xe, loại hàng hóa, ngày xuất phát → trạng thái "Mới tạo". Loại rơ-mooc tự động lấy từ xe được chọn.
2. **[Quản lý]** Tôi muốn chuyển trạng thái chuyến đi (Mới tạo → Đang chạy → Hoàn thành → Đã chốt).
4. **[Lái xe]** Tôi muốn xem lịch trình chuyến đi của mình trên điện thoại (chỉ xem).
5. **[Lái xe]** Tôi muốn xem số dầu được cấp cho chuyến đi trên điện thoại (chỉ xem).

### MODULE 2: GHI NHẬN CHUYẾN ĐI & CHI PHÍ
1. **[Kế toán]** Tôi muốn nhập số liệu thực tế cho chuyến đi: km, số lít dầu, loại tải (hàng/vỏ), điều chỉnh vé đường, số trạm, lương sản lượng, doanh thu.
2. **[Kế toán]** Tôi muốn hệ thống tự động tính: chi phí nhiên liệu (lít × đơn giá), tiền đi đường, tổng chi phí, lợi nhuận gộp.
3. **[Kế toán/Giám đốc/Giao nhận]** Tôi muốn nhập danh sách container cho chuyến: loại container (từ danh mục), số container (nhập text), số seal (nhập text). Có thể nhập ở cả bước tạo chuyến và bước hoàn thành.
4. **[Kế toán]** Tôi muốn upload ảnh container/seal đối với chuyến chở chè khi đóng chuyến. Bên cạnh ảnh, có thể nhập số container/seal bằng text.
5. **[Kế toán]** Tôi muốn thêm ghi chú/diễn giải cho chuyến đi.

### MODULE 3: KIỂM SOÁT NHIÊN LIỆU & TIỀN ĐI ĐƯỜNG
1. **[Hệ thống]** Tự động tính TTBQ (liters/km × 100) và hiển thị trên chi tiết chuyến đi. Đối chiếu định mức và cảnh báo hoãn sang giai đoạn sau.

### MODULE 4: THEO DÕI DOANH THU & CHI PHÍ
1. **[Quản lý]** Tôi muốn xem Dashboard tổng hợp hiển thị doanh thu, chi phí, và lợi nhuận gộp của tất cả xe theo thời gian thực.
2. **[Quản lý]** Tôi muốn xem biểu đồ xu hướng doanh thu theo tháng, cơ cấu chi phí (pie chart) và top tuyến đường sinh lời.

### MODULE 5: QUẢN LÝ CÔNG NỢ PHẢI THU
1. **[Kế toán/Quản lý]** Tôi muốn xem danh sách khách hàng cùng số dư và tuổi nợ mã hóa màu (Đỏ/Vàng/Xanh).
2. **[Kế toán/Quản lý]** Tôi muốn nhận cảnh báo tự động khi khách hàng quá hạn 30/60/90 ngày.
3. **[Kế toán]** Tôi muốn ghi nhận thanh toán (toàn bộ hoặc một phần) vào tổng số dư của khách hàng. Hệ thống gợi ý FIFO (chuyến cũ nhất trước), nhưng tôi có thể chọn chuyến cụ thể để thanh toán.
4. **[Kế toán]** Tôi muốn xuất sao kê công nợ cho khách hàng.

### MODULE 6: PHÂN CHIA LỢI NHUẬN
1. **[Quản lý]** Tôi muốn hệ thống tự động tính lợi nhuận ròng (= Tổng LN gộp - Phí quản lý + Thu nhập khác) và phân bổ theo tỷ lệ vốn góp.
2. **[Quản lý]** Tôi muốn cấu hình cổ đông: thêm/đổi/rút cổ phần và điều chỉnh tỷ lệ.

### MODULE 7: KỶ LUẬT
1. **[Kế toán]** Tôi muốn ghi nhận vi phạm dựa trên danh mục có sẵn hoặc nhập lý do mới (hệ thống kiểm tra trùng lặp) và ghi số tiền phạt.
2. **[Kế toán]** Tôi muốn xem tổng hợp phạt kỷ luật theo lái xe, theo tháng.
3. **[Lái xe]** Tôi muốn xem số lần vi phạm và mức phạt tích lũy trên điện thoại (chỉ xem).

### MODULE 8: CẤU HÌNH HỆ THỐNG
1. **[Kế toán/Quản lý]** Tôi muốn quản lý danh mục: Khách hàng, Tuyến đường, Xe đầu kéo, Lái xe.
2. **[Kế toán]** Tôi muốn cấu hình bảng giá theo Khách hàng × Tuyến đường.
3. **[Kế toán]** Tôi muốn cấu hình tiền đi đường chuẩn theo Tuyến đường × Loại rơ-mooc.
4. **[Kế toán]** Tôi muốn cấu hình đơn giá nhiên liệu.
5. **[Kế toán]** Tôi muốn cấu hình định mức nhiên liệu theo tuyến đèo đốc.
6. **[Kế toán]** Tôi muốn nhập phí quản lý hàng tháng.
7. **[Kế toán]** Tôi muốn quản lý danh mục lý do vi phạm kỷ luật.
8. **[Kế toán/Quản lý]** Tôi muốn quản lý danh mục Nhà cung cấp và Hạng mục chi phí (một lần/định kỳ, số ngày nhắc gia hạn).
9. **[Kế toán/Quản lý]** Tôi muốn quản lý danh mục Loại container (thêm/sửa/xóa: 20'DC, 20'OT, 20'RF, 40'DC, 40'HC...). Mỗi loại có mã, tên hiển thị, kích thước nhóm (20FT/40FT) và trạng thái.
10. **[Kế toán/Quản lý]** Tôi muốn quản lý danh mục Cảng/Bãi (thêm/sửa/xóa). Khi nhập chặng (trip legs), có thể chọn từ dropdown hoặc nhập mới — mục mới được gợi ý thêm vào danh mục.
11. **[Kế toán]** Tôi muốn xem lịch sử thay đổi đơn giá nhiên liệu theo thời gian, và khi nhập liệu chuyến hệ thống đề xuất giá hiệu lực theo ngày xuất phát.

### MODULE 9: CHI PHÍ VẬN HÀNH & CÔNG NỢ PHẢI TRẢ
1. **[Kế toán]** Tôi muốn ghi nhận chi phí phát sinh (sửa chữa, phụ tùng, vật tư, bảo hiểm, đăng kiểm, phí đường bộ), gắn Nhà cung cấp và (tùy chọn) một xe, đánh dấu chi phí thuộc đầu kéo hay rơ-mooc (`vehicle_component`), đính ảnh hóa đơn.
2. **[Kế toán]** Tôi muốn chọn trạng thái Trả ngay hoặc Ghi nợ; phiếu Ghi nợ tự phát sinh công nợ phải trả cho NCC.
3. **[Kế toán/Quản lý]** Tôi muốn xem danh sách công nợ phải trả theo NCC kèm tuổi nợ (0–30/31–60/61–90/90+) và xuất sao kê NCC.
4. **[Kế toán]** Tôi muốn ghi nhận thanh toán cho NCC (giảm tổng số dư, FIFO).
5. **[Quản lý]** Tôi muốn lợi nhuận gộp theo xe đã trừ chi phí bảo dưỡng của xe đó (bao gồm chi phí rơ-mooc ghép cặp), và lợi nhuận ròng đã trừ chi phí chung (không gắn xe). Báo cáo phân tách chi phí đầu kéo vs rơ-mooc.
6. **[Quản lý/Kế toán]** Tôi muốn Dashboard nhắc khi bảo hiểm/đăng kiểm/phí đường bộ của xe sắp tới hạn hoặc đã quá hạn.

### MODULE 10: LƯƠNG & CHẤM CÔNG TÀI XẾ
1. **[Kế toán]** Tôi muốn xem lịch chấm công tháng của từng tài xế — các ngày đi chuyến (`TRIP_DAY`) được hệ thống tự điền; tôi chỉ cần click vào ngày còn lại để gán `STANDBY` (chờ việc/sửa xe) hoặc `PERSONAL_LEAVE` (nghỉ không lương).
2. **[Kế toán]** Tôi muốn hệ thống tự tính lương thực nhận tháng: lương cứng + tổng lương chuyến + điều chỉnh công thiếu/thừa − phạt kỷ luật. Số ngày công chuẩn tính theo số ngày làm việc thực tế của tháng (không cố định 26).
3. **[Kế toán]** Tôi muốn xác nhận kỳ lương (CONFIRMED) — sau đó hệ thống tự hạch toán chi phí chờ việc (`standby_cost`) vào chi phí chung trong báo cáo lãi lỗ.
4. **[Kế toán]** Tôi muốn nhập `driver_salary` (lương kết hợp/thưởng) và tùy chọn `trip_wage_days` trên form chuyến để kế toán kiểm soát chính xác khi chuyến kéo dài xuyên Chủ nhật.
5. **[Quản lý]** Tôi muốn xem tổng kết lương tất cả tài xế theo tháng.
6. **[Tài xế]** Tôi muốn xem lịch chấm công và thu nhập của mình (lương cứng, lương chuyến, điều chỉnh, phạt, lương thực nhận) trên điện thoại. Chỉ xem, không sửa.

---

## 6. BẢNG CẤU HÌNH HỆ THỐNG (CONFIGURATION TABLES)

| # | Bảng | Mô tả | Dữ liệu mẫu |
| :--- | :--- | :--- | :--- |
| 1 | **Khách hàng** | Tên, liên hệ, thông tin công nợ, phương thức Giấy báo nợ, Đối tác liên kết | 44+ khách hàng |
| 2 | **Tuyến đường** | Tên tuyến, khoảng cách, định mức đèo đốc (nếu có) | 38+ tuyến |
| 3 | **Bảng giá** | Giá cố định theo Khách hàng × Tuyến đường | ~44×38 = 1.672 dòng |
| 4 | **Xe đầu kéo** | Biển số, biển số rơ-mooc ghép cặp, loại rơ-mooc (20FT/40FT), trạng thái | 4 xe (rơ-mooc không có bảng riêng) |
| 5 | **Lái xe** | Tên, xe được phân công, liên hệ, lương cơ bản | Nhiều lái xe/xe |
| 6 | **Loại hàng hóa** | Tên loại, có yêu cầu upload ảnh không | VD: Chè (yêu cầu ảnh) |
| 7 | **Tiền đi đường chuẩn** | Tiền chuẩn theo Tuyến đường × Loại rơ-mooc (20FT/40FT) | ~38×2 = 76 dòng |
| 8 | **Định mức nhiên liệu** | Định mức hàng/vỏ (cấu hình được), bổ sung/chuyến, đèo đốc theo tuyến | Cấu hình + theo tuyến |
| 9 | **Đơn giá nhiên liệu** | Đơn giá 1 lít dầu (hiện tại 18.730 VNĐ), có lịch sử giá theo ngày hiệu lực | 1 giá hiện tại + bảng lịch sử |
| 10 | **Cổ đông & Tỷ lệ vốn** | Tên, tỷ lệ %, ngày hiệu lực | Ông Thương 29.55%, Ông Phụng 70.45% |
| 11 | **Danh mục kỷ luật** | Lý do vi phạm + số tiền phạt mặc định | VD: "Thiếu hóa đơn dầu - 100.000đ" |
| 12 | **Sổ cái (Ledger)** | Ghi nhận tập trung toàn bộ giao dịch (Công nợ KH, Lương/Phạt, Thanh toán, Công nợ NCC) | Các cột: ID, date, txn_type, credit, debit, balance |
| 13 | **Nhà cung cấp** | Tên, người liên hệ, SĐT, mã số thuế, ghi chú, trạng thái, Khách hàng liên kết | Gara, trạm lốp, phụ tùng, bảo hiểm, đăng kiểm... |
| 14 | **Hạng mục chi phí** | Tên, một lần/định kỳ (is_renewable), số ngày nhắc trước (mặc định 30) | Sửa chữa, Phụ tùng, Vật tư, Bảo hiểm, Đăng kiểm, Phí đường bộ |
| 15 | **Loại container** | Mã loại, tên hiển thị, kích thước nhóm (20FT/40FT), trạng thái | 20'DC, 20'OT, 20'RF, 40'DC, 40'HC... |
| 16 | **Cảng / Bãi** | Tên, địa chỉ, ghi chú, trạng thái | Cảng Đình Vũ, Cảng Nam Hải, Bãi ICD NL... |
| 17 | **Lịch sử giá nhiên liệu** | Đơn giá, ngày hiệu lực, người thay đổi, ghi chú — append-only | Tự ghi khi cập nhật đơn giá cấu hình |
| 18 | **Danh mục Chi phí Giao nhận** | Cấu hình các loại phí tại cảng, cờ mặc định xuất hóa đơn, cờ mặc định tính lãi | Nâng hạ, Cân xe, Kiểm hóa... |
| 19 | **Ngày công tài xế (`driver_work_days`)** | Mỗi dòng = 1 ngày của 1 tài xế. Trạng thái: `TRIP_DAY` (tự động) / `STANDBY` / `PERSONAL_LEAVE` / `WEEKLY_OFF`. Liên kết `trip_id` nếu TRIP_DAY. | Tự động + kế toán chấm |
| 20 | **Kỳ lương (`salary_periods`)** | Tổng kết lương tháng: ngày công chuẩn, daily_rate, trip_days, standby_days, total_trip_salary, adjustment, penalties, BHXH, net_salary, standby_cost. Status: DRAFT → CONFIRMED | 1 bản ghi / tài xế / tháng |

---

## 7. CÁC TRƯỜNG DỮ LIỆU CHUYẾN ĐI (TRIP DATA FIELDS)

### Pha 1 — Quản lý tạo chuyến (trạng thái: Mới tạo)

| Trường | Loại | Bắt buộc | Ghi chú |
| :--- | :--- | :--- | :--- |
| Khách hàng | Select | Có | Từ danh mục |
| Tuyến đường | Select | Có | Từ danh mục |
| VAT Rate | Number | Có | Tỷ lệ thuế VAT (VD: 0.08) cho doanh thu vận tải |
| Chế độ điều xe | Toggle | Có | Xe nhà (OWN) hoặc Xe ngoài (EXTERNAL) |
| Xe đầu kéo | Select | Có (OWN) | Từ danh mục; loại rơ-mooc (20FT/40FT) tự động tra |
| Lái xe | Select | Có (OWN) | Theo xe được phân công |
| Đối tác vận chuyển | Select | Có (EXT) | Nhập NCC (dành cho Xe ngoài) |
| Giá cước thuê ngoài | Number | Có (EXT) | Giá thuê xe ngoài gồm VAT |
| Biển số xe ngoài | Text | Có (EXT) | |
| Tên tài xế ngoài | Text | Có (EXT) | |
| SĐT tài xế ngoài | Text | Có (EXT) | |
| Loại hàng hóa | Select | Có | Từ danh mục (VD: Chè, Container rỗng, Hàng tổng hợp...) |
| Ngày xuất phát | Date | Có | |
| **Các container** | Dynamic rows | Không | Mỗi dòng: Loại container (dropdown từ danh mục — VD: 20'DC, 40'HC), Số container (text nhập tay), Số seal (text nhập tay). Có thể thêm/xóa dòng. VD: 2×20'DC hoặc 1×40'HC. |

### Pha 2 — Kế toán nhập số liệu thực tế (trạng thái: Hoàn thành)

| Trường | Loại | Bắt buộc | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Các chặng (Trip Legs)** | Dynamic rows | Có | Kế toán nhập từng chặng: điểm đi, điểm đến (combobox — dropdown Cảng/Bãi hoặc nhập text tự do), số km, loại tải (hàng/vỏ). Hệ thống tự tính L dầu mỗi chặng theo định mức. |
| Chế độ nhập nhiên liệu | Select (AUTO / KHOÁN) | Có | AUTO: tổng L dầu từ các chặng. KHOÁN: nhập tổng L dầu bằng tay (ghi đè). |
| Dầu bổ sung | Number | Không | L dầu thêm do xe hỏng, đi sửa... (cộng thêm vào cả 2 chế độ) |
| Lý do bổ sung | Text | Không | Bắt buộc nếu có dầu bổ sung |
| **Đơn giá thực tế** | Number | Không | Giá thực mua tại trạm (VNĐ/lít). Để trống → dùng đơn giá cấu hình. Hệ thống đề xuất giá hiệu lực từ lịch sử theo ngày xuất phát. Chỉ nhập trước khi khóa chuyến. |
| Tiền vé (công ty) đã thanh toán | Number | Không | Mặc định 0 |
| Tổng tiền đi đường | Number | Không | Mặc định 0 |
| Số trạm | Number | Không | Mặc định 0, nhân với 55.000 |
| Chuyến về có hàng | Checkbox | Không | Nếu tích → + 300.000 VNĐ tiền đi đường |
| Lương sản lượng | Number | Có (OWN) | Thu nhập lái xe cho chuyến này (chỉ Xe nhà) |
| Doanh thu đóng/ trả hàng | Number | Có | Doanh thu tiêu chuẩn trả hàng/container, INCL VAT |
| Doanh thu kết hợp | Number | Không | Doanh thu bổ sung từ kết hợp trong chuyến (mặc định 0). |
| Ghi chú/diễn giải | Text | Không | |
| **Các container** | Dynamic rows | Không | Cập nhật/bổ sung: Loại container, Số container, Số seal. |
| **Chi phí DV đi kèm**| Dynamic rows | Không | Mỗi dòng: Loại phí, Giá mua, Giá bán, NCC, Hình thức chi (COMPANY_DIRECT/FORWARDER_ADVANCE), Số hóa đơn/ngày, Tờ khai. |
| Ảnh xác nhận hàng hóa | Upload + Text | Có (tất cả) | Bắt buộc upload ảnh cho tất cả loại hàng khi hoàn thành. Chuyến chè bắt buộc có ảnh Container **và** Seal. Bên cạnh ảnh, có thể nhập số container/seal bằng text. |

### Tự động tính toán (read-only)

| Trường | Công thức |
| :--- | :--- |
| Tổng L dầu | AUTO: tổng L từ các chặng + bổ sung. KHOÁN: L nhập tay + bổ sung. |
| Chi phí dầu | Tổng L dầu × Đơn giá thực tế (nếu có) hoặc Đơn giá cấu hình |
| Chênh lệch giá dầu | Chi phí dầu (thực tế) − (Tổng L dầu × Đơn giá cấu hình). Chỉ hiển thị khi có đơn giá thực tế |
| Tiền lái xe thực lĩnh | Tổng tiền đi đường + Tiền kết hợp + Tiền lưu ca xe + Tiền đóng trả hàng 2 điểm − Tiền vé (công ty) đã thanh toán |
| Tổng chi phí (Xe nhà) | Chi phí dầu (incl. VAT) + Tiền đi đường + Lương sản lượng + Chi phí DV đi kèm (COMPANY_DIRECT, incl. VAT) |
| Doanh thu chuyến | (Doanh thu đóng/ trả hàng + Doanh thu kết hợp) / (1 + VAT) — **ex-VAT** |
| Lợi nhuận dịch vụ | Lãi từ dịch vụ đi kèm (Bán ra - Mua vào) — giá bán ra ex-VAT, giá mua vào incl. VAT |
| Lợi nhuận xe ngoài | Doanh thu ex-VAT − Chi phí xe ngoài (incl. VAT) |
| Lợi nhuận gộp | **Doanh thu vận tải ex-VAT** − **Tổng chi phí (incl. VAT)** + LN dịch vụ + LN xe ngoài |
