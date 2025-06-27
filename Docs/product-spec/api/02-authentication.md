# Authentication API

## Overview
Authentication endpoints for user login, token refresh, and profile management.

---

## Login
Authenticate user with username and password.

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Đăng nhập thành công",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@nepocorp.com",
      "name": "Administrator",
      "role": "admin"
    }
  }
}
```

---

## Refresh Token
Refresh the access token using a refresh token.

**Endpoint:** `POST /api/v1/auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Làm mới token thành công",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Get Profile
Get the current user's profile information.

**Endpoint:** `GET /api/v1/auth/profile`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Lấy thông tin hồ sơ thành công",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@nepocorp.com",
    "name": "Administrator",
    "role": "admin",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```