# Database Initialization Scripts

## init_db.go

This script initializes the database with an admin account.

### Prerequisites

Make sure you have:
1. Database running and accessible
2. `.env` file configured in the parent directory (or environment variables set)
3. `HASH_SECRET` and `HASH_SALT` configured in environment

### Usage

#### Option 1: Create default admin account (admin/admin)

```bash
cd scripts
go run init_db.go local
```

This creates:
- Username: `admin`
- Password: `admin`
- Email: `admin@nepocorp.com`
- Role: `admin`

**⚠️ WARNING: Only use this for local development!**

#### Option 2: Create custom admin account

```bash
cd scripts
go run init_db.go -user=customadmin -pass=SecurePassword123!
```

This creates:
- Username: `customadmin`
- Password: `SecurePassword123!`
- Email: `customadmin@nepocorp.com`
- Role: `admin`

### Features

- Checks if user already exists before creating
- Uses the same password hashing mechanism as the application
- Auto-migrates the User table if needed
- Provides feedback on successful creation

### Security Notes

1. **Never use admin/admin in production**
2. Always use strong passwords for production admin accounts
3. Ensure `HASH_SECRET` and `HASH_SALT` are properly configured and kept secure
4. Consider running this script only during initial setup and removing it from production deployments