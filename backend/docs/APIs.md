# Backend APIs

This document provides a list of currently available APIs in the backend with sample requests and responses.

## Authentication

### Login

- **Endpoint:** `POST /api/v1/auth/login`
- **Description:** Authenticates a user and returns a JWT token.
- **Request Body:**
  ```json
  {
    "username": "testuser",
    "password": "password"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Login successful",
    "data": {
      "token": "jwt_token",
      "refresh_token": "refresh_token",
      "user": {
        "id": 1,
        "username": "testuser",
        "email": "testuser@example.com",
        "name": "Test User",
        "role": "user"
      }
    }
  }
  ```

### Refresh Token

- **Endpoint:** `POST /api/v1/auth/refresh`
- **Description:** Refreshes a user's JWT token.
- **Request Body:**
  ```json
  {
    "refresh_token": "refresh_token"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Token refreshed successfully",
    "data": {
      "token": "new_jwt_token",
      "refresh_token": "new_refresh_token"
    }
  }
  ```

### Get Profile

- **Endpoint:** `GET /api/v1/auth/profile`
- **Description:** Retrieves the authenticated user's profile.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "User profile retrieved successfully",
    "data": {
      "id": 1,
      "username": "testuser",
      "email": "testuser@example.com",
      "name": "Test User",
      "role": "user",
      "is_active": true,
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:00:00Z"
    }
  }
  ```

## Expense Categories

### List Expense Categories

- **Endpoint:** `GET /api/v1/expense_category`
- **Description:** Retrieves a paginated list of expense categories.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Expense categories retrieved successfully",
    "data": [
      {
        "id": 1,
        "name": "Fuel",
        "created_at": "2025-06-26T10:00:00Z",
        "updated_at": "2025-06-26T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "per_page": 10,
      "total_records": 1
    }
  }
  ```

### Create Expense Category

- **Endpoint:** `POST /api/v1/expense_category`
- **Description:** Creates a new expense category.
- **Request Body:**
  ```json
  {
    "name": "Maintenance"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Expense category created successfully",
    "data": {
      "id": 2,
      "name": "Maintenance",
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:00:00Z"
    }
  }
  ```

### Update Expense Category

- **Endpoint:** `PUT /api/v1/expense_category/:id`
- **Description:** Updates an existing expense category.
- **Request Body:**
  ```json
  {
    "name": "General Maintenance"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Expense category updated successfully",
    "data": {
      "id": 2,
      "name": "General Maintenance",
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:05:00Z"
    }
  }
  ```

### Delete Expense Category

- **Endpoint:** `DELETE /api/v1/expense_category/:id`
- **Description:** Deletes an expense category.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Expense category deleted successfully",
    "data": null
  }
  ```

## Containers

### List Containers

- **Endpoint:** `GET /api/v1/container`
- **Description:** Retrieves a paginated list of containers.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Containers retrieved successfully",
    "data": [
      {
        "id": 1,
        "category": "20ft",
        "created_at": "2025-06-26T10:00:00Z",
        "updated_at": "2025-06-26T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "per_page": 10,
      "total_records": 1
    }
  }
  ```

### Create Container

- **Endpoint:** `POST /api/v1/container`
- **Description:** Creates a new container.
- **Request Body:**
  ```json
  {
    "category": "40ft"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Container created successfully",
    "data": {
      "id": 2,
      "category": "40ft",
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:00:00Z"
    }
  }
  ```

### Update Container

- **Endpoint:** `PUT /api/v1/container/:id`
- **Description:** Updates an existing container.
- **Request Body:**
  ```json
  {
    "category": "45ft"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Container updated successfully",
    "data": {
      "id": 2,
      "category": "45ft",
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:05:00Z"
    }
  }
  ```

### Delete Container

- **Endpoint:** `DELETE /api/v1/container/:id`
- **Description:** Deletes a container.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Container deleted successfully",
    "data": null
  }
  ```

## Tractors

### List Tractors

- **Endpoint:** `GET /api/v1/tractor`
- **Description:** Retrieves a paginated list of tractors.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Tractors retrieved successfully",
    "data": [
      {
        "id": 1,
        "license_plate": "T-12345",
        "description": "Main tractor",
        "created_at": "2025-06-26T10:00:00Z",
        "updated_at": "2025-06-26T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "per_page": 10,
      "total_records": 1
    }
  }
  ```

### Create Tractor

- **Endpoint:** `POST /api/v1/tractor`
- **Description:** Creates a new tractor.
- **Request Body:**
  ```json
  {
    "license_plate": "T-67890",
    "description": "New tractor"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Tractor created successfully",
    "data": {
      "id": 2,
      "license_plate": "T-67890",
      "description": "New tractor",
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:00:00Z"
    }
  }
  ```

### Update Tractor

- **Endpoint:** `PUT /api/v1/tractor/:id`
- **Description:** Updates an existing tractor.
- **Request Body:**
  ```json
  {
    "license_plate": "T-67890",
    "description": "Updated tractor description"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Tractor updated successfully",
    "data": {
      "id": 2,
      "license_plate": "T-67890",
      "description": "Updated tractor description",
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:05:00Z"
    }
  }
  ```

### Delete Tractor

- **Endpoint:** `DELETE /api/v1/tractor/:id`
- **Description:** Deletes a tractor.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Tractor deleted successfully",
    "data": null
  }
  ```

## Trailers

### List Trailers

- **Endpoint:** `GET /api/v1/trailer`
- **Description:** Retrieves a paginated list of trailers.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Trailers retrieved successfully",
    "data": [
      {
        "id": 1,
        "license_plate": "TR-12345",
        "description": "Main trailer",
        "created_at": "2025-06-26T10:00:00Z",
        "updated_at": "2025-06-26T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "per_page": 10,
      "total_records": 1
    }
  }
  ```

### Create Trailer

- **Endpoint:** `POST /api/v1/trailer`
- **Description:** Creates a new trailer.
- **Request Body:**
  ```json
  {
    "license_plate": "TR-67890",
    "description": "New trailer"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Trailer created successfully",
    "data": {
      "id": 2,
      "license_plate": "TR-67890",
      "description": "New trailer",
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:00:00Z"
    }
  }
  ```

### Update Trailer

- **Endpoint:** `PUT /api/v1/trailer/:id`
- **Description:** Updates an existing trailer.
- **Request Body:**
  ```json
  {
    "license_plate": "TR-67890",
    "description": "Updated trailer description"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Trailer updated successfully",
    "data": {
      "id": 2,
      "license_plate": "TR-67890",
      "description": "Updated trailer description",
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:05:00Z"
    }
  }
  ```

### Delete Trailer

- **Endpoint:** `DELETE /api/v1/trailer/:id`
- **Description:** Deletes a trailer.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Trailer deleted successfully",
    "data": null
  }
  ```

## Expenses

### List Expenses

- **Endpoint:** `GET /api/v1/expense`
- **Description:** Retrieves a paginated list of expenses.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Expenses retrieved successfully",
    "data": [
      {
        "id": 1,
        "tractor_id": 1,
        "trailer_id": null,
        "expense_category_id": 1,
        "vendor_name": "Gas Station",
        "payment_status": "Paid",
        "payment_proof": "receipt.jpg",
        "remark": "Fuel for trip",
        "currency": "USD",
        "subtotal": 100,
        "tax_rate": 10,
        "total": 110,
        "created_by": 1,
        "created_at": "2025-06-26T10:00:00Z",
        "updated_at": "2025-06-26T10:00:00Z",
        "items": []
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "per_page": 10,
      "total_records": 1
    }
  }
  ```

### Get Expense by ID

- **Endpoint:** `GET /api/v1/expense/:id`
- **Description:** Retrieves a single expense by its ID.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Expense retrieved successfully",
    "data": {
      "id": 1,
      "tractor_id": 1,
      "trailer_id": null,
      "expense_category_id": 1,
      "vendor_name": "Gas Station",
      "payment_status": "Paid",
      "payment_proof": "receipt.jpg",
      "remark": "Fuel for trip",
      "currency": "USD",
      "subtotal": 100,
      "tax_rate": 10,
      "total": 110,
      "created_by": 1,
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:00:00Z",
      "items": [
        {
          "id": 1,
          "expense_id": 1,
          "item_name": "Gasoline",
          "price": 50,
          "quantity": 2,
          "total": 100,
          "install_date": "2025-06-26T10:00:00Z",
          "expiry_date": null
        }
      ]
    }
  }
  ```

### Create Expense

- **Endpoint:** `POST /api/v1/expense`
- **Description:** Creates a new expense.
- **Request Body:**
  ```json
  {
    "tractor_id": 1,
    "expense_category_id": 1,
    "vendor_name": "Gas Station",
    "payment_status": "Paid",
    "currency": "USD",
    "subtotal": 100,
    "tax_rate": 10,
    "total": 110,
    "items": [
      {
        "item_name": "Gasoline",
        "price": 50,
        "quantity": 2,
        "total": 100
      }
    ]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Expense created successfully",
    "data": {
      "id": 2,
      "tractor_id": 1,
      "trailer_id": null,
      "expense_category_id": 1,
      "vendor_name": "Gas Station",
      "payment_status": "Paid",
      "payment_proof": "",
      "remark": "",
      "currency": "USD",
      "subtotal": 100,
      "tax_rate": 10,
      "total": 110,
      "created_by": 1,
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:00:00Z",
      "items": [
        {
          "id": 2,
          "expense_id": 2,
          "item_name": "Gasoline",
          "price": 50,
          "quantity": 2,
          "total": 100,
          "install_date": null,
          "expiry_date": null
        }
      ]
    }
  }
  ```

### Update Expense

- **Endpoint:** `PUT /api/v1/expense/:id`
- **Description:** Updates an existing expense.
- **Request Body:**
  ```json
  {
    "vendor_name": "Updated Gas Station"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Expense updated successfully",
    "data": {
      "id": 1,
      "vendor_name": "Updated Gas Station"
    }
  }
  ```

### Delete Expense

- **Endpoint:** `DELETE /api/v1/expense/:id`
- **Description:** Deletes an expense.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Expense deleted successfully",
    "data": null
  }
  ```

### Create Expense Item

- **Endpoint:** `POST /api/v1/expense/:id/item`
- **Description:** Creates a new item for an expense.
- **Request Body:**
  ```json
  {
    "item_name": "Oil",
    "price": 20,
    "quantity": 1,
    "total": 20
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Expense item created successfully",
    "data": {
      "id": 3,
      "expense_id": 1,
      "item_name": "Oil",
      "price": 20,
      "quantity": 1,
      "total": 20
    }
  }
  ```

### Update Expense Item

- **Endpoint:** `PUT /api/v1/expense/:id/item/:item_id`
- **Description:** Updates an existing expense item.
- **Request Body:**
  ```json
  {
    "price": 25
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Expense item updated successfully",
    "data": {
      "id": 3,
      "price": 25
    }
  }
  ```

### Delete Expense Item

- **Endpoint:** `DELETE /api/v1/expense/:id/item/:item_id`
- **Description:** Deletes an expense item.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Expense item deleted successfully",
    "data": null
  }
  ```

## Settings

### Get Setting by Key

- **Endpoint:** `GET /api/v1/settings/:key`
- **Description:** Retrieves a setting by its key.
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Setting retrieved successfully",
    "data": {
      "key": "tax_rate",
      "value": "10",
      "last_updated_by": "admin",
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:00:00Z"
    }
  }
  ```

### Update Setting by Key

- **Endpoint:** `PUT /api/v1/settings/:key`
- **Description:** Updates a setting by its key.
- **Request Body:**
  ```json
  {
    "value": "12"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Setting updated successfully",
    "data": {
      "key": "tax_rate",
      "value": "12",
      "last_updated_by": "admin",
      "created_at": "2025-06-26T10:00:00Z",
      "updated_at": "2025-06-26T10:05:00Z"
    }
  }
  ```
