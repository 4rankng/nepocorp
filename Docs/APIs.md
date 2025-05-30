# API Endpoints for Frontend

This document outlines the necessary API endpoints for the frontend application, categorized by feature/resource.

## Authentication

*   **POST** `/api/auth/login` - User login
*   **POST** `/api/auth/logout` - User logout
*   **GET** `/api/auth/me` - Get current user information

## Customers (Khách Hàng)

*   **GET** `/api/khach-hang` - List all customers
*   **POST** `/api/khach-hang` - Create a new customer
*   **GET** `/api/khach-hang/{id}` - Get a specific customer
*   **PUT** `/api/khach-hang/{id}` - Update a specific customer
*   **DELETE** `/api/khach-hang/{id}` - Delete a specific customer

## Partners (Đối Tác)

*   **GET** `/api/doi-tac` - List all partners
*   **POST** `/api/doi-tac` - Create a new partner
*   **GET** `/api/doi-tac/{id}` - Get a specific partner
*   **PUT** `/api/doi-tac/{id}` - Update a specific partner
*   **DELETE** `/api/doi-tac/{id}` - Delete a specific partner

## Vehicles (Phương Tiện)

### Truck Heads (Đầu Kéo)

*   **GET** `/api/phuong-tien/dau-keo` - List all truck heads
*   **POST** `/api/phuong-tien/dau-keo` - Create a new truck head
*   **GET** `/api/phuong-tien/dau-keo/{id}` - Get a specific truck head
*   **PUT** `/api/phuong-tien/dau-keo/{id}` - Update a specific truck head
*   **DELETE** `/api/phuong-tien/dau-keo/{id}` - Delete a specific truck head

### Trailers (Rơ Mooc)

*   **GET** `/api/phuong-tien/ro-mooc` - List all trailers
*   **POST** `/api/phuong-tien/ro-mooc` - Create a new trailer
*   **GET** `/api/phuong-tien/ro-mooc/{id}` - Get a specific trailer
*   **PUT** `/api/phuong-tien/ro-mooc/{id}` - Update a specific trailer
*   **DELETE** `/api/phuong-tien/ro-mooc/{id}` - Delete a specific trailer

### Containers

*   **GET** `/api/phuong-tien/container` - List all containers
*   **POST** `/api/phuong-tien/container` - Create a new container
*   **GET** `/api/phuong-tien/container/{id}` - Get a specific container
*   **PUT** `/api/phuong-tien/container/{id}` - Update a specific container
*   **DELETE** `/api/phuong-tien/container/{id}` - Delete a specific container

## Norms/Quotas (Định Mức)

*   **GET** `/api/dinh-muc/di-duong` - List all route norms
*   **POST** `/api/dinh-muc/di-duong` - Create a new route norm
*   **PUT** `/api/dinh-muc/di-duong/{id}` - Update a route norm

*   **GET** `/api/dinh-muc/cho-hang` - List all cargo handling norms
*   **POST** `/api/dinh-muc/cho-hang` - Create new cargo handling norm
*   **PUT** `/api/dinh-muc/cho-hang/{id}` - Update cargo handling norm

*   **GET** `/api/dinh-muc/vo-rong` - List all empty/tare norms
*   **POST** `/api/dinh-muc/vo-rong` - Create new empty/tare norm
*   **PUT** `/api/dinh-muc/vo-rong/{id}` - Update empty/tare norm

*   **GET** `/api/dinh-muc/bo-sung` - List all supplementary norms
*   **POST** `/api/dinh-muc/bo-sung` - Create new supplementary norm
*   **PUT** `/api/dinh-muc/bo-sung/{id}` - Update supplementary norm

*   **GET** `/api/dinh-muc/{bien_so}` - Get all norms for a specific license plate

## Shipment Schedules (Lịch Vận Chuyển)

*   **GET** `/api/lich-van-chuyen` - List all shipment schedules (with filters for date, status, etc.)
*   **POST** `/api/lich-van-chuyen` - Create a new shipment schedule
*   **GET** `/api/lich-van-chuyen/{id}` - Get a specific shipment schedule
*   **PUT** `/api/lich-van-chuyen/{id}` - Update a specific shipment schedule
*   **DELETE** `/api/lich-van-chuyen/{id}` - Delete a specific shipment schedule
*   **PUT** `/api/lich-van-chuyen/{id}/trang-thai` - Update status of a shipment schedule

## Maintenance (Bảo Dưỡng)

### Tires (Lốp Xe) - Assuming part of vehicle maintenance

*   **GET** `/api/bao-duong/lop-xe` - List all tire records (possibly per vehicle)
*   **POST** `/api/bao-duong/lop-xe` - Create a new tire record/maintenance entry
*   **GET** `/api/bao-duong/lop-xe/{id}` - Get a specific tire record
*   **PUT** `/api/bao-duong/lop-xe/{id}` - Update a tire record
*   **DELETE** `/api/bao-duong/lop-xe/{id}` - Delete a tire record

## Employees (Nhân Viên)

*   **GET** `/api/nhan-vien` - List all employees
*   **POST** `/api/nhan-vien` - Create a new employee
*   **GET** `/api/nhan-vien/{id}` - Get a specific employee
*   **PUT** `/api/nhan-vien/{id}` - Update a specific employee
*   **DELETE** `/api/nhan-vien/{id}` - Delete a specific employee

## Routes/Lines (Tuyến Đường)

*   **GET** `/api/tuyen-duong` - List all routes
*   **POST** `/api/tuyen-duong` - Create a new route
*   **GET** `/api/tuyen-duong/{id}` - Get a specific route
*   **PUT** `/api/tuyen-duong/{id}` - Update a specific route
*   **DELETE** `/api/tuyen-duong/{id}` - Delete a specific route

## Reports (Báo Cáo)

*   **GET** `/api/bao-cao/chi-tiet-chi-phi` - Detailed cost report
*   **GET** `/api/bao-cao/cong-no` - Debt report
*   **GET** `/api/bao-cao/loi-nhuan-doanh-thu` - Revenue and profit report
*   **GET** `/api/bao-cao/tai-chinh` - Financial report
*   **GET** `/api/bao-cao/theo-doi-doanh-thu-chi-phi-phuong-tien` - Vehicle revenue/cost tracking report

## Configuration (Cấu Hình)

*   **GET** `/api/cau-hinh` - Get general application configuration
*   **PUT** `/api/cau-hinh` - Update application configuration
