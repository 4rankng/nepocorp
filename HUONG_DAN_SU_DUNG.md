# HƯỚNG DẪN SỬ DỤNG CÁC TÍNH NĂNG MỚI (CẤP DẦU & CHẤM CÔNG - TÍNH LƯƠNG TÀI XẾ)

Tài liệu này hướng dẫn chi tiết cách thao tác trên giao diện Website dành cho Kế toán, Người quản lý và Lái xe đối với hai tính năng vừa phát triển:
1. **Cấp dầu & Quản lý Công nợ Nhà cung cấp**
2. **Chấm công & Quản lý Lương tài xế**

---

# PHẦN 1: CẤP DẦU & QUẢN LÝ CÔNG NỢ NHÀ CUNG CẤP

Nhằm quản lý khép kín hoạt động cấp nhiên liệu và công nợ mua nợ xăng dầu từ các đơn vị liên kết (Petrolimex, PV Oil...):

## 1. Dành cho Kế toán & Quản lý

### Bước 1: Chỉ định Nhà cung cấp dầu khi nhập chuyến
1. Đăng nhập vào Website, chọn **Lệnh vận chuyển** hoặc **Sổ chuyến đi** > chọn **Tạo lệnh vận chuyển** (hoặc nhấp **Sửa** trên một chuyến có sẵn).
2. Tại màn hình nhập liệu, cuộn xuống phần **3. Nhiên liệu, vé đường & doanh thu**.
3. Thiết lập thông số dầu (Chế độ tự động/khoán, số lít dầu bổ sung, đơn giá thực tế tại cây xăng nếu có).
4. Tại ô chọn **Nhà cung cấp nhiên liệu**, nhấp chọn đơn vị cung cấp dầu tương ứng từ danh sách.
5. Nhấp **Lưu** để hoàn tất.

> [!NOTE]
> Việc chọn nhà cung cấp chỉ được thực hiện khi chuyến đi chưa bị khóa (ở trạng thái **Mới tạo**, **Đang chạy** hoặc **Hoàn thành**).

### Bước 2: Xuất phiếu cấp dầu để đối soát với nhà cung cấp
1. Vào màn hình **Lệnh vận chuyển** hoặc **Sổ chuyến đi**.
2. Sử dụng bộ lọc thời gian và tìm kiếm để lọc ra danh sách chuyến đi của một biển số xe hoặc một khoảng thời gian nhất định.
3. Nhấp vào nút **Xuất CSV** ở góc trên bên phải bảng dữ liệu.
4. File tải xuống sẽ bao gồm các cột đối soát:
   - **Nhà CC Dầu:** Tên nhà cung cấp nhiên liệu được chỉ định đổ dầu.
   - **Giá trị dầu:** Số tiền tương ứng phát sinh (Số lít dầu × Đơn giá).
5. Bạn có thể dùng tính năng lọc (Filter) của Excel để lọc theo từng Nhà cung cấp dầu, nhóm theo cột **Xe** (biển số xe) và gửi trực tiếp sang nhà cung cấp để đối chiếu hóa đơn xăng dầu thực tế.

### Bước 3: Kiểm soát công nợ phải trả Nhà cung cấp nhiên liệu
1. Khi bạn thực hiện **Chốt khóa** chuyến đi từ màn hình chi tiết chuyến đi, hệ thống sẽ tự động hạch toán một bút toán **Có** với giá trị bằng tổng tiền dầu của chuyến đi vào sổ cái của nhà cung cấp xăng dầu được chọn (Mã loại giao dịch: **Chi phí nhiên liệu**).
2. Để xem chi tiết công nợ, truy cập menu **Công nợ phải trả**.
3. Nhấp chọn tên Nhà cung cấp xăng dầu để xem chi tiết lịch sử giao dịch. Các giao dịch dầu tự động từ chuyến đi sẽ được hiển thị bằng nhãn loại giao dịch **"Chi phí nhiên liệu"** màu cam rõ ràng.
4. Nếu chuyến đi được **Mở khóa**, hệ thống sẽ tự động tạo bút toán **Nợ** đối ứng loại **Hoàn tác** để giảm trừ công nợ ngay lập tức.

---

## 2. Dành cho Lái xe (Xem trên điện thoại)
1. Đăng nhập vào hệ thống bằng tài khoản lái xe trên điện thoại.
2. Chọn menu **Lệnh của tôi**.
3. Nhấp vào chuyến đi được giao trong danh sách để xem chi tiết.
4. Ở phần **Số dầu được cấp**, lái xe sẽ thấy số lít dầu chính xác và **Nhà cung cấp** xăng dầu được chỉ định để biết cây xăng cần đổ.

---
---

# PHẦN 2: CHẤM CÔNG & QUẢN LÝ LƯƠNG TÀI XẾ

Tính năng này giúp tự động hóa bảng lương hàng tháng của tài xế dựa trên số ngày đi chuyến, ngày chờ việc và nghỉ phép.

## 1. Dành cho Kế toán & Quản lý

### Bước 1: Xem bảng tổng hợp lương tháng
1. Tại menu bên trái, nhấp chọn **Lương & Chấm công**.
2. Chọn **Tháng** và **Năm** ở thanh bộ lọc phía trên cùng để tải bảng lương của kỳ đó.
3. Hệ thống sẽ hiển thị danh sách tất cả các lái xe kèm theo:
   - **Ngày công chuẩn:** Tự động tính = Số ngày trong tháng - Các ngày Chủ nhật.
   - **Ngày đi chuyến:** Số ngày lái xe thực tế vận hành chuyến đi trên đường (hệ thống tự chấm dựa trên ngày đi-về của chuyến xe).
   - **Ngày chờ việc:** Số ngày lái xe túc trực chờ lệnh điều động.
   - **Ngày nghỉ riêng:** Số ngày nghỉ phép hoặc nghỉ việc riêng không tính công.
   - **Lương thực nhận:** Được hệ thống tính toán tự động dựa trên ngày công thực tế và các khoản phạt/lương chuyến.

### Bước 2: Chấm công thủ công (Chờ việc / Nghỉ phép)
Để chấm công thêm các ngày chờ việc hoặc nghỉ phép cho tài xế:
1. Tại bảng lương tháng, nhấp vào **Tên tài xế** cần chấm công. Giao diện lịch chấm công của tài xế sẽ hiện ra.
2. Các ngày đi chuyến thực tế sẽ được tô màu xanh lá cây và hiển thị mã chuyến đi liên kết (Không thể sửa trực tiếp các ngày đi chuyến này trừ khi hủy/sửa chuyến đi gốc).
3. Để thêm ngày chờ việc hoặc nghỉ phép:
   - Nhấp vào một ô ngày trống trên lịch.
   - Chọn trạng thái ngày công: **Chờ việc** hoặc **Nghỉ riêng**.
   - Nhập ghi chú (ví dụ: *Nghỉ cưới hỏi*, *Chờ sửa xe*).
   - Bấm **Cập nhật**.
4. Hệ thống sẽ ngay lập tức tính toán lại chỉ số **Điều chỉnh** trên bảng lương tài xế theo đúng công thức:
   - *Công thức:* `Khoản điều chỉnh = (Ngày công thực tế - Ngày công chuẩn) * Lương ngày công`.
   - Lương ngày công được tính bằng `(Lương cơ bản + Bảo hiểm xã hội) / Ngày công chuẩn`.

---

## 2. Dành cho Lái xe (Xem Báo cáo lương trên điện thoại)
1. Đăng nhập vào hệ thống bằng tài khoản lái xe trên điện thoại.
2. Chọn mục **Thu nhập** ở thanh menu.
3. Chọn Tháng/Năm cần tra cứu. Lái xe sẽ nhìn thấy chi tiết bảng tính lương của mình bao gồm:
   - **Lương cơ bản & Lương chuyến đi**: Tổng tiền lương chốt từ các chuyến xe đã hoàn thành.
   - **Bảng chấm công**: Số ngày đi chuyến, số ngày chờ việc được duyệt.
   - **Khoản điều chỉnh**: Số tiền cộng thêm do làm thêm ngày công hoặc trừ đi do nghỉ riêng.
   - **Tiền phạt**: Chi tiết các khoản kỷ luật/phạt bị trừ trong tháng.
   - **Lương thực nhận cuối cùng**.
