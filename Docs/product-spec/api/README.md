# Vehicle Expense & Maintenance Management API

This directory contains the complete API documentation for the Vehicle Expense & Maintenance Management system.

## Table of Contents

### 📚 Documentation Structure

1. **[Overview](01-overview.md)** - API introduction, response formats, and error handling
2. **[Authentication](02-authentication.md)** - Login, token refresh, and profile endpoints
3. **[Settings](03-settings.md)** - System configuration management
4. **[Expense Categories](04-expense-categories.md)** - Category management for classifying expenses
5. **[Vehicles](05-vehicles.md)** - Tractor, trailer, and container management
6. **[Expenses](06-expenses.md)** - Main expense tracking functionality
7. **[Expense Items](07-expense-items.md)** - Individual item management within expenses
8. **[Maintenance](08-maintenance.md)** - Dedicated maintenance tracking system
9. **[Implementation Notes](09-implementation-notes.md)** - Technical details and architecture notes

## Quick Links

### 🔐 Authentication Required
All endpoints except `/api/v1/auth/login` and `/api/v1/auth/refresh` require JWT authentication.

### 🚀 Getting Started
1. Start with the [Overview](01-overview.md) to understand the API structure
2. Use [Authentication](02-authentication.md) endpoints to obtain access tokens
3. Explore domain-specific endpoints based on your needs

### 📊 Key Features
- **Dual tracking system**: General expenses and dedicated maintenance records
- **Vehicle management**: Track tractors, trailers, and containers
- **Detailed audit trails**: User tracking for all modifications
- **Flexible filtering**: Search and filter across multiple dimensions
- **Pagination support**: Efficient data retrieval for large datasets

### 🛠️ Base Configuration
- **Base URL**: `/api/v1`
- **Authentication**: Bearer token in Authorization header
- **Content Type**: `application/json`
- **Currency**: VND (Vietnamese Dong)

### 📝 Common Patterns

#### Pagination
```
GET /api/v1/resource?page=1&limit=10
```

#### Authentication Header
```
Authorization: Bearer <jwt_token>
```

#### Date Formats
- Simple: `"2024-06-24"`
- ISO: `"2024-06-24T10:00:00Z"`

### 🔗 Related Resources
- Backend repository: `/backend`
- Frontend application: `/frontend`
- Database migrations: `/backend/migrations`

## Need Help?
- Check [Implementation Notes](09-implementation-notes.md) for technical details
- Review [Overview](01-overview.md) for error codes and response formats
- Ensure proper [Authentication](02-authentication.md) for protected endpoints