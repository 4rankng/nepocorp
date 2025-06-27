
## Tables

### 1. users
Stores user account information for authentication and authorization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| username | VARCHAR(255) | NOT NULL, UNIQUE | Login username |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User email address |
| password | VARCHAR(255) | NOT NULL | Hashed password |
| name | VARCHAR(255) | NULL | Display name |
| role | VARCHAR(50) | NOT NULL, DEFAULT 'driver' | User role (admin, driver, etc.) |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |
| deleted_at | TIMESTAMP | NULL | Not used - no soft delete |

**Indexes:**
- `idx_username` on (username)
- `idx_email` on (email)
- `idx_deleted_at` on (deleted_at)


### 9. activity_logs
Tracks user activities for auditing purposes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| user_id | BIGINT UNSIGNED | NOT NULL, FK → users(id) | User who performed the action |
| action | VARCHAR(100) | NOT NULL | Action type (e.g., CREATE, UPDATE, DELETE) |
| resource | VARCHAR(100) | NULL | Resource type (e.g., expense, tractor) |
| resource_id | VARCHAR(100) | NULL | ID of the affected resource |
| ip_address | VARCHAR(45) | NULL | Client IP address |
| user_agent | TEXT | NULL | Client user agent |
| request_data | JSON | NULL | Request payload |
| response_status | INT | NULL | HTTP response status code |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Action timestamp |

**Foreign Keys:**
- `user_id` → users(id) ON DELETE CASCADE

**Indexes:**
- `idx_user_id` on (user_id)
- `idx_created_at` on (created_at)
- `idx_action` on (action)
- `idx_resource` on (resource)
- `idx_resource_id` on (resource_id)


### 8. settings
Stores system-wide configuration settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| key | VARCHAR(255) | NOT NULL, UNIQUE | Setting key (e.g., "tax_rate") |
| value | TEXT | NOT NULL | Setting value |
| last_updated_by | BIGINT UNSIGNED | NOT NULL, FK → users(id) | User who last updated |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |

**Foreign Keys:**
- `last_updated_by` → users(id) ON DELETE RESTRICT

**Indexes:**
- `idx_key` on (key)

**Default Data:**
- Key: "tax_rate", Value: "10"
