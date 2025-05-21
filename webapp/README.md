# Nepocorp Demo Web

Website demo frontend-only cho Hệ thống Quản lý Đội xe Nepocorp.

## Khởi động dự án

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy ứng dụng phát triển:
```bash
npm run dev
```

3. Truy cập:
- http://localhost:5173

## Cấu trúc thư mục
- `src/components/`: Các component tái sử dụng
- `src/pages/`: Các màn hình chính theo vai trò
- `src/routes/`: Định nghĩa router
- `src/contexts/`: Context hoặc stores
- `src/data/`: Mock data JSON
- `src/utils/`: Hàm tiện ích

## Công nghệ sử dụng
- React, React Router DOM
- Zustand hoặc Context API
- TailwindCSS
- Vite

## Các vai trò & tính năng chính
- Dashboard chọn vai trò
- Quản lý: Lập kế hoạch, báo cáo tài chính
- Kế toán: Lịch trình, nhập chi phí, công nợ
- Giao nhận: Lịch vận chuyển, nhập nhận hàng, tạm ứng
- Lái xe: Thông tin chuyến, thu nhập

## Mock data
Tất cả dữ liệu sử dụng file JSON tĩnh trong `src/data/`.

## Đóng góp
Vui lòng đọc tài liệu trong `Docs/0001-setup-web.md` để hiểu chi tiết nghiệp vụ và guideline triển khai.
