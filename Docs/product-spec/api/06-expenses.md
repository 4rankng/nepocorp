# Expense Management API

## Overview
Manage vehicle expenses with detailed item tracking. Vehicle associations are handled at the item level through license plates.

## Endpoints

### 1. List Expenses
Retrieve all expenses with pagination and filtering.

**Endpoint:** `GET /api/v1/expense`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 10 | Records per page |

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy danh sách chi phí đầu kéo thành công",
  "data": [
    {
      "id": 1,
      "vendor_name": "Auto Parts Store",
      "expense_category_id": 1,
      "total": 4400000,
      "payment_status": "PAID",
      "payment_proof": "https://drive.google.com/file/d/xxx",
      "currency": "VND",
      "remark": "Thay lốp xe định kỳ",
      "cancel_reason": "",
      "created_by": 1,
      "last_updated_by": "system",
      "created_at": "2024-06-24T10:00:00Z",
      "updated_at": "2024-06-24T10:00:00Z",
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

### 2. Create Expense
Create a new expense with items.

**Endpoint:** `POST /api/v1/expense`

**Request Body:**
```json
{
  "vendor_name": "Auto Parts Store",
  "expense_category_id": 1,
  "total": 4400000,
  "payment_status": "DRAFT",
  "payment_proof": "",
  "remark": "Thay lốp xe định kỳ",
  "currency": "VND",
  "items": [
    {
      "license_plate": "16C-333.44",
      "item_name": "Lốp xe",
      "price": 1000000,
      "quantity": 4,
      "tax_rate": 10,
      "subtotal": 4000000,
      "total": 4400000,
      "install_date": "2023-01-15T08:30:00Z",
      "expiry_date": "2024-01-15T08:30:00Z"
    }
  ]
}
```

**Validation Rules:**
- `vendor_name` is required
- `expense_category_id` must exist
- `payment_status` must be one of: `DRAFT`, `PENDING`, `PAID`, `CANCELLED`
- At least one item is required
- Each item must have `license_plate`, `item_name`, `price`, and `quantity`

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Tạo chi phí đầu kéo thành công",
  "data": {
    "id": 1,
    "vendor_name": "Auto Parts Store",
    "expense_category_id": 1,
    "total": 4400000,
    "payment_status": "DRAFT",
    "payment_proof": "",
    "currency": "VND",
    "remark": "Thay lốp xe định kỳ",
    "cancel_reason": "",
    "created_by": 1,
    "last_updated_by": "system",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:00:00Z",
    "items": [
      {
        "id": 1,
        "expense_id": 1,
        "license_plate": "16C-333.44",
        "item_name": "Lốp xe",
        "price": 1000000,
        "quantity": 4,
        "tax_rate": 10,
        "subtotal": 4000000,
        "total": 4400000,
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

### 3. Get Expense Details
Retrieve a single expense with all its items.

**Endpoint:** `GET /api/v1/expense/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy chi phí đầu kéo thành công",
  "data": {
    "id": 1,
    "vendor_name": "Auto Parts Store",
    "expense_category_id": 1,
    "total": 5500000,
    "payment_status": "PAID",
    "payment_proof": "https://drive.google.com/file/d/xxx",
    "currency": "VND",
    "remark": "Bảo dưỡng định kỳ",
    "cancel_reason": "",
    "created_by": 1,
    "last_updated_by": "system",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:00:00Z",
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
        "license_plate": "16C-333.44",
        "item_name": "Thay dầu động cơ",
        "price": 1500000,
        "quantity": 2,
        "tax_rate": 10,
        "subtotal": 3000000,
        "total": 3300000,
        "install_date": "2023-01-15T08:30:00Z",
        "expiry_date": "2024-01-15T08:30:00Z",
        "created_at": "2024-06-24T10:00:00Z",
        "updated_at": "2024-06-24T10:00:00Z"
      },
      {
        "id": 2,
        "expense_id": 1,
        "license_plate": "16C-333.44",
        "item_name": "Lọc dầu",
        "price": 500000,
        "quantity": 2,
        "tax_rate": 10,
        "subtotal": 1000000,
        "total": 1100000,
        "install_date": "2023-01-15T08:30:00Z",
        "expiry_date": null,
        "created_at": "2024-06-24T10:00:00Z",
        "updated_at": "2024-06-24T10:00:00Z"
      }
    ]
  }
}
```

**Response (404 Not Found):**
```json
{
  "status": "error",
  "message": "Chi phí đầu kéo không tồn tại",
  "error": {
    "code": "NOT_FOUND",
    "message": "Chi phí đầu kéo không tồn tại"
  }
}
```

---

### 4. Update Expense
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

**Note:** Only expense-level fields can be updated here. To update items, use the expense item endpoints.

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Sửa chi phí đầu kéo thành công",
  "data": {
    "id": 1,
    "vendor_name": "Auto Parts Store",
    "expense_category_id": 1,
    "total": 4400000,
    "payment_status": "PAID",
    "payment_proof": "https://drive.google.com/file/d/yyy",
    "currency": "VND",
    "remark": "Đã thanh toán và hoàn thành bảo dưỡng",
    "cancel_reason": "",
    "created_by": 1,
    "last_updated_by": "system",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T10:15:00Z"
  }
}
```

---

### 5. Delete Expense
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

## Data Models

### Expense Object
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique identifier |
| `vendor_name` | string | Vendor/supplier name |
| `expense_category_id` | integer | Category ID reference |
| `total` | integer | Total amount in smallest currency unit |
| `payment_status` | string | Status: `DRAFT`, `PENDING`, `PAID`, `CANCELLED` |
| `payment_proof` | string | URL or reference to payment proof |
| `currency` | string | Currency code (default: VND) |
| `remark` | string | Additional notes |
| `cancel_reason` | string | Reason for cancellation (if cancelled) |
| `created_by` | integer | User ID who created the expense |
| `last_updated_by` | string | Name and username of last updater |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### Expense Item Object
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique identifier |
| `expense_id` | integer | Parent expense ID |
| `license_plate` | string | Vehicle license plate |
| `item_name` | string | Item description |
| `price` | integer | Unit price |
| `quantity` | integer | Quantity |
| `tax_rate` | float | Tax rate percentage |
| `subtotal` | integer | Price × Quantity |
| `total` | integer | Subtotal + Tax |
| `install_date` | timestamp | Installation date (optional) |
| `expiry_date` | timestamp | Expiry date (optional) |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

---

## Example: Real Response
```json
{
  "status": "success",
  "message": "Lấy chi phí đầu kéo thành công",
  "data": {
    "id": 10,
    "vendor_name": "Xưởng sơn Tấn Phát",
    "expense_category_id": 1,
    "total": 2750000,
    "payment_status": "PAID",
    "payment_proof": "",
    "currency": "VND",
    "remark": "Sơn lại thùng xe",
    "created_by": 2,
    "last_updated_by": "Nguyễn Văn A (@manager1)",
    "created_at": "2025-06-27T09:27:37+08:00",
    "updated_at": "2025-06-27T09:27:37+08:00",
    "expense_category": {
      "id": 1,
      "name": "Bảo dưỡng",
      "created_at": "2025-06-27T09:27:36+08:00",
      "updated_at": "2025-06-27T09:27:36+08:00",
      "last_updated_by": ""
    },
    "created_by_user": {
      "id": 2,
      "created_at": "2025-06-27T09:27:37+08:00",
      "updated_at": "2025-06-27T09:27:37+08:00",
      "username": "manager1",
      "email": "manager1@nepocorp.com",
      "name": "Nguyễn Văn A",
      "role": "manager",
      "is_active": true,
      "last_updated_by": "system"
    },
    "items": [
      {
        "id": 18,
        "expense_id": 10,
        "license_plate": "51R-55555",
        "item_name": "Sơn Nippon Paint",
        "price": 800000,
        "quantity": 1,
        "tax_rate": 10.0,
        "total": 880000,
        "install_date": "2024-01-25T00:00:00+08:00",
        "expiry_date": null,
        "created_at": "2025-06-27T09:27:37+08:00",
        "updated_at": "2025-06-27T09:27:37+08:00"
      },
      {
        "id": 19,
        "expense_id": 10,
        "license_plate": "51R-55555",
        "item_name": "Chi phí thi công",
        "price": 1950000,
        "quantity": 1,
        "tax_rate": 10.0,
        "total": 2145000,
        "install_date": "2024-01-25T00:00:00+08:00",
        "expiry_date": null,
        "created_at": "2025-06-27T09:27:37+08:00",
        "updated_at": "2025-06-27T09:27:37+08:00"
      }
    ]
  }
}
```
