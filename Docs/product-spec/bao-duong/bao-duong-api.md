# Vehicle Expense & Maintenance Management API Documentation

## Overview

This API provides endpoints for managing vehicle maintenance and expenses for tractors and trailers. The system includes both general expense management and a dedicated maintenance tracking system. All endpoints require JWT authentication and return responses in a consistent JSON format.

### Key Features
- **Expense Management**: Track expenses for tractors and trailers with detailed items
- **Maintenance Tracking**: Dedicated maintenance records with install/expiry dates
- **User Audit Trail**: Track who created and last updated records
- **Flexible Filtering**: Search by license plate, vendor, date ranges, and more
- **JWT Authentication**: Secure access with role-based permissions

## Base URL
```
/api/v1
```

## Authentication
All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "errors": {
    "code": 4001,
    "message": "Detailed error message"
  }
}
```

## HTTP Status Codes
- `200 OK` - Successful GET, PUT, DELETE requests
- `201 Created` - Successful POST requests
- `400 Bad Request` - Invalid input or request format
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server-side error

---

## Authentication

### Login
Authenticate user with username and password.

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Đăng nhập thành công",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@nepocorp.com",
      "name": "Administrator",
      "role": "admin"
    }
  }
}
```

### Refresh Token
Refresh the access token using a refresh token.

**Endpoint:** `POST /api/v1/auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Làm mới token thành công",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Profile
Get the current user's profile information.

**Endpoint:** `GET /api/v1/auth/profile`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy thông tin hồ sơ thành công",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@nepocorp.com",
    "name": "Administrator",
    "role": "admin",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## Settings Management

### Get Tax Rate Setting
Retrieve the current tax rate configuration.

**Endpoint:** `GET /api/v1/settings/tax_rate`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy thuế suất thành công",
  "data": {
    "key": "tax_rate",
    "value": "10",
    "last_updated_by": "admin",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:00:00Z"
  }
}
```

### Update Tax Rate Setting
Update the tax rate configuration.

**Endpoint:** `PUT /api/v1/settings/tax_rate`

**Request Body:**
```json
{
  "value": "8"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Cập nhật thuế suất thành công",
  "data": {
    "key": "tax_rate",
    "value": "8",
    "last_updated_by": "manager",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T11:30:00Z"
  }
}
```

---

## Expense Categories

### List Expense Categories
Retrieve all expense categories with pagination.

**Endpoint:** `GET /api/v1/expense_category`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Records per page

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy danh sách danh mục chi phí thành công",
  "data": [
    {
      "id": 1,
      "name": "Bảo dưỡng",
      "created_at": "2023-01-15T08:30:00Z",
      "updated_at": "2023-01-15T08:30:00Z"
    },
    {
      "id": 2,
      "name": "Bảo hiểm",
      "created_at": "2023-01-15T08:30:00Z",
      "updated_at": "2023-01-15T08:30:00Z"
    }
  ],
  "pagination": {
    "records_count": 3,
    "page": 1,
    "limit": 10,
    "total_pages": 1
  }
}
```

### Create Expense Category
Create a new expense category.

**Endpoint:** `POST /api/v1/expense_category`

**Request Body:**
```json
{
  "name": "Phí đường bộ"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Tạo danh mục chi phí thành công",
  "data": {
    "id": 4,
    "name": "Phí đường bộ",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z"
  }
}
```

### Update Expense Category
Update an existing expense category.

**Endpoint:** `PUT /api/v1/expense_category/:id`

**Request Body:**
```json
{
  "name": "Phí đường bộ và cầu phà"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Cập nhật danh mục chi phí thành công",
  "data": {
    "id": 4,
    "name": "Phí đường bộ và cầu phà",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

### Delete Expense Category
Delete an expense category.

**Endpoint:** `DELETE /api/v1/expense_category/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Xóa danh mục chi phí thành công",
  "data": null
}
```

---

## Vehicle Management

### Tractors

#### List Tractors
**Endpoint:** `GET /api/v1/tractor`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Records per page

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy danh sách đầu kéo thành công",
  "data": [
    {
      "id": 1,
      "license_plate": "16C-333.44",
      "description": "Tractor 1",
      "created_at": "2023-01-15T08:30:00Z",
      "updated_at": "2023-01-15T08:30:00Z"
    }
  ],
  "pagination": {
    "records_count": 10,
    "page": 1,
    "limit": 10,
    "total_pages": 1
  }
}
```

#### Create Tractor
**Endpoint:** `POST /api/v1/tractor`

**Request Body:**
```json
{
  "license_plate": "16C-444.55",
  "description": "Tractor 2"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Tạo đầu kéo thành công",
  "data": {
    "id": 2,
    "license_plate": "16C-444.55",
    "description": "Tractor 2",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z"
  }
}
```

#### Update Tractor
**Endpoint:** `PUT /api/v1/tractor/:id`

**Request Body:**
```json
{
  "license_plate": "16C-444.66",
  "description": "Updated Tractor 2"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Cập nhật đầu kéo thành công",
  "data": {
    "id": 2,
    "license_plate": "16C-444.66",
    "description": "Updated Tractor 2",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

#### Delete Tractor
**Endpoint:** `DELETE /api/v1/tractor/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Xóa đầu kéo thành công",
  "data": null
}
```

### Trailers

#### List Trailers
**Endpoint:** `GET /api/v1/trailer`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Records per page

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy danh sách rơ moóc thành công",
  "data": [
    {
      "id": 1,
      "license_plate": "16C-111.22",
      "description": "Trailer 1",
      "created_at": "2023-01-15T08:30:00Z",
      "updated_at": "2023-01-15T08:30:00Z"
    }
  ],
  "pagination": {
    "records_count": 5,
    "page": 1,
    "limit": 10,
    "total_pages": 1
  }
}
```

#### Create Trailer
**Endpoint:** `POST /api/v1/trailer`

**Request Body:**
```json
{
  "license_plate": "16C-222.33",
  "description": "Trailer 2"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Tạo rơ moóc thành công",
  "data": {
    "id": 2,
    "license_plate": "16C-222.33",
    "description": "Trailer 2",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z"
  }
}
```

#### Update Trailer
**Endpoint:** `PUT /api/v1/trailer/:id`

**Request Body:**
```json
{
  "license_plate": "16C-222.44",
  "description": "Updated Trailer 2"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Cập nhật rơ moóc thành công",
  "data": {
    "id": 2,
    "license_plate": "16C-222.44",
    "description": "Updated Trailer 2",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

#### Delete Trailer
**Endpoint:** `DELETE /api/v1/trailer/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Xóa rơ moóc thành công",
  "data": null
}
```

### Containers

#### List Containers
**Endpoint:** `GET /api/v1/container`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Records per page

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy danh sách container thành công",
  "data": [
    {
      "id": 1,
      "category": "20DC",
      "created_at": "2023-01-15T08:30:00Z",
      "updated_at": "2023-01-15T08:30:00Z"
    },
    {
      "id": 2,
      "category": "40HC",
      "created_at": "2023-01-15T08:30:00Z",
      "updated_at": "2023-01-15T08:30:00Z"
    }
  ],
  "pagination": {
    "records_count": 20,
    "page": 1,
    "limit": 10,
    "total_pages": 2
  }
}
```

#### Create Container
**Endpoint:** `POST /api/v1/container`

**Request Body:**
```json
{
  "category": "40DC"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Tạo container thành công",
  "data": {
    "id": 3,
    "category": "40DC",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z"
  }
}
```

#### Update Container
**Endpoint:** `PUT /api/v1/container/:id`

**Request Body:**
```json
{
  "category": "45HC"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Cập nhật container thành công",
  "data": {
    "id": 3,
    "category": "45HC",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

#### Delete Container
**Endpoint:** `DELETE /api/v1/container/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Xóa container thành công",
  "data": null
}
```

---

## Expense Management

### List Expenses
Retrieve all expenses with pagination and filtering.

**Endpoint:** `GET /api/v1/expense`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Records per page
- `tractor_id` (optional) - Filter by tractor ID
- `trailer_id` (optional) - Filter by trailer ID
- `expense_category_id` (optional) - Filter by category
- `payment_status` (optional) - Filter by payment status

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy danh sách chi phí đầu kéo thành công",
  "data": [
    {
      "id": 1,
      "tractor_id": 1,
      "trailer_id": null,
      "vendor_name": "Auto Parts Store",
      "expense_category_id": 1,
      "subtotal": 4000000,
      "tax_rate": 10,
      "total": 4400000,
      "payment_status": "PAID",
      "payment_proof": "https://drive.google.com/file/d/xxx",
      "currency": "VND",
      "remark": "Thay lốp xe định kỳ",
      "created_by": 1,
      "created_at": "2024-06-24T10:00:00Z",
      "updated_at": "2024-06-24T10:00:00Z",
      "tractor": {
        "id": 1,
        "license_plate": "16C-333.44",
        "description": "Tractor 1"
      },
      "expense_category": {
        "id": 1,
        "name": "Bảo dưỡng"
      },
      "created_by_user": {
        "id": 1,
        "username": "admin",
        "name": "Administrator"
      }
    }
  ],
  "pagination": {
    "records_count": 50,
    "page": 1,
    "limit": 10,
    "total_pages": 5
  }
}
```

### Create Expense
Create a new expense with items.

**Endpoint:** `POST /api/v1/expense`

**Request Body:**
```json
{
  "tractor_id": 1,
  "trailer_id": null,
  "vendor_name": "Auto Parts Store",
  "expense_category_id": 1,
  "subtotal": 4000000,
  "tax_rate": 10,
  "total": 4400000,
  "payment_status": "DRAFT",
  "payment_proof": "",
  "remark": "Thay lốp xe định kỳ",
  "items": [
    {
      "item_name": "Lốp xe",
      "price": 1000000,
      "quantity": 4,
      "total": 4000000,
      "install_date": "2023-01-15T08:30:00Z",
      "expiry_date": "2024-01-15T08:30:00Z"
    }
  ],
  "currency": "VND"
}
```

**Validation Rules:**
- Either `tractor_id` or `trailer_id` is required (but not both)
- `vendor_name` is required
- `expense_category_id` must exist
- `payment_status` must be one of: DRAFT, PENDING, PAID, CANCELLED
- At least one item is required

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Tạo chi phí đầu kéo thành công",
  "data": {
    "id": 1,
    "tractor_id": 1,
    "trailer_id": null,
    "vendor_name": "Auto Parts Store",
    "expense_category_id": 1,
    "subtotal": 4000000,
    "tax_rate": 10,
    "total": 4400000,
    "payment_status": "DRAFT",
    "payment_proof": "",
    "currency": "VND",
    "remark": "Thay lốp xe định kỳ",
    "created_by": 1,
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:00:00Z",
    "items": [
      {
        "id": 1,
        "expense_id": 1,
        "item_name": "Lốp xe",
        "price": 1000000,
        "quantity": 4,
        "total": 4000000,
        "install_date": "2023-01-15T08:30:00Z",
        "expiry_date": "2024-01-15T08:30:00Z",
        "created_at": "2024-06-24T10:00:00Z",
        "updated_at": "2024-06-24T10:00:00Z"
      }
    ]
  }
}
```

### Get Expense Details
Retrieve a single expense with all its items.

**Endpoint:** `GET /api/v1/expense/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy chi phí đầu kéo thành công",
  "data": {
    "id": 1,
    "tractor_id": 1,
    "trailer_id": null,
    "vendor_name": "Auto Parts Store",
    "expense_category_id": 1,
    "subtotal": 5000000,
    "tax_rate": 10,
    "total": 5500000,
    "payment_status": "PAID",
    "payment_proof": "https://drive.google.com/file/d/xxx",
    "currency": "VND",
    "remark": "Bảo dưỡng định kỳ",
    "created_by": 1,
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:00:00Z",
    "tractor": {
      "id": 1,
      "license_plate": "16C-333.44",
      "description": "Tractor 1"
    },
    "expense_category": {
      "id": 1,
      "name": "Bảo dưỡng"
    },
    "created_by_user": {
      "id": 1,
      "username": "admin",
      "name": "Administrator"
    },
    "items": [
      {
        "id": 1,
        "expense_id": 1,
        "item_name": "Thay dầu động cơ",
        "price": 1500000,
        "quantity": 2,
        "total": 3000000,
        "install_date": "2023-01-15T08:30:00Z",
        "expiry_date": "2024-01-15T08:30:00Z",
        "created_at": "2024-06-24T10:00:00Z",
        "updated_at": "2024-06-24T10:00:00Z"
      },
      {
        "id": 2,
        "expense_id": 1,
        "item_name": "Lọc dầu",
        "price": 500000,
        "quantity": 2,
        "total": 1000000,
        "install_date": "2023-01-15T08:30:00Z",
        "expiry_date": null,
        "created_at": "2024-06-24T10:00:00Z",
        "updated_at": "2024-06-24T10:00:00Z"
      }
    ]
  }
}
```

### Update Expense
Update an existing expense.

**Endpoint:** `PUT /api/v1/expense/:id`

**Request Body:**
```json
{
  "payment_status": "PAID",
  "payment_proof": "https://drive.google.com/file/d/yyy",
  "remark": "Đã thanh toán và hoàn thành bảo dưỡng"
}
```

**Note:** You cannot change the vehicle assignment (tractor_id/trailer_id) after creation.

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Cập nhật chi phí đầu kéo thành công",
  "data": {
    "id": 1,
    "tractor_id": 1,
    "trailer_id": null,
    "vendor_name": "Auto Parts Store",
    "expense_category_id": 1,
    "subtotal": 4000000,
    "tax_rate": 10,
    "total": 4400000,
    "payment_status": "PAID",
    "payment_proof": "https://drive.google.com/file/d/yyy",
    "currency": "VND",
    "remark": "Đã thanh toán và hoàn thành bảo dưỡng",
    "created_by": 1,
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:15:00Z"
  }
}
```

### Delete Expense
Delete an expense and all its items.

**Endpoint:** `DELETE /api/v1/expense/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Xóa chi phí đầu kéo thành công",
  "data": null
}
```

---

## Expense Items Management

### Add Expense Item
Add a new item to an existing expense.

**Endpoint:** `POST /api/v1/expense/:id/item`

**Request Body:**
```json
{
  "item_name": "Bình ắc quy",
  "price": 1200000,
  "quantity": 1,
  "total": 1200000,
  "install_date": "2023-01-15T08:30:00Z",
  "expiry_date": "2024-01-15T08:30:00Z"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Tạo khoản chi phí thành công",
  "data": {
    "id": 3,
    "expense_id": 1,
    "item_name": "Bình ắc quy",
    "price": 1200000,
    "quantity": 1,
    "total": 1200000,
    "install_date": "2023-01-15T08:30:00Z",
    "expiry_date": "2024-01-15T08:30:00Z",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:00:00Z"
  }
}
```

### Update Expense Item
Update an existing expense item.

**Endpoint:** `PUT /api/v1/expense/:id/item/:item_id`

**Request Body:**
```json
{
  "item_name": "Bình ắc quy 12V",
  "price": 1300000,
  "quantity": 1,
  "total": 1300000,
  "install_date": "2023-01-15T08:30:00Z",
  "expiry_date": "2024-01-15T08:30:00Z"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Cập nhật khoản chi phí thành công",
  "data": {
    "id": 3,
    "expense_id": 1,
    "item_name": "Bình ắc quy 12V",
    "price": 1300000,
    "quantity": 1,
    "total": 1300000,
    "install_date": "2023-01-15T08:30:00Z",
    "expiry_date": "2024-01-15T08:30:00Z",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:30:00Z"
  }
}
```

### Delete Expense Item
Delete an expense item.

**Endpoint:** `DELETE /api/v1/expense/:id/item/:item_id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Xóa khoản chi phí thành công",
  "data": null
}
```

---

## Maintenance Management

### List Maintenance Records
Get all maintenance records with pagination and filtering.

**Endpoint:** `GET /api/v1/maintenance`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Records per page
- `license_plate` (optional) - Filter by vehicle license plate
- `vendor_name` (optional) - Filter by vendor name (partial match)
- `item_name` (optional) - Filter by maintenance item name
- `start_date` (optional) - Filter by maintenance date range start (YYYY-MM-DD)
- `end_date` (optional) - Filter by maintenance date range end (YYYY-MM-DD)

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Maintenance records retrieved successfully",
  "data": [
    {
      "id": 1,
      "expense_id": 10,
      "license_plate": "16C-333.44",
      "vendor_name": "Auto Parts Store",
      "item_name": "Thay dầu động cơ",
      "price": 1500000,
      "quantity": 2,
      "tax_rate": 10,
      "total": 3300000,
      "install_date": "2024-06-24T00:00:00Z",
      "expiry_date": "2025-06-24T00:00:00Z",
      "last_updated_by": "admin",
      "created_at": "2024-06-24T10:00:00Z",
      "updated_at": "2024-06-24T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total_pages": 1,
    "records_count": 5
  }
}
```

### Get Maintenance Record
Retrieve a single maintenance record by ID.

**Endpoint:** `GET /api/v1/maintenance/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Maintenance record retrieved successfully",
  "data": {
    "id": 1,
    "expense_id": 10,
    "license_plate": "16C-333.44",
    "vendor_name": "Auto Parts Store",
    "item_name": "Thay dầu động cơ",
    "price": 1500000,
    "quantity": 2,
    "tax_rate": 10,
    "total": 3300000,
    "install_date": "2024-06-24T00:00:00Z",
    "expiry_date": "2025-06-24T00:00:00Z",
    "last_updated_by": "admin",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:00:00Z"
  }
}
```

### Create Maintenance Record
Create a new maintenance record.

**Endpoint:** `POST /api/v1/maintenance`

**Request Body:**
```json
{
  "expense_id": 10,
  "license_plate": "16C-333.44",
  "vendor_name": "Auto Parts Store",
  "item_name": "Thay dầu động cơ",
  "price": 1500000,
  "quantity": 2,
  "tax_rate": 10,
  "install_date": "2024-06-24",
  "expiry_date": "2025-06-24"
}
```

**Validation Rules:**
- `expense_id` is required and must be a valid expense ID
- `license_plate` is required
- `vendor_name` is required
- `item_name` is required
- `price` must be greater than 0
- `quantity` must be greater than 0
- `tax_rate` is optional, defaults to 0
- `install_date` and `expiry_date` are optional, accept date format YYYY-MM-DD or ISO datetime

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Maintenance record created successfully",
  "data": {
    "id": 15,
    "expense_id": 10,
    "license_plate": "16C-333.44",
    "vendor_name": "Auto Parts Store",
    "item_name": "Thay dầu động cơ",
    "price": 1500000,
    "quantity": 2,
    "tax_rate": 10,
    "total": 3300000,
    "install_date": "2024-06-24T00:00:00Z",
    "expiry_date": "2025-06-24T00:00:00Z",
    "last_updated_by": "admin",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:00:00Z"
  }
}
```

### Update Maintenance Record
Update an existing maintenance record.

**Endpoint:** `PUT /api/v1/maintenance/:id`

**Request Body:**
```json
{
  "expense_id": 10,
  "license_plate": "16C-333.44",
  "vendor_name": "Auto Parts Store",
  "item_name": "Thay dầu động cơ + lọc dầu",
  "price": 1700000,
  "quantity": 2,
  "tax_rate": 10,
  "install_date": "2024-06-24",
  "expiry_date": "2025-06-24"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Maintenance record updated successfully",
  "data": {
    "id": 15,
    "expense_id": 10,
    "license_plate": "16C-333.44",
    "vendor_name": "Auto Parts Store",
    "item_name": "Thay dầu động cơ + lọc dầu",
    "price": 1700000,
    "quantity": 2,
    "tax_rate": 10,
    "total": 3740000,
    "install_date": "2024-06-24T00:00:00Z",
    "expiry_date": "2025-06-24T00:00:00Z",
    "last_updated_by": "admin",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:15:00Z"
  }
}
```

### Delete Maintenance Record
Delete a maintenance record by ID.

**Endpoint:** `DELETE /api/v1/maintenance/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Maintenance record deleted successfully"
}
```

---

## Error Handling

### Common Error Codes

| Code | Description |
|------|-------------|
| 4001 | Bad Request - Invalid input or validation error |
| 4004 | Not Found - Resource not found |
| 4010 | Unauthorized - Authentication required |
| 5000 | Internal Server Error |

### Validation Error Example
```json
{
  "status": "error",
  "message": "Invalid input provided",
  "errors": {
    "code": 4001,
    "message": "Either tractor_id or trailer_id is required (but not both)"
  }
}
```

### Not Found Error Example
```json
{
  "status": "error",
  "message": "Expense not found",
  "errors": {
    "code": 4004,
    "message": "Expense with ID 123 not found"
  }
}
```

---

## Implementation Notes

### Data Model Architecture

1. **Dual Tracking System**: The backend implements both a general expense system and a dedicated maintenance tracking system:
   - **Expenses**: Track general costs with multiple items per expense
   - **Maintenance**: Track specific maintenance activities with install/expiry dates

2. **Maintenance vs Expense Items**:
   - **Maintenance records** are standalone entities with `expense_id` references
   - **Expense items** are nested resources under expenses
   - Both support similar fields but serve different purposes

### Key Implementation Details

3. **Backend Initialization**: The backend automatically creates a "Bảo dưỡng" expense category with ID 1 if it doesn't exist.

4. **User Tracking**: All records include audit trails:
   - `created_by` - User ID who created the record
   - `last_updated_by` - Username of the user who last modified the record

5. **Data Validation**:
   - Expenses require either `tractor_id` OR `trailer_id` (but not both)
   - Maintenance records require valid `expense_id` references
   - All monetary values must be positive integers
   - Flexible date parsing supports both YYYY-MM-DD and ISO datetime formats

6. **Automatic Calculations**:
   - **Maintenance**: `total = (price * quantity) * (1 + tax_rate/100)`
   - **Expenses**: Manual subtotal/total management with tax calculations

### Technical Details

7. **Currency**: All monetary values are stored as integers in VND (Vietnamese Dong).

8. **Date Handling**: Supports flexible date input:
   - Simple date format: `"2024-06-24"`
   - ISO datetime format: `"2024-06-24T10:00:00Z"`

9. **Pagination**: All list endpoints support pagination with `page` and `limit` parameters.

10. **Authentication**: JWT tokens must be included as Bearer tokens in the Authorization header.

11. **Error Codes**: Consistent error structure with both HTTP status codes and internal error codes for detailed error handling.
