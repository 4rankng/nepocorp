#!/bin/bash

# ================================================================
# Nepo Corp Backend Mock Data Preparation and Insertion Script
# Automatically processes and inserts mock data into database
# ================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "scripts/mock-data.sql" ]; then
    print_error "mock-data.sql not found in scripts/ directory"
    print_error "Please run this script from the backend root directory"
    exit 1
fi

# Load .env file if it exists
if [ -f .env ]; then
    print_info "Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
else
    print_warning ".env file not found, using default values"
    export DB_HOST="localhost"
    export DB_PORT="3306"
    export DB_USER="nepo"
    export DB_PASSWORD="nepo_password"
    export DB_NAME="nepo"
    export HASH_SECRET="your-hash-secret-change-in-production"
    export HASH_SALT="your-hash-salt-change-in-production"
fi

# Check if required environment variables are set
if [ -z "$HASH_SECRET" ]; then
    print_error "HASH_SECRET not set in environment"
    exit 1
fi

if [ -z "$HASH_SALT" ]; then
    print_error "HASH_SALT not set in environment"
    exit 1
fi

if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    print_error "Database connection variables not properly set"
    print_error "Required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    exit 1
fi

# File paths
INPUT_FILE="scripts/mock-data.sql"
OUTPUT_FILE="scripts/mock-data-processed.sql"

print_info "Processing mock data SQL file..."
print_info "HASH_SECRET: ${HASH_SECRET:0:10}... (truncated for security)"
print_info "HASH_SALT: ${HASH_SALT:0:10}... (truncated for security)"

# Replace placeholders with actual values
sed "s/{{HASH_SECRET}}/$HASH_SECRET/g; s/{{HASH_SALT}}/$HASH_SALT/g" "$INPUT_FILE" > "$OUTPUT_FILE"

print_success "Mock data file processed successfully: $OUTPUT_FILE"

# Check if Docker container is running
print_info "Checking database connection..."

# Try different connection methods
MYSQL_CMD=""
CONNECTION_SUCCESS=false

# Method 1: Try Docker container first
if docker ps | grep -q "nepo_mysql"; then
    print_info "Found Docker container 'nepo_mysql', using Docker exec..."
    if docker exec nepo_mysql mysql -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
        MYSQL_CMD="docker exec -i nepo_mysql mysql --default-character-set=utf8mb4 -u$DB_USER -p$DB_PASSWORD $DB_NAME"
        CONNECTION_SUCCESS=true
        print_success "Connected via Docker container"
    fi
fi

# Method 2: Try direct MySQL connection
if [ "$CONNECTION_SUCCESS" = false ]; then
    print_info "Trying direct MySQL connection..."
    if command -v mysql >/dev/null 2>&1; then
        if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
            MYSQL_CMD="mysql --default-character-set=utf8mb4 -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD $DB_NAME"
            CONNECTION_SUCCESS=true
            print_success "Connected via direct MySQL"
        fi
    else
        print_warning "MySQL client not found in PATH"
    fi
fi

# Method 3: Try without port specification
if [ "$CONNECTION_SUCCESS" = false ]; then
    print_info "Trying MySQL connection without port..."
    if command -v mysql >/dev/null 2>&1; then
        if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
            MYSQL_CMD="mysql --default-character-set=utf8mb4 -h$DB_HOST -u$DB_USER -p$DB_PASSWORD $DB_NAME"
            CONNECTION_SUCCESS=true
            print_success "Connected via MySQL without port"
        fi
    fi
fi

if [ "$CONNECTION_SUCCESS" = false ]; then
    print_error "Could not connect to database"
    print_error "Please ensure:"
    print_error "  1. Database is running (try 'make db' or 'docker compose up -d mysql')"
    print_error "  2. Database credentials are correct in .env file"
    print_error "  3. MySQL client is installed or Docker container is accessible"
    print_info ""
    print_info "Manual insertion command:"
    print_info "mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD $DB_NAME < $OUTPUT_FILE"
    exit 1
fi

# Clear existing data first
print_info "Clearing existing data from all tables..."
print_info "Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Create a cleanup SQL script
CLEANUP_FILE="scripts/cleanup-data.sql"
cat > "$CLEANUP_FILE" << 'EOF'
-- ================================================================
-- Clear all existing data from tables (in proper order due to foreign keys)
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Clear data in reverse dependency order
DELETE FROM financial_ledgers;
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM invoice_categories;
DELETE FROM maintenance;
DELETE FROM expense_items;
DELETE FROM expenses;
DELETE FROM expense_categories;
DELETE FROM jobs;
DELETE FROM fuel_standards;
DELETE FROM routes;
DELETE FROM trailers;
DELETE FROM tractors;
DELETE FROM containers;
DELETE FROM partners;
DELETE FROM customers;
DELETE FROM activity_logs;
DELETE FROM settings;
DELETE FROM users;

-- Reset auto-increment counters
ALTER TABLE financial_ledgers AUTO_INCREMENT = 1;
ALTER TABLE invoice_items AUTO_INCREMENT = 1;
ALTER TABLE invoices AUTO_INCREMENT = 1;
ALTER TABLE invoice_categories AUTO_INCREMENT = 1;
ALTER TABLE maintenance AUTO_INCREMENT = 1;
ALTER TABLE expense_items AUTO_INCREMENT = 1;
ALTER TABLE expenses AUTO_INCREMENT = 1;
ALTER TABLE expense_categories AUTO_INCREMENT = 1;
ALTER TABLE jobs AUTO_INCREMENT = 1;
ALTER TABLE fuel_standards AUTO_INCREMENT = 1;
ALTER TABLE routes AUTO_INCREMENT = 1;
ALTER TABLE trailers AUTO_INCREMENT = 1;
ALTER TABLE tractors AUTO_INCREMENT = 1;
ALTER TABLE containers AUTO_INCREMENT = 1;
ALTER TABLE partners AUTO_INCREMENT = 1;
ALTER TABLE customers AUTO_INCREMENT = 1;
ALTER TABLE activity_logs AUTO_INCREMENT = 1;
ALTER TABLE settings AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
EOF

# Execute cleanup
if $MYSQL_CMD < "$CLEANUP_FILE"; then
    print_success "Existing data cleared successfully"
else
    print_error "Failed to clear existing data"
    rm -f "$CLEANUP_FILE" "$OUTPUT_FILE"
    exit 1
fi

# Clean up the cleanup file
rm -f "$CLEANUP_FILE"

# Insert mock data into database
print_info "Inserting fresh mock data into database..."

if $MYSQL_CMD < "$OUTPUT_FILE"; then
    print_success "Mock data inserted successfully!"
    print_info ""
    print_success "✅ Database populated with comprehensive mock data for all tables:"
    print_info "   • Users: 5 (admin, manager, 2 drivers, mechanic)"
    print_info "   • Customers: 5 companies with contact details"
    print_info "   • Partners: 5 partner companies"
    print_info "   • Vehicles: 5 tractors + 5 trailers with specifications"
    print_info "   • Routes: 5 standard routes with pricing"
    print_info "   • Jobs: 8 transport jobs with different statuses"
    print_info "   • Expenses: 10 expenses with detailed line items"
    print_info "   • Invoices: 8 invoices with line items"
    print_info "   • Financial records: 17 ledger transactions"
    print_info "   • And much more..."
    print_info ""
    print_info "Default login credentials:"
    print_info "  • Admin: admin / admin123"
    print_info "  • Manager: manager1 / manager123"
    print_info "  • Driver: driver1 / driver123"
    print_info "  • Driver: driver2 / driver123"
    print_info "  • Mechanic: mechanic1 / mechanic123"
else
    print_error "Failed to insert mock data"
    print_error "Check the database connection and permissions"
    exit 1
fi

# Clean up temporary files
print_info "Cleaning up temporary files..."
rm -f "$OUTPUT_FILE"

print_success "Mock data preparation and insertion completed successfully!"