Task 1
Khi quản lý đăng nhập vào hệ thống (in production) hoặc khi user chọn role quản lý ở TrangChu.jsx (in development) thì sidebar trái sẽ bao gồm các mục sau
- Báo cáo tài chính (hiển thị mặc định)
- Lịch vận chuyển
- Nhân viên
- Khách hàng
- Đối tác
- Phương tiện

Task 2
Khi quản lý chọn mục phương tiện ở sidebar, thì trang web sẽ hiển thị những sections sau
- Xe vận chuyển
- Loại container
- Định mức dầu
- Bảo dưỡng

Đối với xe vận chuyển
- Hiện bảng danh sách xe vận chuyển. Bảng bao gồm các cột:
  * Biển số xe
  * Loại xe
  * Trọng tải
  * Số lượng container
  * Ghi chú
- Với mỗi dòng bấm vào dòng để sửa, bấm vào icon thùng rác cuối dòng để xóa
- Có button "Thêm" để thêm xe vận chuyển

Đối với loại container
- Hiện bảng danh sách loại container.
- Với mỗi dòng bấm vào dòng để sửa, bấm vào icon thùng rác cuối dòng để xóa
- Dưới dòng cuối cùng có lựa chọn để thêm

Đối với định mức dầu
- Hiện bảng định mức dầu cho từng biển số xe. Mỗi biển số xe có một bảng.
- Bảng gồm các cột:
  * Từ (km)
  * Đến (km)
  * Định mức (l/km)
- Với mỗi dòng bấm vào dòng để sửa, bấm vào icon thùng rác cuối dòng để xóa
- Dưới dòng cuối cùng có lựa chọn để thêm

Đối với bảo dưỡng
- Hiện tại thì chỉ quản lý bảng thay lốp xe.
- Bảng gồm các cột:
  * Biển số xe
  * Ngày thay lốp
  * Thời hạn bảo hành
  * Số lượng
  * Đơn giá
  * Tổng tiền
  * Ghi chú
- Có thể lọc theo biển số xe

Task 3
- Lấy dữ liệu từ mockData service nếu cần.

Task 4
- Rà soát lại codebase và xóa đi những pages hiện không dùng
