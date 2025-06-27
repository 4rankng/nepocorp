# Implementation Notes

## Data Model Architecture

### Dual Tracking System
The backend implements both a general expense system and a dedicated maintenance tracking system:

1. **Expenses**: Track general costs with multiple items per expense
   - Support for both tractors and trailers
   - Multiple items per expense
   - Payment status tracking
   - File attachment support for payment proofs

2. **Maintenance**: Track specific maintenance activities with install/expiry dates
   - Standalone records with expense references
   - Install and expiry date tracking
   - Tax calculation support
   - Vehicle-specific tracking via license plate

### Maintenance vs Expense Items
- **Maintenance records** are standalone entities with `expense_id` references
- **Expense items** are nested resources under expenses
- Both support similar fields but serve different purposes

## Key Implementation Details

### Backend Initialization
The backend automatically creates a "Bảo dưỡng" expense category with ID 1 if it doesn't exist.

### User Tracking
All records include audit trails:
- `created_by` - User ID who created the record
- `last_updated_by` - Username of the user who last modified the record

### Data Validation
1. **Expenses**:
   - Require either `tractor_id` OR `trailer_id` (but not both)
   - Must have at least one item when creating
   - Payment status must be valid enum value

2. **Maintenance**:
   - Require valid `expense_id` references
   - All monetary values must be positive integers
   - License plate and vendor information required

3. **Common**:
   - Flexible date parsing supports both YYYY-MM-DD and ISO datetime formats
   - All monetary values stored as integers

### Automatic Calculations
- **Maintenance**: `total = (price * quantity) * (1 + tax_rate/100)`
- **Expenses**: Manual subtotal/total management with tax calculations

## Technical Details

### Currency
All monetary values are stored as integers in VND (Vietnamese Dong).

### Date Handling
Supports flexible date input:
- Simple date format: `"2024-06-24"`
- ISO datetime format: `"2024-06-24T10:00:00Z"`

### Pagination
All list endpoints support pagination with `page` and `limit` parameters:
- Default page: 1
- Default limit: 10
- Response includes total pages and record count

### Authentication
- JWT tokens must be included as Bearer tokens in the Authorization header
- Tokens include user ID, username, and role claims
- Token validation checks expiration and issuer

### Error Handling
Consistent error structure with both HTTP status codes and internal error codes:
- 4xxx codes for client errors
- 5xxx codes for server errors
- Detailed error messages for debugging

### Middleware Stack
1. Recovery middleware for panic handling
2. Custom logger for request/response logging
3. CORS for cross-origin requests
4. Activity logger for audit trails
5. Rate limiting for API protection
6. JWT authentication for protected routes

## Database Considerations

### Relationships
- Expenses can belong to either a tractor OR trailer (enforced at application level)
- Expense items belong to expenses (cascade delete)
- Maintenance records reference expenses but are independent entities
- User relationships tracked for audit purposes

### Performance
- Indexes on frequently queried fields (license_plate, vendor_name)
- Pagination to limit result set sizes
- Preloading of related entities where appropriate

### Data Integrity
- Foreign key constraints where applicable
- Application-level validation before database operations
- Transaction support for multi-step operations