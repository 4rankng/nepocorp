# Expense Management API

## Overview
Manage vehicle expenses with detailed item tracking for tractors and trailers.

---

## List Expenses
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

---

## Create Expense
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

---

## Get Expense Details
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

---

## Update Expense
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

---

## Delete Expense
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