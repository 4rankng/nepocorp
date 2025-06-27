# Expense Items Management API

## Overview
Manage individual items within expenses. These endpoints handle the creation, update, and deletion of specific items associated with an expense.

---

## Add Expense Item
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

**Validation Rules:**
- `item_name` is required
- `price` is required and must be greater than 0
- `quantity` is required and must be greater than 0
- `install_date` and `expiry_date` are optional

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

---

## Update Expense Item
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

**Note:** Only provided fields will be updated. Omitted fields retain their current values.

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

---

## Delete Expense Item
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

## Important Notes

1. **Nested Resources**: All expense item operations require the parent expense ID in the URL path.

2. **Validation**: The system validates that:
   - The expense exists before allowing item operations
   - The item belongs to the specified expense (for update/delete)
   - Required fields are present and valid

3. **Total Calculation**: The `total` field should be calculated as `price * quantity` on the client side before submission.

4. **Date Formats**: Both `install_date` and `expiry_date` accept:
   - Simple date format: `"2024-06-24"`
   - ISO datetime format: `"2024-06-24T10:00:00Z"`