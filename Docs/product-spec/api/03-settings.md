# Settings Management API

## Overview
Manage system-wide configuration settings such as tax rates.

---

## Get Tax Rate Setting
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

---

## Update Tax Rate Setting
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
  "message": "Sửa thuế suất thành công",
  "data": {
    "key": "tax_rate",
    "value": "8",
    "last_updated_by": "manager",
    "created_at": "2024-06-24T10:00:00Z",
    "updated_at": "2024-06-24T11:30:00Z"
  }
}
```
