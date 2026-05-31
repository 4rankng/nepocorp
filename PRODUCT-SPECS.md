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

**Ngoài phạm vi:** GPS tracking, variable pricing.

---

## 4. QUY TẮC NGHIỆP VỤ CỐT LÕI (BUSINESS RULES)

### 4.1 Chuyến đi (Trips)

* **Trip (Chuyến xe)** là đơn vị vận hành cốt lõi — mỗi chuyến là một lần xe chạy độc lập. Khách hàng và tuyến đường được chọn trực tiếp trên Trip.
* **Customer Reference (Tham chiếu KH):** Trường tùy chọn trên Trip để nhóm các chuyến phục vụ cùng một yêu cầu của khách hàng. Khái niệm Order/Đơn hàng chính thức được hoãn sang hậu MVP.
* **Trạng thái chuyến đi (5 trạng thái):**
    1. **Mới tạo**: Quản lý tạo thông tin cơ bản. Kế toán nhập các số liệu dự kiến (km, dầu, vé).
    2. **Đang chạy**: Tài xế đã xuất phát. Kế toán có thể cập nhật số liệu bất kỳ lúc nào.
    3. **Hoàn thành**: Xe đã về. Kế toán nhập/đối chiếu số liệu thực tế cuối cùng (đăng ảnh chuyến chè nếu có). Vẫn có thể sửa nếu gõ sai.
    4. **Đã chốt**: Khóa sổ, hệ thống tạo bản ghi Sổ cái (Ledger). Cấm sửa đổi.
    5. **Đã hủy**: Chuyến xe bị hủy bỏ giữa chừng, lưu lại lịch sử.
* **Quy trình nhập liệu:** Quản lý tạo chuyến -> Kế toán điền số dự kiến -> Xe chạy -> Xe về, kế toán chốt số thực tế -> Quản lý/Kế toán khóa chuyến (Đã chốt).

### 4.2 Doanh thu & Bảng giá

* **Doanh thu** được xác định bằng bảng tra cố định theo **Khách hàng × Tuyến đường** (cùng tuyến đường có thể có giá khác nhau cho từng khách hàng).
* Bảng giá hiện tại cố định; variable pricing có thể xem xét sau.
* **Phân biệt Tuyến đường vs. Chặng chi tiết:** Tuyến đường (Route) là khái niệm tổng quát (VD: "Hải Phòng - Hà Nội") dùng làm khóa tra **bảng giá** và **tiền đi đường chuẩn**. Các chặng chi tiết (Trip Legs: cảng → nhà máy A → kho B...) là dữ liệu bổ sung nhập trong quá trình thực hiện chuyến để tính **định mức nhiên liệu** chính xác theo từng đoạn. *(Pete xác nhận 19/5: "Chính xác")*

### 4.3 Chi phí nhiên liệu

* Kế toán nhập **số lít dầu**; hệ thống tự nhân với **đơn giá cấu hình** để tính chi phí dầu. Đơn giá có thể thay đổi bởi kế toán.
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

### 4.4 Tiền đi đường (Road Allowance)

* Là khoản chi phí hoàn trả cho lái xe (chi phí đường bộ), **không tính là thu nhập của lái xe**.
* **Tiền chuẩn:** Bảng tra cố định theo Tuyến đường × Loại rơ-mooc (~38 tuyến × 2 loại).
* Điều chỉnh do kế toán/quản lý nhập thủ công từng chuyến: Giảm vé QL5, Tăng vé theo lệnh, Số trạm.
* **Công thức:** `Tiền thực tế = Tiền chuẩn - Giảm vé QL5 + Tăng vé theo lệnh - (Số trạm × 55.000)`.
* Chuyến về có hàng: + 300.000 VNĐ (khoản này cộng vào tiền đi đường độc lập với định mức nhiên liệu, áp dụng cho cả tuyến đèo đốc).

### 4.5 Lương tài xế

* **Lương sản lượng (Trip Income):** Trường nhập riêng cho mỗi chuyến, do kế toán nhập. Là khoản thu nhập bổ sung cho lái xe ngoài lương cơ bản.
* **Lương cơ bản:** Cố định hàng tháng.
* **Phạt kỷ luật (Penalty):** Trừ vào lương tài xế (không phải chi phí công ty).

### 4.6 Tổng chi phí (Total Cost)

* **Công thức (theo chuyến):** `Tổng chi phí = Chi phí dầu (lít × đơn giá) + Tiền đi đường + Lương sản lượng`.
* Phạt kỷ luật **không** tính vào tổng chi phí — đây là khoản trừ lương tài xế, không phải chi phí công ty.
* **Hai tầng:** thẻ **từng chuyến** giữ nguyên công thức trên (`computeTripTotals` không đổi). Ở **báo cáo lãi lỗ theo tháng**, Tổng chi phí bao gồm **TẤT CẢ chi phí** = Σ chi phí các chuyến + Σ chi phí vận hành/bảo dưỡng theo xe (sửa chữa, phụ tùng, vật tư, bảo hiểm, đăng kiểm, phí đường bộ — xem §4.14). Chi phí bảo dưỡng là theo xe/tháng, không tính vào từng chuyến.

### 4.7 Lợi nhuận

* **Lợi nhuận gộp (Gross Profit):** = Tổng Doanh thu các chuyến − **Tổng chi phí xe**, tính theo từng **xe đầu kéo**, theo tháng. **Tổng chi phí xe** = Σ chi phí các chuyến của xe + Σ chi phí bảo dưỡng gắn chính xe đầu kéo đó **hoặc rơ-mooc ghép cặp với xe đó** trong tháng (sửa chữa đầu kéo/rơ-mooc, bảo hiểm/đăng kiểm/phí đường bộ của cả cặp). Mỗi đầu kéo và rơ-mooc **ghép thành cặp cố định** — chi phí rơ-mooc tính chung vào chi phí của đầu kéo ghép cặp.
* **Lợi nhuận ròng (Net Profit):** = Tổng LN gộp tất cả xe − Phí quản lý − **Chi phí không gắn xe (chi phí chung)** + Thu nhập khác.
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

### 4.11 Kỷ luật (Penalty)

* Kế toán ghi nhận thủ công các vi phạm.
* Hệ thống cung cấp **danh mục lý do vi phạm** có sẵn (VD: "Thiếu hóa đơn dầu - 100.000đ", "Vi phạm an toàn giao thông - 500.000đ").
* Kế toán có thể nhập lý do mới; hệ thống kiểm tra trùng lặp khi nhập.
* Phạt kỷ luật là khoản **thu nhập khác** của công ty, đồng thời là khoản trừ lương tài xế.

### 4.12 Ảnh xác nhận chuyến (Cargo Photo Evidence)

* **Tất cả loại hàng hóa** đều yêu cầu upload ảnh khi hoàn thành chuyến. Kế toán thực hiện upload. *(Pete xác nhận: "tất cả đều yêu cầu chụp ảnh")*
* Trường `requires_photos` trên bảng **Loại hàng hóa** vẫn giữ để cấu hình mức độ bắt buộc theo từng loại hàng trong tương lai.
* **Chuyến chè (Special Cargo: Tea):** Đặc biệt yêu cầu ảnh Container **và** Seal (niêm phong). Không điều chỉnh thêm tiền đi đường.

### 4.13 Đội xe & Nhân sự

* 1 xe có thể có nhiều lái xe được phân công.
* Rơ-mooc (trailer) có thể thay đổi theo chuyến — cùng 1 xe có thể kéo rơ-mooc 20ft chuyến này, 40ft chuyến sau.
* **Đa container:** 1 chuyến xe có thể chở nhiều container (VD: 2 container 20ft). *(Pete xác nhận: "có thể 1 chuyến chạy 2 cont 20'")*

### 4.14 Chi phí vận hành, Nhà cung cấp & Công nợ phải trả

* **Phạm vi:** ghi nhận chi phí vận hành ngoài chuyến đi — sửa chữa, phụ tùng, vật tư, bảo hiểm, đăng kiểm, phí đường bộ — gắn với Nhà cung cấp và (tùy chọn) một xe.
* **Nhà cung cấp (NCC):** danh mục mọi bên nhận tiền (gara, trạm lốp, cửa hàng phụ tùng, công ty bảo hiểm, trung tâm đăng kiểm, đơn vị thu phí đường bộ). **Bắt buộc** trên mọi phiếu chi phí. Không có trường "phân loại" (phân loại nằm ở hạng mục từng phiếu).
* **Hạng mục chi phí:** danh mục **cấu hình được** (người dùng tự thêm). Mỗi hạng mục là **một lần** hoặc **định kỳ** (`is_renewable`); hạng mục định kỳ có `reminder_lead_days` (mặc định 30 ngày).
* **Phiếu chi phí:** một phiếu = một hạng mục + một số tiền. Gắn NCC (bắt buộc) + một xe đầu kéo **hoặc** rơ-mooc (tùy chọn, có thể để trống → chi phí chung). Khi gắn rơ-mooc, hệ thống tự tra cặp đầu kéo để quy về **lãi gộp của đầu kéo ghép cặp**. Đính được ảnh hóa đơn. Hóa đơn nhiều khoản → nhập nhiều phiếu.
* **Trạng thái thanh toán:**
    * **Trả ngay (PAID):** chỉ ghi cho P&L, không phát sinh công nợ (hệ thống không có tài khoản tiền mặt).
    * **Ghi nợ (UNPAID):** tạo bản ghi Sổ cái `entity_type='VENDOR'` (credit = số tiền) → phát sinh **công nợ phải trả**.
* **Hạng mục định kỳ:** phiếu ghi `valid_from`/`valid_to`. Dashboard **nhắc gia hạn** khi `hôm nay >= valid_to − reminder_lead_days` hoặc đã quá hạn (dùng `valid_to` mới nhất theo từng xe × hạng mục). Gia hạn = tạo phiếu mới hạn xa hơn. **Không phân bổ** — ghi toàn bộ vào tháng thanh toán.
* **Công nợ phải trả (Accounts Payable):** mirror công nợ phải thu trên `entity_type='VENDOR'`. Quy ước dấu giống lái xe: `balance = balance trước + Credit − Debit`. **Tuổi nợ ngược chiều phải thu:** chi phí là Credit (tính tuổi), thanh toán là Debit (áp FIFO).
* **Thanh toán NCC:** kế toán nhập tổng tiền trả cho một NCC → `VENDOR_PAYMENT` (debit) giảm số dư. **Khớp FIFO theo tổng số dư, không khớp từng phiếu.**
* **Sửa/Xóa phiếu đã ghi nợ:** dùng bút toán **ADJUSTMENT** bù trừ (Sổ cái append-only); dòng phiếu soft-delete.
* **Bảng `expenses`** là bảng vận hành mới (không phải bảng cấu hình), kèm bảng `expense_photos` cho ảnh hóa đơn.

---

## 5. DANH SÁCH USER STORIES (THEO MODULE)

### MODULE 1: NHẬN ĐƠN HÀNG & PHÂN XE (ORDER & DISPATCH)
1. **[Quản lý]** Tôi muốn tạo chuyến đi mới với: khách hàng, tuyến đường, loại container/rơ-mooc, xe đầu kéo, lái xe, ngày xuất phát → trạng thái "Mới tạo".
2. **[Quản lý]** Tôi muốn chuyển trạng thái chuyến đi (Mới tạo → Đang chạy → Hoàn thành → Đã chốt).
4. **[Lái xe]** Tôi muốn xem lịch trình chuyến đi của mình trên điện thoại (chỉ xem).
5. **[Lái xe]** Tôi muốn xem số dầu được cấp cho chuyến đi trên điện thoại (chỉ xem).

### MODULE 2: GHI NHẬN CHUYẾN ĐI & CHI PHÍ
1. **[Kế toán]** Tôi muốn nhập số liệu thực tế cho chuyến đi: km, số lít dầu, loại tải (hàng/vỏ), điều chỉnh vé đường, số trạm, lương sản lượng, doanh thu.
2. **[Kế toán]** Tôi muốn hệ thống tự động tính: chi phí nhiên liệu (lít × đơn giá), tiền đi đường, tổng chi phí, lợi nhuận gộp.
3. **[Kế toán]** Tôi muốn upload ảnh container/seal đối với chuyến chở chè khi đóng chuyến.
4. **[Kế toán]** Tôi muốn thêm ghi chú/diễn giải cho chuyến đi.

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

### MODULE 9: CHI PHÍ VẬN HÀNH & CÔNG NỢ PHẢI TRẢ
1. **[Kế toán]** Tôi muốn nhập phiếu chi phí (sửa chữa, phụ tùng, vật tư, bảo hiểm, đăng kiểm, phí đường bộ), gắn Nhà cung cấp và (tùy chọn) một xe, đính ảnh hóa đơn.
2. **[Kế toán]** Tôi muốn chọn trạng thái Trả ngay hoặc Ghi nợ; phiếu Ghi nợ tự phát sinh công nợ phải trả cho NCC.
3. **[Kế toán/Quản lý]** Tôi muốn xem danh sách công nợ phải trả theo NCC kèm tuổi nợ (0–30/31–60/61–90/90+) và xuất sao kê NCC.
4. **[Kế toán]** Tôi muốn ghi nhận thanh toán cho NCC (giảm tổng số dư, FIFO).
5. **[Quản lý]** Tôi muốn lợi nhuận gộp theo xe đã trừ chi phí bảo dưỡng của xe đó, và lợi nhuận ròng đã trừ chi phí rơ-mooc/chung.
6. **[Quản lý/Kế toán]** Tôi muốn Dashboard nhắc khi bảo hiểm/đăng kiểm/phí đường bộ của xe sắp tới hạn hoặc đã quá hạn.

---

## 6. BẢNG CẤU HÌNH HỆ THỐNG (CONFIGURATION TABLES)

| # | Bảng | Mô tả | Dữ liệu mẫu |
| :--- | :--- | :--- | :--- |
| 1 | **Khách hàng** | Tên, liên hệ, thông tin công nợ | 44+ khách hàng |
| 2 | **Tuyến đường** | Tên tuyến, khoảng cách, định mức đèo đốc (nếu có) | 38+ tuyến |
| 3 | **Bảng giá** | Giá cố định theo Khách hàng × Tuyến đường | ~44×38 = 1.672 dòng |
| 4 | **Xe đầu kéo** | Biển số, trạng thái | 4 xe |
| 5 | **Rơ-mooc** | Biển số, loại (20ft/40ft), trạng thái | Theo thực tế |
| 6 | **Lái xe** | Tên, xe được phân công, liên hệ, lương cơ bản | Nhiều lái xe/xe |
| 7 | **Loại hàng hóa** | Tên loại, có yêu cầu upload ảnh không | VD: Chè (yêu cầu ảnh) |
| 8 | **Tiền đi đường chuẩn** | Tiền chuẩn theo Tuyến đường × Loại rơ-mooc | ~38×2 = 76 dòng |
| 9 | **Định mức nhiên liệu** | Định mức hàng/vỏ (cấu hình được), bổ sung/chuyến, đèo đốc theo tuyến | Cấu hình + theo tuyến |
| 10 | **Đơn giá nhiên liệu** | Đơn giá 1 lít dầu (hiện tại 18.730 VNĐ) | 1 giá, có thể cập nhật |
| 11 | **Cổ đông & Tỷ lệ vốn** | Tên, tỷ lệ %, ngày hiệu lực | Ông Thương 29.55%, Ông Phụng 70.45% |
| 12 | **Danh mục kỷ luật** | Lý do vi phạm + số tiền phạt mặc định | VD: "Thiếu hóa đơn dầu - 100.000đ" |
| 13 | **Sổ cái (Ledger)** | Ghi nhận tập trung toàn bộ giao dịch (Công nợ KH, Lương/Phạt, Thanh toán, Công nợ NCC) | Các cột: ID, date, txn_type, credit, debit, balance |
| 14 | **Nhà cung cấp** | Tên, người liên hệ, SĐT, mã số thuế, ghi chú, trạng thái | Gara, trạm lốp, phụ tùng, bảo hiểm, đăng kiểm... |
| 15 | **Hạng mục chi phí** | Tên, một lần/định kỳ (is_renewable), số ngày nhắc trước (mặc định 30) | Sửa chữa, Phụ tùng, Vật tư, Bảo hiểm, Đăng kiểm, Phí đường bộ |

---

## 7. CÁC TRƯỜNG DỮ LIỆU CHUYẾN ĐI (TRIP DATA FIELDS)

### Pha 1 — Quản lý tạo chuyến (trạng thái: Mới tạo)

| Trường | Loại | Bắt buộc | Ghi chú |
| :--- | :--- | :--- | :--- |
| Khách hàng | Select | Có | Từ danh mục |
| Tuyến đường | Select | Có | Từ danh mục |
| Rơ-mooc | Select | Có | Chọn rơ-mooc cụ thể từ danh mục (loại 20ft/40ft tự suy ra) |
| Xe đầu kéo | Select | Có | Từ danh mục |
| Lái xe | Select | Có | Theo xe được phân công |
| Loại hàng hóa | Select | Có | Từ danh mục (VD: Chè, Container rỗng, Hàng tổng hợp...) |
| Ngày xuất phát | Date | Có | |

### Pha 2 — Kế toán nhập số liệu thực tế (trạng thái: Hoàn thành)

| Trường | Loại | Bắt buộc | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Các chặng (Trip Legs)** | Dynamic rows | Có | Kế toán nhập từng chặng: điểm đi, điểm đến, số km, loại tải (hàng/vỏ). Hệ thống tự tính L dầu mỗi chặng theo định mức. |
| Chế độ nhập nhiên liệu | Select (AUTO / KHOÁN) | Có | AUTO: tổng L dầu từ các chặng. KHOÁN: nhập tổng L dầu bằng tay (ghi đè). |
| Dầu bổ sung | Number | Không | L dầu thêm do xe hỏng, đi sửa... (cộng thêm vào cả 2 chế độ) |
| Lý do bổ sung | Text | Không | Bắt buộc nếu có dầu bổ sung |
| Giảm vé QL5 | Number | Không | Mặc định 0 |
| Tăng vé theo lệnh | Number | Không | Mặc định 0 |
| Số trạm | Number | Không | Mặc định 0, nhân với 55.000 |
| Chuyến về có hàng | Checkbox | Không | Nếu tích → + 300.000 VNĐ tiền đi đường |
| Lương sản lượng | Number | Có | Thu nhập lái xe cho chuyến này |
| Doanh thu | Number | Có | Tự động tra từ bảng giá khi tạo chuyến (Customer × Route). Kế toán có thể ghi đè; hệ thống ghi nhận giá gốc, giá ghi đè, người thay đổi và thời điểm. |
| Ghi chú/diễn giải | Text | Không | |
| Ảnh xác nhận hàng hóa | Upload | Có (tất cả) | Bắt buộc cho tất cả loại hàng khi hoàn thành chuyến. Chuyến chè bắt buộc có ảnh Container **và** Seal. |

### Tự động tính toán (read-only)

| Trường | Công thức |
| :--- | :--- |
| Tổng L dầu | AUTO: tổng L từ các chặng + bổ sung. KHOÁN: L nhập tay + bổ sung. |
| Chi phí dầu | Tổng L dầu × Đơn giá cấu hình |
| Tiền đi đường thực tế | Tiền chuẩn - Giảm vé + Tăng vé - (Số trạm × 55.000) [+ 300.000 nếu về có hàng] |
| Tổng chi phí | Chi phí dầu + Tiền đi đường + Lương sản lượng |
| Lợi nhuận gộp | Doanh thu - Tổng chi phí |
