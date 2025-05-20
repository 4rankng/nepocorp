# Hướng Dẫn Thiết Lập Website Demo Hệ Thống Quản Lý Đội Xe Nepocorp

## 1. Mục Tiêu
Xây dựng website demo (frontend-only) cho Hệ thống Quản lý Đội xe Nepocorp dựa trên tài liệu PRD “nepocorp_v2.pdf”. Website chỉ trình diễn giao diện và luồng nghiệp vụ, sử dụng dữ liệu mock (JSON tĩnh), không tích hợp backend thực tế.

## 2. Công Nghệ & Kiến Trúc
- **Framework:** React (sử dụng hooks, functional components)
- **Styling:** TailwindCSS
- **Routing:** React Router DOM
- **Quản lý trạng thái:** Context API hoặc Zustand (tùy độ phức tạp)

### Cấu trúc thư mục đề xuất:
```
src/
  ├─ components/     # Component tái sử dụng
  ├─ pages/          # Các màn hình chính
  ├─ routes/         # Định nghĩa router
  ├─ contexts/       # Context hoặc stores
  ├─ data/           # Mock data dạng JSON
  └─ utils/          # Hàm tiện ích chung
```

## 3. Phân Chia Module Theo Vai Trò & Chức Năng
### 3.1. Dashboard Chung
- Cho phép chọn vai trò (Quản lý, Kế toán, Giao nhận, Lái xe)
- Menu bên trái điều hướng tới trang phù hợp với từng vai trò

### 3.2. Bộ Phận Quản Lý
- **Trang Lập Kế Hoạch Vận Chuyển:**
  - Form gồm các trường:
    - Ngày vận chuyển (Date picker)
    - Diễn giải (Text)
    - Khách hàng (Select)
    - Số lượng (Number)
    - Loại container (Select: 20ft, 40ft)
    - Điểm đi, điểm đến (Text hoặc select địa danh)
    - Cước bán khách, cước thuê đối tác (Number)
    - Số cont, số seal (Text)
    - Ngày hạ hàng (Date picker)
  - **Validation:** Bắt buộc nhập, hiển thị lỗi nếu trống/sai định dạng
  - **Sau submit:** Hiển thị banner “Tạo kế hoạch thành công”
- **Trang Báo Cáo Tài Chính:**
  - Bảng dữ liệu mock:
    - Lợi nhuận theo xe, theo tháng
    - Chi tiết chi phí (nhiên liệu, bảo trì, lương...)
    - Công nợ phải thu/phải trả (lọc theo thời gian, khách hàng)
  - Cho phép export CSV/Excel (giả lập)

### 3.3. Bộ Phận Kế Toán
- **Trang Xem Lịch Trình Vận Chuyển:**
  - Bảng: ID chuyến, ngày, khách hàng, trạng thái (Lên lịch/Đang chạy/Hoàn thành)
  - Cho phép đổi trạng thái (button)
- **Form Nhập Chi Phí Theo Chuyến:**
  - Cho mỗi chuyến:
    - Số km hàng, số km chạy rỗng
    - Số lít dầu & tổng chi phí dầu
    - Chi phí đường, phí cầu đường, nâng hạ, chi hộ
    - Không cho edit khi chuyến đã “Hoàn thành”
- **Form Nhập Chi Phí Phát Sinh Theo Xe (hàng tháng):**
  - Phí gửi xe, Epass, bảo hiểm, sửa chữa, lương lái xe, khác (text + số tiền)
- **Trang Công Nợ Phải Thu/Phải Trả:**
  - Bảng tổng hợp theo khách hàng/đối tác, khoảng thời gian
  - Cột: Tên đơn vị, Phải thu, Phải trả, Ghi chú

### 3.4. Bộ Phận Giao Nhận
- **Trang Lịch Vận Chuyển Theo Ngày:**
  - Hiển thị dạng calendar hoặc bảng theo ngày
- **Form Nhập Dữ Liệu Khi Nhận Hàng:**
  - Số cont, số seal theo kế hoạch
- **Form Yêu Cầu Tạm Ứng & Hoàn Ứng:**
  - Các loại chi phí: nâng hạ, khai báo, kiểm hóa, cơ sở hạ tầng, chi hộ
  - Cho phép upload chứng từ (giả lập)

### 3.5. Bộ Phận Lái Xe
- **Trang Thông Tin Chuyến Đi:**
  - Danh sách chuyến đã giao: ngày, cước đường, số lít dầu
- **Trang Thu Nhập Hàng Tháng:**
  - Số ngày công, tổng lương
  - Biểu đồ hoặc bảng đơn giản

## 4. Yêu Cầu Chất Lượng
- **UI/UX:** Giao diện gọn gàng, responsive, menu trái cố định
- **Code:** Cấu trúc rõ ràng, component hóa, đặt tên nhất quán
- **Testing:** Kiểm thử cơ bản (không lỗi console, form validation hoạt động)
- **Document:** Mỗi component có header comment giải thích props và chức năng

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
- Mỗi trang hoạt động đúng với mock data, validation form chính xác
- Không có lỗi JS console, component hiển thị đúng theo thiết kế
- Cấu trúc code dễ bảo trì, có tài liệu chú thích cơ bản
