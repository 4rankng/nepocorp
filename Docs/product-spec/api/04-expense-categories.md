# Expense Categories API

## Overview
Manage expense categories used for classifying vehicle expenses.

---

## List Expense Categories
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

---

## Create Expense Category
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

---

## Update Expense Category
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
  "message": "Sửa danh mục chi phí thành công",
  "data": {
    "id": 4,
    "name": "Phí đường bộ và cầu phà",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

---

## Delete Expense Category
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
