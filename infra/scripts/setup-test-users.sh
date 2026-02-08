#!/bin/bash
# setup-test-users.sh
# Creates admin, parent, and student test users in Supabase Auth and campus_circle (run after migrations).
# Usage: ./infra/scripts/setup-test-users.sh
#        ./infra/scripts/setup-test-users.sh --disable-email-confirmation  (show steps to disable email confirm in Supabase)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Optional: show steps to disable email confirmation in Supabase (no user creation)
if [ "$1" == "--disable-email-confirmation" ]; then
    echo -e "${BLUE}🔧 Email Confirmation Setup${NC}"
    echo "============================================================"
    echo ""
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    fi
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${RED}❌ Error: SUPABASE_URL not found in .env${NC}"
        exit 1
    fi
    echo -e "${YELLOW}⚠️  Disable email confirmation in Supabase for development.${NC}"
    echo ""
    echo "1. Go to https://supabase.com/dashboard → your project"
    echo "2. Authentication → Settings → Email Auth"
    echo "3. Turn OFF 'Enable email confirmations' → Save"
    echo ""
    echo -e "${GREEN}Then run this script without the flag to create users.${NC}"
    exit 0
fi

echo -e "${GREEN}🚀 Setting up admin, parent, and student users for Campus Circle${NC}"
echo "============================================================"

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "   Please create .env file with Supabase credentials"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)

# Require API and DB credentials (script runs on host and uses .env → writes to your Supabase)
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env${NC}"
    exit 1
fi
if [ -z "$SUPABASE_DB_HOST" ] || [ -z "$SUPABASE_DB_USER" ] || [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}❌ Error: SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD required in .env${NC}"
    echo -e "${YELLOW}   (Use your Supabase DB host so users are created in your project.)${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Using .env → ${SUPABASE_DB_HOST}${NC}"
echo -e "${YELLOW}Run migrations first if needed: python infra/scripts/db.py migrate${NC}"
echo ""

cd "$PROJECT_ROOT"

# Use project .venv; create and install from backend/requirements.txt if missing
VENV_PY="$PROJECT_ROOT/.venv/bin/python3"
if [ -f "$VENV_PY" ]; then
    "$VENV_PY" -m pip install -q -r backend/requirements.txt 2>/dev/null || true
    PYTHON_CMD="$VENV_PY"
else
    echo -e "${BLUE}Creating .venv and installing from backend/requirements.txt...${NC}"
    python3 -m venv "$PROJECT_ROOT/.venv"
    "$PROJECT_ROOT/.venv/bin/pip" install -q -r backend/requirements.txt
    PYTHON_CMD="$PROJECT_ROOT/.venv/bin/python3"
fi

"$PYTHON_CMD" infra/scripts/setup_test_users.py
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Admin, parent, and student created in auth.users and campus_circle_auth.users.${NC}"
    echo "   Login: demo_admin@campuscircle.com | demo_parent@campuscircle.com | demo_student@campuscircle.com (password123)"
else
    echo ""
    echo -e "${RED}❌ Setup failed.${NC}"
    echo -e "${YELLOW}Install deps: pip install -r backend/requirements.txt  (then re-run this script)${NC}"
    exit 1
fi
