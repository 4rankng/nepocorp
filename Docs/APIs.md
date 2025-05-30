# API Endpoints for Frontend (v1)

This document outlines the necessary API endpoints for the frontend application, categorized by feature/resource. All endpoints are prefixed with `/api/v1`.

## General

*   **GET** `/health` - API health check and version

## Authentication

*   **POST** `/api/v1/auth/login` - User login
*   **POST** `/api/v1/auth/logout` - User logout
*   **GET** `/api/v1/auth/me` - Get current user information

## Customers (Khách Hàng)

*   **GET** `/api/v1/khach-hang` - List all customers
*   **POST** `/api/v1/khach-hang` - Create a new customer
*   **GET** `/api/v1/khach-hang/{id}` - Get a specific customer
*   **PUT** `/api/v1/khach-hang/{id}` - Update a specific customer
*   **DELETE** `/api/v1/khach-hang/{id}` - Delete a specific customer

## Partners (Đối Tác)

*   **GET** `/api/v1/doi-tac` - List all partners
*   **POST** `/api/v1/doi-tac` - Create a new partner
*   **GET** `/api/v1/doi-tac/{id}` - Get a specific partner
*   **PUT** `/api/v1/doi-tac/{id}` - Update a specific partner
*   **DELETE** `/api/v1/doi-tac/{id}` - Delete a specific partner

## Vehicles (Phương Tiện)

### Truck Heads (Đầu Kéo)

*   **GET** `/api/v1/phuong-tien/dau-keo` - List all truck heads
*   **POST** `/api/v1/phuong-tien/dau-keo` - Create a new truck head
*   **GET** `/api/v1/phuong-tien/dau-keo/{id}` - Get a specific truck head
*   **PUT** `/api/v1/phuong-tien/dau-keo/{id}` - Update a specific truck head
*   **DELETE** `/api/v1/phuong-tien/dau-keo/{id}` - Delete a specific truck head

### Trailers (Rơ Mooc)

*   **GET** `/api/v1/phuong-tien/ro-mooc` - List all trailers
*   **POST** `/api/v1/phuong-tien/ro-mooc` - Create a new trailer
*   **GET** `/api/v1/phuong-tien/ro-mooc/{id}` - Get a specific trailer
*   **PUT** `/api/v1/phuong-tien/ro-mooc/{id}` - Update a specific trailer
*   **DELETE** `/api/v1/phuong-tien/ro-mooc/{id}` - Delete a specific trailer

### Containers

*   **GET** `/api/v1/phuong-tien/container` - List all containers
*   **POST** `/api/v1/phuong-tien/container` - Create a new container
*   **GET** `/api/v1/phuong-tien/container/{id}` - Get a specific container
*   **PUT** `/api/v1/phuong-tien/container/{id}` - Update a specific container
*   **DELETE** `/api/v1/phuong-tien/container/{id}` - Delete a specific container

## Norms/Quotas (Định Mức)

### Route Norms (Định Mức Đi Đường)
*   **GET** `/api/v1/dinh-muc/di-duong` - List all route norms
*   **POST** `/api/v1/dinh-muc/di-duong` - Create a new route norm
*   **GET** `/api/v1/dinh-muc/di-duong/{id}` - Get a specific route norm
*   **PUT** `/api/v1/dinh-muc/di-duong/{id}` - Update a specific route norm
*   **DELETE** `/api/v1/dinh-muc/di-duong/{id}` - Delete a specific route norm

### Cargo Handling Norms (Định Mức Chở Hàng)
*   **GET** `/api/v1/dinh-muc/cho-hang` - List all cargo handling norms
*   **POST** `/api/v1/dinh-muc/cho-hang` - Create new cargo handling norm
*   **GET** `/api/v1/dinh-muc/cho-hang/{id}` - Get a specific cargo handling norm
*   **PUT** `/api/v1/dinh-muc/cho-hang/{id}` - Update cargo handling norm
*   **DELETE** `/api/v1/dinh-muc/cho-hang/{id}` - Delete cargo handling norm

### Empty/Tare Norms (Định Mức Vỏ Rỗng)
*   **GET** `/api/v1/dinh-muc/vo-rong` - List all empty/tare norms
*   **POST** `/api/v1/dinh-muc/vo-rong` - Create new empty/tare norm
*   **GET** `/api/v1/dinh-muc/vo-rong/{id}` - Get a specific empty/tare norm
*   **PUT** `/api/v1/dinh-muc/vo-rong/{id}` - Update empty/tare norm
*   **DELETE** `/api/v1/dinh-muc/vo-rong/{id}` - Delete empty/tare norm

### Supplementary Norms (Định Mức Bổ Sung)
*   **GET** `/api/v1/dinh-muc/bo-sung` - List all supplementary norms
*   **POST** `/api/v1/dinh-muc/bo-sung` - Create new supplementary norm
*   **GET** `/api/v1/dinh-muc/bo-sung/{id}` - Get a specific supplementary norm
*   **PUT** `/api/v1/dinh-muc/bo-sung/{id}` - Update supplementary norm
*   **DELETE** `/api/v1/dinh-muc/bo-sung/{id}` - Delete supplementary norm

### Norms by License Plate (Định Mức Theo Biển Số)
*   **GET** `/api/v1/dinh-muc/theo-bien-so/{bien_so}` - Get all norms for a specific license plate

## Shipment Schedules (Lịch Vận Chuyển)

*   **GET** `/api/v1/lich-van-chuyen` - List all shipment schedules (with filters for date, status, etc.)
*   **POST** `/api/v1/lich-van-chuyen` - Create a new shipment schedule
*   **GET** `/api/v1/lich-van-chuyen/{id}` - Get a specific shipment schedule
*   **PUT** `/api/v1/lich-van-chuyen/{id}` - Update a specific shipment schedule
*   **DELETE** `/api/v1/lich-van-chuyen/{id}` - Delete a specific shipment schedule
*   **PUT** `/api/v1/lich-van-chuyen/{id}/trang-thai` - Update status of a shipment schedule

## Maintenance (Bảo Dưỡng)

### Tires (Lốp Xe)
*   **GET** `/api/v1/bao-duong/lop-xe` - List all tire records (possibly per vehicle)
*   **POST** `/api/v1/bao-duong/lop-xe` - Create a new tire record/maintenance entry
*   **GET** `/api/v1/bao-duong/lop-xe/{id}` - Get a specific tire record
*   **PUT** `/api/v1/bao-duong/lop-xe/{id}` - Update a tire record
*   **DELETE** `/api/v1/bao-duong/lop-xe/{id}` - Delete a tire record

## Employees (Nhân Viên)

*   **GET** `/api/v1/nhan-vien` - List all employees
*   **POST** `/api/v1/nhan-vien` - Create a new employee
*   **GET** `/api/v1/nhan-vien/{id}` - Get a specific employee
*   **PUT** `/api/v1/nhan-vien/{id}` - Update a specific employee
*   **DELETE** `/api/v1/nhan-vien/{id}` - Delete a specific employee

## Routes/Lines (Tuyến Đường)

*   **GET** `/api/v1/tuyen-duong` - List all routes
*   **POST** `/api/v1/tuyen-duong` - Create a new route
*   **GET** `/api/v1/tuyen-duong/{id}` - Get a specific route
*   **PUT** `/api/v1/tuyen-duong/{id}` - Update a specific route
*   **DELETE** `/api/v1/tuyen-duong/{id}` - Delete a specific route

## Reports (Báo Cáo)

*   **GET** `/api/v1/bao-cao/chi-tiet-chi-phi` - Detailed cost report (supports `from_date` and `to_date` query parameters)
*   **GET** `/api/v1/bao-cao/cong-no` - Debt report (supports `from_date` and `to_date` query parameters)
*   **GET** `/api/v1/bao-cao/loi-nhuan-doanh-thu` - Revenue and profit report (supports `from_date` and `to_date` query parameters)
*   **GET** `/api/v1/bao-cao/tai-chinh` - Financial report (supports `from_date` and `to_date` query parameters)
*   **GET** `/api/v1/bao-cao/theo-doi-doanh-thu-chi-phi-phuong-tien` - Vehicle revenue/cost tracking report (supports `from_date` and `to_date` query parameters)

## Configuration (Cấu Hình)

*   **GET** `/api/v1/cau-hinh` - Get general application configuration
*   **POST** `/api/v1/cau-hinh` - Create or initialize application configuration
*   **PUT** `/api/v1/cau-hinh` - Update application configuration
*   **DELETE** `/api/v1/cau-hinh` - Delete or reset application configuration
