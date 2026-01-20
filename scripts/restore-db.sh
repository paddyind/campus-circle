#!/bin/bash

# Campus Circle Database Restore Script
# This script restores a backup of Campus Circle database
# Usage: ./scripts/restore-db.sh <backup-name>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if backup name is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Backup name is required${NC}"
    echo "Usage: $0 <backup-name>"
    echo ""
    echo "Available backups:"
    ls -1 "$PROJECT_ROOT/backups" 2>/dev/null | head -10 || echo "  (no backups found)"
    exit 1
fi

BACKUP_NAME="$1"
BACKUP_DIR="$PROJECT_ROOT/backups"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Check if backup exists
if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}❌ Error: Backup '$BACKUP_NAME' not found${NC}"
    echo "Backup path: $BACKUP_PATH"
    echo ""
    echo "Available backups:"
    ls -1 "$BACKUP_DIR" 2>/dev/null | head -10 || echo "  (no backups found)"
    exit 1
fi

# Check if backup files exist
if [ ! -f "$BACKUP_PATH/backup.sql" ] && [ ! -f "$BACKUP_PATH/schema.sql" ]; then
    echo -e "${RED}❌ Error: Backup files not found in $BACKUP_PATH${NC}"
    exit 1
fi

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

# Database connection parameters
DB_HOST="${SUPABASE_DB_HOST:-localhost}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-postgres}"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql is not installed${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will restore the database from backup${NC}"
echo "This will:"
echo "  - Drop existing campus_circle and campus_circle_auth schemas"
echo "  - Recreate schemas and tables"
echo "  - Restore all data"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}🔄 Starting Campus Circle Database Restore${NC}"
echo "Backup: $BACKUP_NAME"
echo "Backup path: $BACKUP_PATH"
echo ""

# Set PGPASSWORD environment variable
export PGPASSWORD="$DB_PASSWORD"

# Determine which backup file to use
if [ -f "$BACKUP_PATH/backup.sql" ]; then
    BACKUP_FILE="$BACKUP_PATH/backup.sql"
    echo -e "${YELLOW}📦 Using combined backup file...${NC}"
elif [ -f "$BACKUP_PATH/schema.sql" ] && [ -f "$BACKUP_PATH/data.sql" ]; then
    BACKUP_FILE="$BACKUP_PATH/schema.sql"
    DATA_FILE="$BACKUP_PATH/data.sql"
    echo -e "${YELLOW}📦 Using separate schema and data files...${NC}"
else
    echo -e "${RED}❌ Error: No valid backup files found${NC}"
    exit 1
fi

# Drop existing schemas (if they exist)
echo -e "${YELLOW}🗑️  Dropping existing schemas...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    DROP SCHEMA IF EXISTS campus_circle CASCADE;
    DROP SCHEMA IF EXISTS campus_circle_auth CASCADE;
" 2>/dev/null || echo "Schemas may not exist (this is okay)"

# Restore schema and data
if [ -f "$BACKUP_PATH/backup.sql" ]; then
    # Use combined backup file
    echo -e "${YELLOW}📋 Restoring schema and data from combined backup...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" > /dev/null 2>&1 || {
        echo -e "${RED}❌ Error restoring database${NC}"
        exit 1
    }
else
    # Use separate files
    echo -e "${YELLOW}📋 Restoring schema...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" > /dev/null 2>&1 || {
        echo -e "${RED}❌ Error restoring schema${NC}"
        exit 1
    }
    
    echo -e "${YELLOW}💾 Restoring data...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$DATA_FILE" > /dev/null 2>&1 || {
        echo -e "${RED}❌ Error restoring data${NC}"
        exit 1
    }
fi

# Restore auth.users if available
if [ -f "$BACKUP_PATH/auth_users.sql" ] && [ -s "$BACKUP_PATH/auth_users.sql" ]; then
    echo -e "${YELLOW}🔐 Restoring auth.users (if accessible)...${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$BACKUP_PATH/auth_users.sql" \
        -v ON_ERROR_STOP=1 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Could not restore auth.users (may require service role access)${NC}"
        echo -e "${YELLOW}   Run ./scripts/setup-test-users.sh to recreate test users${NC}"
    }
else
    echo -e "${YELLOW}⚠️  auth.users backup not available${NC}"
    echo -e "${YELLOW}   Run ./scripts/setup-test-users.sh to recreate test users${NC}"
fi

# Note: Test users should be created via setup script after restore
echo -e "${YELLOW}ℹ️  To create test users, run: ./scripts/setup-test-users.sh${NC}"

# Verify restoration
echo -e "${YELLOW}✅ Verifying restoration...${NC}"
SCHEMA_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM information_schema.schemata 
    WHERE schema_name IN ('campus_circle', 'campus_circle_auth');
" | xargs)

if [ "$SCHEMA_COUNT" = "2" ]; then
    echo -e "${GREEN}✅ Both schemas restored successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Expected 2 schemas, found $SCHEMA_COUNT${NC}"
fi

# Get table counts
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema IN ('campus_circle', 'campus_circle_auth');
" | xargs)

echo -e "${GREEN}✅ Restore completed successfully!${NC}"
echo "Schemas restored: campus_circle, campus_circle_auth"
echo "Tables restored: $TABLE_COUNT"
echo ""
echo "You can now start the application:"
echo "  ./scripts/docker-manage.sh start"

# Unset PGPASSWORD
unset PGPASSWORD
