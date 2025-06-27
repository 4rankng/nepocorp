# Vehicle Management API

## Overview
Manage tractors, trailers, and containers in the fleet.

---

## Tractors

### List Tractors
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

### Create Tractor
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

### Update Tractor
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

### Delete Tractor
**Endpoint:** `DELETE /api/v1/tractor/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Xóa đầu kéo thành công",
  "data": null
}
```

---

## Trailers

### List Trailers
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

### Create Trailer
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

### Update Trailer
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

### Delete Trailer
**Endpoint:** `DELETE /api/v1/trailer/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Xóa rơ moóc thành công",
  "data": null
}
```

---

## Containers

### List Containers
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

### Create Container
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

### Update Container
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

### Delete Container
**Endpoint:** `DELETE /api/v1/container/:id`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Xóa container thành công",
  "data": null
}
```