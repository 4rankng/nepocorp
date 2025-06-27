# Password Hashing Setup

This document explains how to properly set up password hashing for the Nepo Corp backend with mock data.

## Overview

The backend supports two password hashing methods:

1. **Production Method**: HMAC-SHA256 + bcrypt (secure, recommended for production)
2. **Development Method**: Simple SHA256 (for SQL mock data compatibility)

## Setting Up Mock Data with Proper Password Hashes

### Step 1: Configure Environment Variables

Make sure your `.env` file contains:

```bash
HASH_SECRET=your-hash-secret-change-in-production
HASH_SALT=your-hash-salt-change-in-production
```

### Step 2: Generate Mock Data with Proper Hashes

#### Option A: Using the Shell Script (Recommended)

```bash
cd backend
./scripts/prepare-mock-data.sh
```

This will:
- Read your `.env` file
- Replace `{{HASH_SECRET}}` and `{{HASH_SALT}}` placeholders
- Generate `scripts/mock-data-processed.sql` with proper hashes

#### Option B: Manual SQL Replacement

1. Edit `scripts/mock-data.sql`
2. Replace `{{HASH_SECRET}}` with your actual `HASH_SECRET` value
3. Replace `{{HASH_SALT}}` with your actual `HASH_SALT` value

#### Option C: Verify Hashes (for debugging)

To verify that password hashes are generated correctly:

1. Edit `scripts/mock-data.sql`
2. Uncomment the "Password Hash Verification" section
3. Run the script to see the generated hashes

### Step 3: Load Mock Data

```bash
# If you used the shell script:
mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME < scripts/mock-data-processed.sql

# If you manually edited the original file:
mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME < scripts/mock-data.sql
```

## Default Test User Credentials

| Username  | Password    | Role     |
|-----------|-------------|----------|
| admin     | admin123    | admin    |
| manager1  | manager123  | manager  |
| driver1   | driver123   | driver   |
| driver2   | driver123   | driver   |
| mechanic1 | mechanic123 | mechanic |

## How Password Verification Works

### Development Mode (SQL-generated hashes)
- Password stored as: `HEX(SHA256(password + salt + secret))`
- Backend detects 64-character hex strings as development hashes
- Simple SHA256 comparison for verification

### Production Mode (Go-generated hashes)
- Password stored as: bcrypt hash of HMAC-SHA256(password + salt, secret)
- Full HMAC + bcrypt verification
- More secure, recommended for production

## Security Notes

1. **Always change default HASH_SECRET and HASH_SALT in production**
2. **Use environment variables, never commit secrets to git**
3. **Development mode is less secure, only use for testing**
4. **In production, create users through the API to get proper bcrypt hashes**

## Troubleshooting

### "Password mismatch" errors
1. Verify your `.env` HASH_SECRET and HASH_SALT values
2. Make sure placeholders were properly replaced in SQL
3. Check that the password hash length is exactly 64 characters for development mode

### "Invalid password hash" errors
1. The hash might be malformed
2. Re-run the mock data generation process
3. Verify database connection and SQL execution

## Converting Development Hashes to Production

To convert existing development hashes to production-grade hashes:

1. Create new users through the API endpoints (recommended)
2. Or update existing users by calling the `HashPassword` function in Go
3. The backend will automatically detect and handle both hash types during the transition