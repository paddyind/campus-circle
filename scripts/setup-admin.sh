#!/bin/bash

# setup-admin.sh
# Script to set up admin user for Campus Circle
# This is a one-time setup for new installations
#
# Usage:
#   ./scripts/setup-admin.sh              # Create admin user
#   ./scripts/setup-admin.sh --disable-email-confirmation  # Show instructions to disable email confirmation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if --disable-email-confirmation flag is passed
if [ "$1" == "--disable-email-confirmation" ]; then
    echo -e "${BLUE}🔧 Email Confirmation Setup${NC}"
    echo "============================================================"
    echo ""
    
    # Load environment variables
    if [ -f "$PROJECT_ROOT/.env" ]; then
        export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
    fi
    
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${RED}❌ Error: SUPABASE_URL not found in .env${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  This will guide you to disable email confirmation in Supabase.${NC}"
    echo -e "${YELLOW}   This is recommended for development but should be enabled for production.${NC}"
    echo ""
    read -p "Continue? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${YELLOW}Operation cancelled${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${GREEN}📋 Steps to Disable Email Confirmation:${NC}"
    echo ""
    echo "1. Go to your Supabase Dashboard:"
    echo "   ${BLUE}https://supabase.com/dashboard${NC}"
    echo ""
    echo "2. Select your project, then navigate to:"
    echo "   ${BLUE}Authentication → Settings → Email Auth${NC}"
    echo ""
    echo "3. Find the setting:"
    echo "   ${BLUE}'Enable email confirmations'${NC}"
    echo ""
    echo "4. ${RED}Disable${NC} this setting (toggle it OFF)"
    echo ""
    echo "5. Click ${GREEN}'Save'${NC}"
    echo ""
    echo -e "${GREEN}✅ Email confirmation is now disabled!${NC}"
    echo ""
    echo -e "${YELLOW}💡 For Production:${NC}"
    echo "   When ready for production, re-enable email confirmation:"
    echo "   1. Go to Authentication → Settings → Email Auth"
    echo "   2. Enable 'Enable email confirmations'"
    echo "   3. Save"
    echo "   4. Set ENABLE_EMAIL_CONFIRMATION=true in .env"
    echo ""
    echo -e "${YELLOW}📝 Note:${NC}"
    echo "   Setup scripts already use 'auto_confirm: true' to prevent email"
    echo "   sending, but disabling email confirmation in Supabase Dashboard"
    echo "   provides an additional safeguard."
    echo ""
    exit 0
fi

echo -e "${GREEN}🚀 Setting up admin user for Campus Circle${NC}"
echo "============================================================"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ Error: .env file not found in $PROJECT_ROOT${NC}"
    exit 1
fi

# Check for required Supabase environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: Supabase credentials not set in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking if backend container is running...${NC}"

# Check if backend container is running - try multiple patterns
BACKEND_CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | grep -E "(campus-circle|backend)" | head -1)

# If not found, try with project name
if [ -z "$BACKEND_CONTAINER" ]; then
    BACKEND_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i backend | head -1)
fi

# If still not found, try to start it
if [ -z "$BACKEND_CONTAINER" ]; then
    echo -e "${YELLOW}⚠️  Backend container not found. Attempting to start it...${NC}"
    ./scripts/docker-manage.sh start backend
    sleep 3
    BACKEND_CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | grep -E "(campus-circle|backend)" | head -1)
fi

if [ -z "$BACKEND_CONTAINER" ]; then
    echo -e "${RED}❌ Backend container is not running and could not be started.${NC}"
    echo -e "${YELLOW}Please start the services manually:${NC}"
    echo "  ./scripts/docker-manage.sh start"
    exit 1
fi

echo -e "${GREEN}✅ Found backend container: $BACKEND_CONTAINER${NC}"

echo -e "${YELLOW}Step 2: Verifying database schema exists...${NC}"

# Check if campus_circle schema and users table exist, and verify no incorrect schema exists
if docker exec "$BACKEND_CONTAINER" python3 << 'PYTHON_CHECK' > /dev/null 2>&1
import sys
sys.path.insert(0, '/app')
from app.core.database import execute_query_one, execute_query

try:
    # Check if correct schema exists
    schema_check = execute_query_one(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = %s)",
        ('campus_circle', 'users')
    )
    if not schema_check or not schema_check.get('exists'):
        sys.exit(1)
    
    # Check for incorrect schema (campus-circle with hyphen) - should not exist
    incorrect_schema = execute_query(
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'campus-circle'"
    )
    if incorrect_schema:
        print("WARNING: Found incorrect schema 'campus-circle'. Only 'campus_circle' should exist.", file=sys.stderr)
        # Don't fail, but warn
    
    # Verify schema has required tables
    required_tables = ['users', 'parents', 'students']
    for table in required_tables:
        table_check = execute_query_one(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = %s)",
            ('campus_circle', table)
        )
        if not table_check or not table_check.get('exists'):
            print(f"ERROR: Required table 'campus_circle.{table}' does not exist", file=sys.stderr)
            sys.exit(1)
    
    # Verify no incorrect schema exists (campus-circle with hyphen)
    incorrect_check = execute_query(
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'campus-circle'"
    )
    if incorrect_check:
        print("WARNING: Found incorrect schema 'campus-circle'. Use 'campus_circle' instead.", file=sys.stderr)
    
    sys.exit(0)
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
PYTHON_CHECK
then
    SCHEMA_EXISTS=true
else
    SCHEMA_EXISTS=false
fi

if [ "$SCHEMA_EXISTS" != "true" ]; then
    echo -e "${RED}❌ Error: Database schema not found or incomplete!${NC}"
    echo -e "${YELLOW}The 'campus_circle' schema or required tables do not exist.${NC}"
    echo ""
    echo -e "${YELLOW}Please run migrations first:${NC}"
    echo "  ./scripts/docker-manage.sh migrate"
    echo ""
    echo -e "${YELLOW}Or if using Supabase, ensure migrations have been run.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database schema verified (campus_circle schema exists with required tables)${NC}"
echo -e "${YELLOW}Step 3: Creating admin user via Supabase Auth API...${NC}"

# Run Python script inside the backend container to create admin user
docker exec "$BACKEND_CONTAINER" python3 << 'PYTHON_SCRIPT'
import requests
import sys
import os

sys.path.insert(0, '/app')
from app.core.supabase import supabase
from app.core.database import execute_query_one, execute_query
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

def create_admin_user():
    """Create admin user using Supabase Admin API"""
    try:
        email = "admin@campuscircle.com"
        password = "password123"
        full_name = "Admin User"
        
        print(f"\n📝 Creating admin user: {email}...")
        
        admin_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        headers = {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Check if admin user exists
        print(f"   Checking Supabase connection...")
        print(f"   URL: {admin_url}")
        response = requests.get(f"{admin_url}?email={email}", headers=headers, timeout=10)
        print(f"   Response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"   ❌ Error response: {response.text[:200]}")
            raise Exception(f"Failed to check for admin user: HTTP {response.status_code} - {response.text[:200]}")
        
        users = response.json().get('users', [])
        auth_user_id = None
        
        if users:
            auth_user_id = users[0]['id']
            print(f"   ⚠️  Admin user already exists: {auth_user_id}")
            # Delete and recreate to ensure password is set correctly
            print(f"   Deleting existing user to recreate with correct password...")
            delete_response = requests.delete(f"{admin_url}/{auth_user_id}", headers=headers)
            if delete_response.status_code in [200, 204]:
                print(f"   ✅ Deleted existing user")
                import time
                time.sleep(2)  # Wait for deletion to propagate
                auth_user_id = None  # Reset to create new
            else:
                print(f"   ⚠️  Delete failed: {delete_response.status_code}")
        
        if not auth_user_id:
            # Create new admin user
            print(f"   Creating new admin user...")
            user_data = {
                'email': email,
                'password': password,
                'email_confirm': True,
                'auto_confirm': True,  # Prevents email from being sent
                'user_metadata': {
                    'full_name': full_name,
                    'role': 'admin'
                }
            }
            print(f"   Request: email={email}, password=***, email_confirm=True")
            create_response = requests.post(admin_url, headers=headers, json=user_data, timeout=10)
            print(f"   Create response status: {create_response.status_code}")
            
            if create_response.status_code in [200, 201]:
                user_obj = create_response.json()
                auth_user_id = user_obj.get('id')
                if auth_user_id:
                    print(f"   ✅ Created admin user: {auth_user_id}")
                    print(f"   Email: {user_obj.get('email')}")
                else:
                    raise Exception(f"User created but no ID returned: {create_response.text[:200]}")
            else:
                error_text = create_response.text[:300]
                print(f"   ❌ Create failed: {error_text}")
                raise Exception(f"Failed to create admin user: HTTP {create_response.status_code} - {error_text}")
        
        if not auth_user_id:
            print(f"   ❌ Could not create or find admin user")
            return False
        
        # Ensure user exists in campus_circle_auth.users
        try:
            execute_query(
                """INSERT INTO campus_circle_auth.users (id, email, email_confirmed_at) 
                   VALUES (%s, %s, NOW()) ON CONFLICT (id) DO NOTHING""",
                (auth_user_id, email)
            )
            print(f"   ✅ Added to campus_circle_auth.users")
        except Exception:
            pass
        
        # Insert/Update in campus_circle.users with admin role
        execute_query(
            "INSERT INTO campus_circle.users (id, role) VALUES (%s, 'admin') ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role",
            (auth_user_id,)
        )
        print(f"   ✅ Added/Updated in campus_circle.users with admin role")
        
        # Verify the role was set correctly
        verify_role = execute_query_one(
            "SELECT role FROM campus_circle.users WHERE id = %s",
            (auth_user_id,)
        )
        if verify_role and verify_role['role'] == 'admin':
            print(f"   ✅ Verified: Role is correctly set to 'admin'")
        else:
            print(f"   ⚠️  Warning: Role verification failed. Current role: {verify_role['role'] if verify_role else 'None'}")
        
        # Final verification: Check user exists in Supabase
        verify_response = requests.get(f"{admin_url}?email={email}", headers=headers)
        if verify_response.status_code == 200:
            verify_users = verify_response.json().get('users', [])
            if verify_users and verify_users[0]['id'] == auth_user_id:
                print(f"   ✅ Verified: User exists in Supabase Auth with ID {auth_user_id}")
                print(f"   ✅ Email confirmed: {verify_users[0].get('email_confirmed_at') is not None}")
            else:
                print(f"   ⚠️  Warning: User verification in Supabase failed")
        
        # Insert into parents table (admin can be treated as a parent for profile purposes)
        execute_query(
            """INSERT INTO campus_circle.parents (id, email, full_name, phone)
               VALUES (%s, %s, %s, 'N/A') ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name""",
            (auth_user_id, email, full_name)
        )
        print(f"   ✅ Added/Updated in campus_circle.parents")
        
        # Final verification: Check user exists in Supabase
        print(f"\n   🔍 Final verification...")
        verify_response = requests.get(f"{admin_url}?email={email}", headers=headers, timeout=10)
        if verify_response.status_code == 200:
            verify_users = verify_response.json().get('users', [])
            if verify_users and verify_users[0]['id'] == auth_user_id:
                print(f"   ✅ Verified: User exists in Supabase Auth")
                print(f"   ✅ Email confirmed: {verify_users[0].get('email_confirmed_at') is not None}")
                print(f"   ✅ User ID: {auth_user_id}")
            else:
                print(f"   ⚠️  Warning: User verification in Supabase failed")
                return False
        else:
            print(f"   ⚠️  Warning: Could not verify user: {verify_response.status_code}")
        
        print(f"\n   ✅ Successfully created/verified admin user: {email}")
        return True
        
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:200]}")
        return False

if create_admin_user():
    print("\n" + "=" * 60)
    print("✨ Admin User Ready!")
    print("=" * 60)
    print("\nAdmin login credentials:")
    print("  Email: admin@campuscircle.com")
    print("  Password: password123")
    print("")
else:
    print("\n" + "=" * 60)
    print("❌ Failed to create admin user")
    print("=" * 60)
    sys.exit(1)

PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Admin user setup complete!${NC}"
    echo ""
    echo "Admin login credentials:"
    echo "  Email: admin@campuscircle.com"
    echo "  Password: password123"
else
    echo -e "${RED}❌ Failed to create admin user${NC}"
    exit 1
fi
