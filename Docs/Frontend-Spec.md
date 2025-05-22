# Đặc tả Giao diện Người dùng - Hệ thống Quản lý Vận tải NePO

## Thanh tiêu đề
Vị trí: Hiển thị cố định phía trên cùng mọi trang

Thành phần bên trái:
- Logo công ty NePO (có thể nhấn để về trang chủ)
- Tên ứng dụng "NePO Transport"

Thành phần bên phải:
- Tên người dùng (hiển thị đầy đủ họ tên)
- Menu thả xuống khi nhấn vào tên người dùng:
    - Thiết lập email
    - Đổi mật khẩu
    - Đăng xuất

## Trang đăng nhập
Hiển thị khi: Người dùng chưa xác thực

Bố cục: Form đăng nhập căn giữa màn hình

Các trường nhập liệu:
- Tên đăng nhập
- Mật khẩu

Các nút chức năng:
- Nút "Đăng nhập" (chỉ kích hoạt khi đã nhập đủ thông tin)
- Liên kết "Quên mật khẩu?"

Khôi phục mật khẩu:
- Gửi link đặt lại mật khẩu qua email (nếu có)

## Trang quản lý

### Tổng quan
Sidebar trái:
- Báo cáo tài chính (mặc định)
- Lịch vận chuyển
- Nhân viên
- Khách hàng
- Đối tác
- Phương tiện
- Loại container
- Chi phí

### Báo cáo tài chính
Trang báo cáo gồm bốn tab chính, mỗi tab đảm nhiệm một loại báo cáo riêng:

1. Tab Lợi nhuận & Doanh thu
- Hiển thị doanh thu và lợi nhuận theo từng biển số xe, phân bổ theo tháng.
- Biểu đồ cột ngang giúp so sánh nhanh giữa các xe và các tháng.

2. Tab Chi tiết chi phí
- Phân tích chi phí theo hạng mục, theo biển số và theo tháng.
- Trên desktop: dữ liệu trình bày dưới dạng bảng.
- Trên mobile: mỗi biển số xe được thể hiện qua một card, trong đó chi phí hiển thị dưới dạng biểu đồ cột ngang.

3. Tab Theo dõi Doanh thu/Chi phí theo phương tiện
- Thanh điều khiển cho phép chọn biển số xe và tháng báo cáo.
- Phần tổng quan: tổng chi phí, tổng cước vận chuyển và tổng lợi nhuận của lựa chọn hiện tại.
- Bảng chi tiết gồm các cột:
  * Ngày tháng
  * Diễn giải
  * Số container
  * Tuyến đường vận chuyển
  * Dầu (lít)
  * Dầu (đồng)
  * Đi đường
  * Tổng chi phí
  * Cước vận chuyển
  * Lợi nhuận
- Dưới bảng là danh sách chi phí khác trong tháng (ví dụ: phí gửi xe, tiền Epass, lương lái xe…).
- Nút “Xuất Excel” cố định ở góc dưới bên phải màn hình.

4. Tab Báo cáo Công nợ
- Thanh điều khiển để chọn tháng theo dõi.
- Bảng công nợ với các cột:
  * Tên đơn vị
  * Phải thu
  * Phải trả
  * Ghi chú
- Nút “Xuất Excel” cố định ở góc dưới bên phải màn hình.

### Tạo kế hoạch vận chuyển

Quy tắc chung:
- Trường ký tự: Mặc định "-" nếu để trống
- Trường số: Mặc định 0 nếu để trống
- Có thể chỉnh sửa sau khi tạo

Lịch vận chuyển:
Nút chức năng:
  - Nút "+" nổi góc dưới bên phải màn hình
  - Nhấn để mở form tạo kế hoạch vận chuyển mới
Form để tạo kế hoạch vận chuyển mới bao gồm
  - Ngày vận chuyển (định dạng dd/mm/yyyy, có lịch chọn)
  - Diễn giải (mục đích vận chuyển)
  - Khách hàng (chọn từ danh sách có sẵn). (có thể thêm mới bằng nút "+")
  - Số lượng container (số nguyên dương)
  - Loại container (dropdown chọn: 20’DC, 40’DC, 40’HC, 40’RF, 40’OT và 45’HC). (có thể thêm mới bằng nút "+")
  - Tuyến đường bao gồm điểm đi và điểm đến (có thể thêm mới bằng nút "+")
  - Cước vận chuyển và chọn biển số xe (có thể thêm mới bằng nút "+")
  - Cước thuê vận chuyển và chọn đối tác (có thể thêm mới bằng nút "+")
  - Thông tin container:
      * Số container (ví dụ: CSNU6879155)
      * Số seal (ví dụ: YMAT308024)
  - Ngày hạ hàng (Định dạng: dd/mm/yyyy ví dụ: 21/2/2025)
- Nội dung chính của trang này là hiển thị tất cả các kế hoạch vận chuyển.

### Tạo nhân viên

Nút chức năng
- Nút "+" nổi góc dưới bên phải màn hình
- Nhấn để mở form tạo nhân viên mới

Form để tạo nhân viên mới bao gồm
- Tên nhân viên
- Tên đăng nhập
- Mật khẩu
- Email
- Chức vụ (Quản lý, Kế toán, Giao nhận hoặc Lái xe)

Nội dung chính của trang này là hiển thị danh sách nhân viên

### Tạo khách hàng

Nút chức năng:
  - Nút "+" nổi góc dưới bên phải màn hình
  - Nhấn để mở form tạo khách hàng mới

Form để tạo khách hàng mới bao gồm
  - Tên khách hàng
  - Địa chỉ
  - Số điện thoại

Nội dung chính của trang này là hiển thị danh sách khách hàng

### Tạo đối tác

Nút chức năng:
  - Nút "+" nổi góc dưới bên phải màn hình
  - Nhấn để mở form tạo đối tác mới
Form để tạo đối tác mới bao gồm
  - Tên đối tác
  - Địa chỉ
  - Số điện thoại
- Nội dung chính của trang này là hiển thị danh sách đối tác

### Phương tiện

Nút chức năng:
  - Nút "+" nổi góc dưới bên phải màn hình
  - Nhấn để mở form tạo biển số xe mới
Form để tạo biển số xe mới bao gồm
  - Biển số xe
Nội dung chính của trang này là hiển thị danh sách biển số xe

### Loại container

Nút chức năng:
  - Nút "+" nổi góc dưới bên phải màn hình
  - Nhấn để mở form tạo loại container mới

Form để tạo loại container mới bao gồm
  - Loại container

Nội dung chính của trang này là hiển thị danh sách loại container

### Biển số xe

Nút chức năng:
  - Nút "+" nổi góc dưới bên phải màn hình
  - Nhấn để mở form tạo biển số xe mới

Form để tạo biển số xe mới bao gồm
  - Biển số xe

Nội dung chính của trang này là hiển thị danh sách biển số xe

### Loại container

Nút chức năng:
  - Nút "+" nổi góc dưới bên phải màn hình
  - Nhấn để mở form tạo loại container mới

Form để tạo loại container mới bao gồm
  - Loại container

Nội dung chính của trang này là hiển thị danh sách loại container

### Chi phí

Hiển thị bảng định mức đi đường theo số km. Quản lý có thể thêm, sửa, xóa các định mức đi đường. Bảng định mức này sẽ được dùng để tính chi phí đi đường trong các kế hoạch vận chuyển dựa vào số km mà kế toán nhập.

## Trang kế toán

### Tổng quan
- Sidebar trái:
  - Lịch vận chuyển
  - Chi phí
  - Công nợ

### Lịch vận chuyển

Cấu trúc bảng dữ liệu gồm các cột:
- Ngày tháng
- Biển số xe
- Đối tác (nếu không có, hiển thị “–”)
- Diễn giải
- Tuyến đường vận chuyển (tạo bởi điểm đi và các điểm đến)
- Trạng thái
- Số km chuyển hàng
- Số km chuyển vỏ rỗng
- Chi phí dầu (lít)
- Đơn giá dầu
- Chi phí dầu (Đồng)
- Định mức đi đường
- Chi phí khác

Định nghĩa trạng thái
- Nháp: trạng thái mặc định nếu kế toán tạo
- Lên lịch: trạng thái mặc định nếu quản lý tạo
- Đang chạy:
- Hoàn thành: đã nhập ngày hạ hàng

Cơ chế tính toán tự động
- Chi phí dầu (Đồng) = Chi phí dầu (lít) × Đơn giá dầu
- Định mức đi đường: tự động điền dựa trên bảng định mức

Tương tác của kế toán
- Nhấp vào từng ô để chỉnh sửa dữ liệu
- Chọn ô “Chi phí khác” sẽ mở modal form, hiển thị chi tiết các khoản như: tiền vé cầu đường, phí nâng hạ container
- Trong modal form có: nút (+) để thêm khoản chi phí mới, nút (×) để xóa khoản không cần thiết, nút Lưu (biểu tượng save) để xác nhận thay đổi
- Có nút thêm ở trên bảng dữ liệu để kế toán thêm kế hoạch vận chuyển mới

### Chi phí

Trang này hiển thị tổng chi phí theo từng mục, theo từng xe, theo từng tháng. Những chi phí điền ở kế hoạch vận chuyển sẽ được cộng tổng theo nhóm (ví dụ chi phí dầu, chi phí đi đường). Kế toán cũng có thể thêm chi phí khác mà không nằm ở trong kế hoạch vận chuyển (ví dụ lương lái xe, chi phí sửa chữa / bảo dưỡng xe)

Đầu trang là thanh điều khiển mà người dùng có thể chọn biển số xe, tháng báo cáo. Dưới thanh điều khiển là barchart nằm ngang với mỗi dòng là một chi phí. Trên barchart sẽ hiện tổng chi phí.

Danh sách những chi phí có thể thêm
- Phí gửi xe
- Chi phí sửa chữa / bảo dưỡng xe
- Lương lái xe
- Tiền bảo hiểm TNDS
- Tiền bảo hiểm vật chất
- Phí đường bộ
- Thay thế lốp xe (ngày thay, nhãn hiệu, số series lốp, cỡ lốp, số lượng, đơn giá, thành tiền, nhà cung cấp). Khi tra cứu lốp xe theo biển số xe thì có thể biết được lốp đã thay ngày nào và tuổi thọ tính tới thời điểm tra cứu là bao nhiêu ngày?

### Công nợ


