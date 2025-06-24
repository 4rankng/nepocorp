# Authentication API Documentation

## Overview

The authentication system uses username/password authentication with JWT tokens for session management. All users have role-based access control (RBAC) with roles stored in the database.

## API Endpoints

### 1. Login

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
    "username": "string",
    "password": "string"
}
```

**Response:**
```json
{
    "status": "success",
    "message": "Login successful",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
        "user": {
            "id": 1,
            "username": "johndoe",
            "email": "john@example.com",
            "name": "John Doe",
            "role": "driver"
        }
    }
}
```

**Error Response:**
```json
{
    "status": "error",
    "message": "Invalid username or password",
    "errors": {
        "code": 4009,
        "message": "Invalid username or password"
    }
}
```

### 2. Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh`

**Request Body:**
```json
{
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
    "status": "success",
    "message": "Token refreshed successfully",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

### 3. Get User Profile

**Endpoint:** `GET /api/v1/auth/profile`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
    "status": "success",
    "message": "Profile retrieved successfully",
    "data": {
        "id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "name": "John Doe",
        "role": "driver",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
}
```

## Authentication Flow

1. **Login**: User provides username and password
2. **Server Validation**:
   - Verify user exists and is active
   - Verify password using bcrypt
   - Generate JWT access token (24 hour expiry)
   - Generate JWT refresh token (7 day expiry)
3. **Authenticated Requests**: Include JWT token in Authorization header
4. **Token Refresh**: Use refresh token to get new access token when expired

## User Roles

The system supports the following roles:
- `admin` - Full system access
- `driver` - Driver-specific features
- `accountant` - Financial management access
- `handler` - Container/shipment handling

## Security Features

1. **Password Storage**:
   - Passwords are hashed using HMAC-SHA256 with configurable secret and salt
   - Final hash is created using bcrypt for additional security
   - Never store plain text passwords
2. **Token Expiration**:
   - Access tokens expire in 24 hours
   - Refresh tokens expire in 7 days
3. **JWT Claims**: Tokens include user ID, username, email, and role
4. **Rate Limiting**: Login endpoints are rate-limited to prevent brute force attacks

## Initial Setup

To create an admin account, use the init_db script:

```bash
# For local development (creates admin/admin)
cd backend/scripts
go run init_db.go local

# For production (custom credentials)
cd backend/scripts
go run init_db.go -user=adminuser -pass=SecurePassword123!
```

## Error Codes

| Code | Description |
|------|-------------|
| 4001 | Bad request - Invalid input |
| 4009 | Invalid credentials |
| 4010 | User account is not active |
| 4006 | Unauthorized - Invalid or missing token |
| 5001 | Internal server error |

## Frontend Integration

### Storing Tokens

```javascript
// After successful login
localStorage.setItem('access_token', response.data.token);
localStorage.setItem('refresh_token', response.data.refresh_token);
```

### Making Authenticated Requests

```javascript
fetch('/api/v1/auth/profile', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
});
```

### Handling Token Expiration

```javascript
// If request returns 401, try to refresh token
async function refreshAccessToken() {
    const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            refresh_token: localStorage.getItem('refresh_token')
        })
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.data.token);
        localStorage.setItem('refresh_token', data.data.refresh_token);
        return data.data.token;
    }

    // If refresh fails, redirect to login
    window.location.href = '/login';
}
```

The failed login responses in /Users/dev/Documents/clients/nepocorp/backend/handlers/auth_handler.go are:

  Invalid credentials (lines 64-66, 76-78):
  {
    "error": "Invalid credentials",
    "details": {
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid username or password"
    }
  }

  Inactive user (lines 83-85):
  {
    "error": "User not active",
    "details": {
      "code": "USER_NOT_ACTIVE",
      "message": "User account is not active"
    }
  }

  Invalid input (lines 55-57):
  {
    "error": "Invalid input",
    "details": {
      "code": "BAD_REQUEST",
      "message": "[validation error details]"
    }
  }
