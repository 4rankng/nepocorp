
### 3. containers
Stores container categories/types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| category | VARCHAR(50) | NOT NULL | Container type (e.g., "20DC", "40HC") |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |

### 4. tractors
Stores tractor vehicle information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| license_plate | VARCHAR(50) | NOT NULL, UNIQUE | Vehicle license plate |
| description | TEXT | NULL | Additional description |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |

**Indexes:**
- `uk_tractors_license_plate` UNIQUE on (license_plate)
- `idx_tractors_license_plate` on (license_plate)

### 5. trailers
Stores trailer vehicle information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| license_plate | VARCHAR(50) | NOT NULL, UNIQUE | Vehicle license plate |
| description | TEXT | NULL | Additional description |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |
