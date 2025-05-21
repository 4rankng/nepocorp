# Đặc tả Giao diện Người dùng - Hệ thống Quản lý Vận tải NePO

## Thanh tiêu đề
- **Vị trí**: Hiển thị cố định phía trên cùng mọi trang
- **Thành phần bên trái**:
  - Logo công ty NePO (có thể nhấn để về trang chủ)
  - Tên ứng dụng "NePO Transport"
- **Thành phần bên phải**:
  - Tên người dùng (hiển thị đầy đủ họ tên)
  - Menu thả xuống khi nhấn vào tên người dùng:
    - Thiết lập email
    - Đổi mật khẩu
    - Đăng xuất

## Trang đăng nhập
- **Hiển thị khi**: Người dùng chưa xác thực
- **Bố cục**: Form đăng nhập căn giữa màn hình
- **Các trường nhập liệu**:
  - Tên đăng nhập
  - Mật khẩu
- **Các nút chức năng**:
  - Nút "Đăng nhập" (chỉ kích hoạt khi đã nhập đủ thông tin)
  - Liên kết "Quên mật khẩu?"
- **Khôi phục mật khẩu**:
  - Gửi link đặt lại mật khẩu qua email (nếu có)

## Trang quản lý

### Tổng quan
- **Sidebar trái**:
  - Báo cáo tài chính (mặc định)
  - Lịch sử vận chuyển
  - Nhân viên
  - Khách hàng
  - Phương tiện vận chuyển. Mục đích là để quản lý biển số xe, loại container.
  - Đối tác
- **Nút hành động chính**:
  - Nút "+" nổi góc dưới bên phải màn hình
  - Nhấn để mở form tạo kế hoạch vận chuyển mới

### Tạo kế hoạch vận chuyển

**Quy tắc chung**:
- Trường ký tự: Mặc định "-" nếu để trống
- Trường số: Mặc định 0 nếu để trống
- Có thể chỉnh sửa sau khi tạo

**Thông tin vận chuyển**:
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

## Trang kế toán
- **Báo cáo doanh thu**
  - Thống kê theo ngày/tuần/tháng/năm
  - Xuất báo cáo dạng Excel/PDF
  - Phân tích chi phí vận chuyển

## Trang giao nhận
- **Danh sách đơn hàng**
  - Trạng thái đơn hàng
  - Thông tin người gửi/nhận
  - Xác nhận giao nhận
  - Chụp ảnh xác nhận

## Trang lái xe
- **Lịch trình trong ngày**
  - Danh sách các điểm đến
  - Thời gian dự kiến
  - Trạng thái hoàn thành
  - Ghi chú đặc biệt
- **Bản đồ dẫn đường**
  - Tích hợp Google Maps
  - Tối ưu lộ trình
  - Cảnh báo giao thông
