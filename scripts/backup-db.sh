#!/bin/bash

# Campus Circle Database Backup Script
# This script backs up both schema and data for Campus Circle
# Usage: ./scripts/backup-db.sh [backup-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Backup directory
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${1:-campus_circle_backup_$TIMESTAMP}"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

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

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ Error: pg_dump is not installed${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

echo -e "${GREEN}📦 Starting Campus Circle Database Backup${NC}"
echo "Backup name: $BACKUP_NAME"
echo "Backup path: $BACKUP_PATH"
echo ""

# Create backup directory
mkdir -p "$BACKUP_PATH"

# Set PGPASSWORD environment variable
export PGPASSWORD="$DB_PASSWORD"

# Backup schemas (campus_circle and campus_circle_auth)
echo -e "${YELLOW}📋 Backing up schema definitions...${NC}"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --schema=campus_circle \
    --schema=campus_circle_auth \
    --schema-only \
    --no-owner \
    --no-acl \
    -f "$BACKUP_PATH/schema.sql" 2>/dev/null || {
    echo -e "${RED}❌ Error backing up schema${NC}"
    exit 1
}

# Backup data (including auth.users if accessible)
echo -e "${YELLOW}💾 Backing up data...${NC}"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --schema=campus_circle \
    --schema=campus_circle_auth \
    --data-only \
    --no-owner \
    --no-acl \
    -f "$BACKUP_PATH/data.sql" 2>/dev/null || {
    echo -e "${RED}❌ Error backing up data${NC}"
    exit 1
}

# Backup auth.users table (Supabase Auth users) if accessible
echo -e "${YELLOW}🔐 Backing up auth.users (if accessible)...${NC}"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --table=auth.users \
    --data-only \
    --no-owner \
    --no-acl \
    -f "$BACKUP_PATH/auth_users.sql" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not backup auth.users (may require service role access)${NC}"
    echo -e "${YELLOW}   This is normal for Supabase - auth users are managed separately${NC}"
    # Create empty file to indicate attempt was made
    touch "$BACKUP_PATH/auth_users.sql"
    echo "-- auth.users backup not available (requires service role access)" > "$BACKUP_PATH/auth_users.sql"
}

# Create a combined backup file
echo -e "${YELLOW}📦 Creating combined backup file...${NC}"
cat > "$BACKUP_PATH/backup.sql" << EOF
-- Campus Circle Database Backup
-- Generated: $(date)
-- Backup Name: $BACKUP_NAME
-- 
-- This backup includes:
--   - campus_circle schema (all tables, indexes, constraints)
--   - campus_circle_auth schema (authentication tables)
--   - All data from both schemas
--
-- To restore, run: ./scripts/restore-db.sh $BACKUP_NAME
--

-- ============================================
-- SCHEMA DEFINITIONS
-- ============================================

EOF

cat "$BACKUP_PATH/schema.sql" >> "$BACKUP_PATH/backup.sql"

cat >> "$BACKUP_PATH/backup.sql" << EOF

-- ============================================
-- DATA
-- ============================================

EOF

cat "$BACKUP_PATH/data.sql" >> "$BACKUP_PATH/backup.sql"

# Create metadata file
cat > "$BACKUP_PATH/metadata.json" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$TIMESTAMP",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "schemas": ["campus_circle", "campus_circle_auth"],
  "database": {
    "host": "$DB_HOST",
    "port": "$DB_PORT",
    "name": "$DB_NAME",
    "user": "$DB_USER"
  },
  "files": {
    "schema": "schema.sql",
    "data": "data.sql",
    "combined": "backup.sql",
    "metadata": "metadata.json"
  }
}
EOF

# Get backup size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)

echo ""
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo "Backup location: $BACKUP_PATH"
echo "Backup size: $BACKUP_SIZE"
echo ""
echo "Files created:"
echo "  - schema.sql (schema definitions only)"
echo "  - data.sql (data only)"
echo "  - backup.sql (combined schema + data)"
echo "  - metadata.json (backup metadata)"
echo ""
echo "To restore this backup:"
echo "  ./scripts/restore-db.sh $BACKUP_NAME"

# Unset PGPASSWORD
unset PGPASSWORD
