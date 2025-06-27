#!/bin/bash

# ================================================================
# Nepo Corp Backend Mock Data Preparation Script
# Replaces {{HASH_SECRET}} and {{HASH_SALT}} with actual .env values
# ================================================================

set -e

# Load .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Warning: .env file not found, using default values"
    export HASH_SECRET="your-hash-secret-change-in-production"
    export HASH_SALT="your-hash-salt-change-in-production"
fi

# Check if required environment variables are set
if [ -z "$HASH_SECRET" ]; then
    echo "Error: HASH_SECRET not set in environment"
    exit 1
fi

if [ -z "$HASH_SALT" ]; then
    echo "Error: HASH_SALT not set in environment"
    exit 1
fi

# Create the processed mock data file
INPUT_FILE="scripts/mock-data.sql"
OUTPUT_FILE="scripts/mock-data-processed.sql"

echo "Processing mock data SQL file..."
echo "HASH_SECRET: ${HASH_SECRET:0:10}... (truncated for security)"
echo "HASH_SALT: ${HASH_SALT:0:10}... (truncated for security)"

# Replace placeholders with actual values
sed "s/{{HASH_SECRET}}/$HASH_SECRET/g; s/{{HASH_SALT}}/$HASH_SALT/g" "$INPUT_FILE" > "$OUTPUT_FILE"

echo "Mock data file processed successfully: $OUTPUT_FILE"
echo ""
echo "To load the data into your database, run:"
echo "mysql -u\$DB_USER -p\$DB_PASSWORD \$DB_NAME < $OUTPUT_FILE"
echo ""
echo "Or if you have the database connection configured:"
echo "mysql -h\$DB_HOST -P\$DB_PORT -u\$DB_USER -p\$DB_PASSWORD \$DB_NAME < $OUTPUT_FILE"

# Optional: Show first few lines of processed file for verification
echo ""
echo "Preview of processed file (first 20 lines):"
echo "================================================"
head -20 "$OUTPUT_FILE"
echo "================================================"
echo ""
echo "Note: The actual password hashes are generated using your .env HASH_SECRET and HASH_SALT"
echo ""
echo "Default passwords for testing:"
echo "- admin: admin123"
echo "- manager1: manager123" 
echo "- driver1: driver123"
echo "- driver2: driver123"
echo "- mechanic1: mechanic123"