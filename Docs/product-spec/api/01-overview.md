# Vehicle Expense & Maintenance Management API Documentation

## Overview

This API provides endpoints for managing vehicle maintenance and expenses for tractors and trailers. The system includes both general expense management and a dedicated maintenance tracking system. All endpoints require JWT authentication and return responses in a consistent JSON format.

### Key Features
- **Expense Management**: Track expenses for tractors and trailers with detailed items
- **Maintenance Tracking**: Dedicated maintenance records with install/expiry dates
- **User Audit Trail**: Track who created and last updated records
- **Flexible Filtering**: Search by license plate, vendor, date ranges, and more
- **JWT Authentication**: Secure access with role-based permissions

## Base URL
```
/api/v1
```

## Authentication
All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
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
- `200 OK` - Successful GET, PUT, DELETE requests
- `201 Created` - Successful POST requests
- `400 Bad Request` - Invalid input or request format
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server-side error

## Common Error Codes

| Code | Description |
|------|-------------|
| 4001 | Bad Request - Invalid input or validation error |
| 4004 | Not Found - Resource not found |
| 4010 | Unauthorized - Authentication required |
| 5000 | Internal Server Error |

### Validation Error Example
```json
{
  "status": "error",
  "message": "Invalid input provided",
  "errors": {
    "code": 4001,
    "message": "Either tractor_id or trailer_id is required (but not both)"
  }
}
```

### Not Found Error Example
```json
{
  "status": "error",
  "message": "Expense not found",
  "errors": {
    "code": 4004,
    "message": "Expense with ID 123 not found"
  }
}
```