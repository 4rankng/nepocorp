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
  "license_plate": "16C-333.44",
  "item_name": "Bình ắc quy",
  "price": 1200000,
  "quantity": 1,
  "tax_rate": 10,
  "subtotal": 1200000,
  "total": 1320000,
  "install_date": "2023-01-15T08:30:00Z",
  "expiry_date": "2024-01-15T08:30:00Z"
}
```

**Validation Rules:**
- `license_plate` is required
- `item_name` is required
- `price` is required and must be greater than 0
- `quantity` is required and must be greater than 0
- `tax_rate` is optional (defaults to 0)
- `install_date` and `expiry_date` are optional

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Tạo khoản chi phí thành công",
  "data": {
    "id": 3,
    "expense_id": 1,
    "license_plate": "16C-333.44",
    "item_name": "Bình ắc quy",
    "price": 1200000,
    "quantity": 1,
    "tax_rate": 10,
    "subtotal": 1200000,
    "total": 1320000,
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
  "license_plate": "16C-333.44",
  "item_name": "Bình ắc quy 12V",
  "price": 1300000,
  "quantity": 1,
  "tax_rate": 10,
  "subtotal": 1300000,
  "total": 1430000,
  "install_date": "2023-01-15T08:30:00Z",
  "expiry_date": "2024-01-15T08:30:00Z"
}
```

**Note:** Only provided fields will be updated. Omitted fields retain their current values.

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Sửa khoản chi phí thành công",
  "data": {
    "id": 3,
    "expense_id": 1,
    "license_plate": "16C-333.44",
    "item_name": "Bình ắc quy 12V",
    "price": 1300000,
    "quantity": 1,
    "tax_rate": 10,
    "subtotal": 1300000,
    "total": 1430000,
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

3. **Total Calculation**: 
   - `subtotal` = `price * quantity`
   - `total` = `subtotal + (subtotal * tax_rate / 100)`

4. **Date Formats**: Both `install_date` and `expiry_date` accept:
   - Simple date format: `"2024-06-24"`
   - ISO datetime format: `"2024-06-24T10:00:00Z"`
