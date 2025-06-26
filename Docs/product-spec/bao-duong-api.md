# Vehicle Expense Management API Documentation

## Expense Categories

### GET /api/v1/expense_category
List all expense categories with pagination support.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 10)

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Expense categories retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "B�o d��ng",
      "created_at": "2023-01-15T08:30:00Z",
      "updated_at": "2023-01-15T08:30:00Z"
    },
    {
      "id": 2,
      "name": "S�a ch�a",
      "created_at": "2023-01-15T08:30:00Z",
      "updated_at": "2023-01-15T08:30:00Z"
    }
  ],
  "pagination": {
    "records_count": 15,
    "page": 1,
    "limit": 10,
    "total_pages": 2
  }
}
```

### POST /api/v1/expense_category
Create a new expense category.

**Request Body:**
```json
{
  "name": "B�o hi�m"
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "message": "Expense category created successfully",
  "data": {
    "id": 3,
    "name": "B�o hi�m",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z"
  }
}
```

### PUT /api/v1/expense_category/:id
Update an existing expense category.

**Request Body:**
```json
{
  "name": "B�o hi�m xe"
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Expense category updated successfully",
  "data": {
    "id": 3,
    "name": "B�o hi�m xe",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

### DELETE /api/v1/expense_category/:id
Delete an expense category.

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Expense category deleted successfully",
  "data": null
}
```

## Trailers

### GET /api/v1/trailer
List all trailers with pagination support.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 10)

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Trailers retrieved successfully",
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

### POST /api/v1/trailer
Create a new trailer.

**Request Body:**
```json
{
  "license_plate": "16C-222.33",
  "description": "Trailer 2"
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "message": "Trailer created successfully",
  "data": {
    "id": 2,
    "license_plate": "16C-222.33",
    "description": "Trailer 2",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z"
  }
}
```

### PUT /api/v1/trailer/:id
Update an existing trailer.

**Request Body:**
```json
{
  "license_plate": "16C-222.44",
  "description": "Updated Trailer 2"
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Trailer updated successfully",
  "data": {
    "id": 2,
    "license_plate": "16C-222.44",
    "description": "Updated Trailer 2",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

### DELETE /api/v1/trailer/:id
Delete a trailer.

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Trailer deleted successfully",
  "data": null
}
```

## Tractors

### GET /api/v1/tractor
List all tractors with pagination support.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 10)

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Tractors retrieved successfully",
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

### POST /api/v1/tractor
Create a new tractor.

**Request Body:**
```json
{
  "license_plate": "16C-444.55",
  "description": "Tractor 2"
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "message": "Tractor created successfully",
  "data": {
    "id": 2,
    "license_plate": "16C-444.55",
    "description": "Tractor 2",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z"
  }
}
```

### PUT /api/v1/tractor/:id
Update an existing tractor.

**Request Body:**
```json
{
  "license_plate": "16C-444.66",
  "description": "Updated Tractor 2"
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Tractor updated successfully",
  "data": {
    "id": 2,
    "license_plate": "16C-444.66",
    "description": "Updated Tractor 2",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

### DELETE /api/v1/tractor/:id
Delete a tractor.

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Tractor deleted successfully",
  "data": null
}
```

## Containers

### GET /api/v1/container
List all containers with pagination support.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 10)

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Containers retrieved successfully",
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

### POST /api/v1/container
Create a new container.

**Request Body:**
```json
{
  "category": "40DC"
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "message": "Container created successfully",
  "data": {
    "id": 3,
    "category": "40DC",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z"
  }
}
```

### PUT /api/v1/container/:id
Update an existing container.

**Request Body:**
```json
{
  "category": "45HC"
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Container updated successfully",
  "data": {
    "id": 3,
    "category": "45HC",
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

### DELETE /api/v1/container/:id
Delete a container.

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Container deleted successfully",
  "data": null
}
```

## Tractor Expenses

### GET /api/v1/tractor_expense
List all tractor expenses with pagination support.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 10)

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Tractor expenses retrieved successfully",
  "data": [
    {
      "id": 1,
      "tractor_id": 1,
      "vendor_name": "C�ng ty TNHH ABC",
      "expense_category_id": 1,
      "install_date": "2023-01-10T00:00:00Z",
      "expiry_date": "2024-01-10T00:00:00Z",
      "subtotal": 5000000,
      "tax_rate": 10,
      "total": 5500000,
      "payment_status": "PAID",
      "payment_proof": "https://drive.google.com/file/d/xxx",
      "created_by": 1,
      "created_at": "2023-01-15T08:30:00Z",
      "updated_at": "2023-01-15T08:30:00Z",
      "tractor": {
        "id": 1,
        "license_plate": "16C-333.44",
        "description": "Tractor 1"
      },
      "expense_category": {
        "id": 1,
        "name": "B�o d��ng"
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

### POST /api/v1/tractor_expense
Create a new tractor expense.

**Request Body:**
```json
{
  "tractor_id": 1,
  "vendor_name": "C�ng ty TNHH XYZ",
  "expense_category_id": 2,
  "install_date": "2023-02-01T00:00:00Z",
  "expiry_date": "2024-02-01T00:00:00Z",
  "subtotal": 3000000,
  "tax_rate": 10,
  "total": 3300000,
  "payment_status": "PENDING",
  "payment_proof": ""
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "message": "Tractor expense created successfully",
  "data": {
    "id": 2,
    "tractor_id": 1,
    "vendor_name": "C�ng ty TNHH XYZ",
    "expense_category_id": 2,
    "install_date": "2023-02-01T00:00:00Z",
    "expiry_date": "2024-02-01T00:00:00Z",
    "subtotal": 3000000,
    "tax_rate": 10,
    "total": 3300000,
    "payment_status": "PENDING",
    "payment_proof": "",
    "created_by": 1,
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z"
  }
}
```

### GET /api/v1/tractor_expense/:id
Get a single tractor expense with items.

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Tractor expense retrieved successfully",
  "data": {
    "id": 1,
    "tractor_id": 1,
    "vendor_name": "C�ng ty TNHH ABC",
    "expense_category_id": 1,
    "install_date": "2023-01-10T00:00:00Z",
    "expiry_date": "2024-01-10T00:00:00Z",
    "subtotal": 5000000,
    "tax_rate": 10,
    "total": 5500000,
    "payment_status": "PAID",
    "payment_proof": "https://drive.google.com/file/d/xxx",
    "created_by": 1,
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z",
    "tractor": {
      "id": 1,
      "license_plate": "16C-333.44",
      "description": "Tractor 1"
    },
    "expense_category": {
      "id": 1,
      "name": "B�o d��ng"
    },
    "created_by_user": {
      "id": 1,
      "username": "admin",
      "name": "Administrator"
    },
    "items": [
      {
        "id": 1,
        "tractor_expense_id": 1,
        "item_name": "Thay d�u �ng c�",
        "price": 1500000,
        "quantity": 2,
        "total": 3000000,
        "created_at": "2023-01-15T08:30:00Z",
        "updated_at": "2023-01-15T08:30:00Z"
      },
      {
        "id": 2,
        "tractor_expense_id": 1,
        "item_name": "L�c d�u",
        "price": 500000,
        "quantity": 2,
        "total": 1000000,
        "created_at": "2023-01-15T08:30:00Z",
        "updated_at": "2023-01-15T08:30:00Z"
      }
    ]
  }
}
```

### PUT /api/v1/tractor_expense/:id
Update an existing tractor expense.

**Request Body:**
```json
{
  "vendor_name": "C�ng ty TNHH XYZ Updated",
  "payment_status": "PAID",
  "payment_proof": "https://drive.google.com/file/d/yyy"
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Tractor expense updated successfully",
  "data": {
    "id": 2,
    "tractor_id": 1,
    "vendor_name": "C�ng ty TNHH XYZ Updated",
    "expense_category_id": 2,
    "install_date": "2023-02-01T00:00:00Z",
    "expiry_date": "2024-02-01T00:00:00Z",
    "subtotal": 3000000,
    "tax_rate": 10,
    "total": 3300000,
    "payment_status": "PAID",
    "payment_proof": "https://drive.google.com/file/d/yyy",
    "created_by": 1,
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

### DELETE /api/v1/tractor_expense/:id
Delete a tractor expense (and its items).

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Tractor expense deleted successfully",
  "data": null
}
```

### POST /api/v1/tractor_expense/:id/item
Add an item to a tractor expense.

**Request Body:**
```json
{
  "item_name": "B�nh �c quy",
  "price": 1200000,
  "quantity": 1,
  "total": 1200000
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "message": "Expense item created successfully",
  "data": {
    "id": 3,
    "tractor_expense_id": 1,
    "item_name": "B�nh �c quy",
    "price": 1200000,
    "quantity": 1,
    "total": 1200000,
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-15T08:30:00Z"
  }
}
```

### PUT /api/v1/tractor_expense/:id/item/:item_id
Update an expense item.

**Request Body:**
```json
{
  "item_name": "B�nh �c quy 12V",
  "price": 1300000,
  "quantity": 1,
  "total": 1300000
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Expense item updated successfully",
  "data": {
    "id": 3,
    "tractor_expense_id": 1,
    "item_name": "B�nh �c quy 12V",
    "price": 1300000,
    "quantity": 1,
    "total": 1300000,
    "created_at": "2023-01-15T08:30:00Z",
    "updated_at": "2023-01-16T10:00:00Z"
  }
}
```

### DELETE /api/v1/tractor_expense/:id/item/:item_id
Delete an expense item.

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Expense item deleted successfully",
  "data": null
}
```

## Error Response Format

All endpoints use the same error response format:

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

- 200 OK: Successful GET, PUT, DELETE requests
- 201 Created: Successful POST requests
- 400 Bad Request: Invalid input or request format
- 401 Unauthorized: Authentication required
- 404 Not Found: Resource not found
- 500 Internal Server Error: Server-side error



  GET /maintenance-items

  Sample Request:

  GET /maintenance-items?page=1&limit=10&license_plate=51H-12345&vendor_na
  me=Toyota&item_name=Oil&start_date=2024-01-01&end_date=2024-12-31
  Authorization: Bearer <jwt_token>

  Sample Response:

  {
    "status": "success",
    "message": "Maintenance items retrieved successfully",
    "data": [
      {
        "id": 1,
        "expense_id": 123,
        "tractor_id": 456,
        "trailer_id": null,
        "license_plate": "51H-12345",
        "vendor_name": "Toyota Service Center",
        "payment_status": "PAID",
        "expense_created_at": "2024-06-15T10:30:00Z",
        "item_name": "Engine Oil Change",
        "quantity": 2,
        "price": 500000,
        "total": 1000000,
        "install_date": "2024-06-15T14:00:00Z",
        "expiry_date": "2024-09-15T14:00:00Z",
        "remark": "Regular maintenance"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total_pages": 5,
      "records_count": 47
    }
  }

  Query Parameters:

  - page (int): Page number (default: 1)
  - limit (int): Items per page (default: 10)
  - license_plate (string): Filter by vehicle license plate
  - vendor_name (string): Filter by vendor name
  - item_name (string): Filter by maintenance item name
  - start_date (string): Filter by date range start (YYYY-MM-DD)
  - end_date (string): Filter by date range end (YYYY-MM-DD)
