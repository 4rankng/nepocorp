# Maintenance Management API

## Overview
Dedicated maintenance tracking system for vehicle maintenance records with install/expiry date tracking.

---

## List Maintenance Records
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

---

## Get Maintenance Record
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

---

## Create Maintenance Record
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

---

## Update Maintenance Record
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

---

## Delete Maintenance Record
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

## Important Notes

1. **Automatic Total Calculation**: The total is automatically calculated as:
   ```
   total = (price * quantity) * (1 + tax_rate/100)
   ```

2. **User Tracking**: The `last_updated_by` field is automatically populated with the username of the user making the change.

3. **Expense Relationship**: Each maintenance record must be associated with a valid expense through `expense_id`.

4. **Date Filtering**: When using date range filters, both dates are inclusive.

5. **Flexible Date Input**: Dates can be provided in either:
   - Simple format: `"2024-06-24"`
   - ISO format: `"2024-06-24T10:00:00Z"`