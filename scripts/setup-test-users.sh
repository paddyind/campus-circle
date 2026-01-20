#!/bin/bash
# setup-test-users.sh
# Creates test users in Supabase Auth and confirms their emails
# This script should be run after migrations to set up test users

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${GREEN}🚀 Setting up test users for Campus Circle${NC}"
echo "============================================================"

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "   Please create .env file with Supabase credentials"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)

# Check required variables
if [ -z "$SUPABASE_DB_HOST" ] || [ -z "$SUPABASE_DB_USER" ] || [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}❌ Error: Database credentials not found in .env${NC}"
    exit 1
fi

echo ""
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
echo -e "${YELLOW}Step 3: Creating test users via Supabase Auth API...${NC}"

# Run Python script to create users using Admin API
docker exec "$BACKEND_CONTAINER" python3 << 'PYTHON_SCRIPT'
import requests
import sys
import os
sys.path.insert(0, '/app')
from app.core.supabase import supabase
from app.core.database import execute_query_one, execute_query
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from datetime import datetime

def create_and_confirm_user(email, password, full_name, role, user_type='parent', phone=None, dob=None):
    """Create user using Supabase Admin API and confirm email"""
    try:
        print(f"\n📝 Creating {user_type}: {email}...")
        
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise Exception("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment")
        
        admin_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        headers = {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Step 1: Check if user exists
        response = requests.get(f"{admin_url}?email={email}", headers=headers)
        auth_user_id = None
        
        if response.status_code == 200:
            users = response.json().get('users', [])
            if users:
                auth_user_id = users[0]['id']
                print(f"   ⚠️  User already exists: {auth_user_id}")
                
                # Delete and recreate to ensure fresh user with confirmed email
                print(f"   🔄 Deleting existing user to recreate with confirmed email...")
                delete_response = requests.delete(f"{admin_url}/{auth_user_id}", headers=headers)
                if delete_response.status_code in [200, 204]:
                    print(f"   ✅ Deleted existing user")
                    # Now create fresh user with confirmed email (auto_confirm prevents email sending)
                    user_data = {
                        'email': email,
                        'password': password,
                        'email_confirm': True,
                        'auto_confirm': True,  # Prevents email from being sent
                        'user_metadata': {'full_name': full_name, 'role': role}
                    }
                    create_response = requests.post(admin_url, headers=headers, json=user_data)
                    if create_response.status_code in [200, 201]:
                        user_obj = create_response.json()
                        auth_user_id = user_obj['id']
                        print(f"   ✅ Recreated user with confirmed email: {auth_user_id}")
                    else:
                        raise Exception(f"Failed to recreate user: {create_response.text[:200]}")
                else:
                    # If delete fails, just confirm email
                    print(f"   ⚠️  Could not delete, confirming email instead...")
                    update_response = requests.put(
                        f"{admin_url}/{auth_user_id}",
                        headers=headers,
                        json={'email_confirm': True, 'user_metadata': {'full_name': full_name, 'role': role}}
                    )
                    if update_response.status_code == 200:
                        print(f"   ✅ Email confirmed via Admin API")
                    else:
                        print(f"   ⚠️  Could not confirm email: {update_response.text[:100]}")
        else:
            # Step 2: Create new user with email confirmed (auto_confirm prevents email sending)
            user_data = {
                'email': email,
                'password': password,
                'email_confirm': True,  # Confirm email immediately
                'auto_confirm': True,  # Prevents email from being sent
                'user_metadata': {
                    'full_name': full_name,
                    'role': role
                }
            }
            
            response = requests.post(admin_url, headers=headers, json=user_data)
            if response.status_code in [200, 201]:
                user_obj = response.json()
                auth_user_id = user_obj['id']
                print(f"   ✅ Created user via Admin API: {auth_user_id}")
                print(f"   ✅ Email confirmed automatically")
            else:
                raise Exception(f"Failed to create user: {response.text[:200]}")
        
        if not auth_user_id:
            print(f"   ❌ Could not create or find user")
            return False
        
        # Step 3: Ensure user exists in auth.users (for foreign key constraint)
        # The foreign key constraint requires the user to exist in auth.users
        try:
            # Insert into auth.users (Supabase's auth schema)
            execute_query(
                """INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at) 
                   VALUES (%s, %s, NOW(), NOW(), NOW()) ON CONFLICT (id) DO NOTHING""",
                (auth_user_id, email)
            )
            print(f"   ✅ Added to auth.users")
        except Exception as e:
            # If auth.users doesn't exist or insert fails, try campus_circle_auth.users
            try:
                execute_query(
                    """INSERT INTO campus_circle_auth.users (id, email, email_confirmed_at) 
                       VALUES (%s, %s, NOW()) ON CONFLICT (id) DO NOTHING""",
                    (auth_user_id, email)
                )
            except Exception:
                pass  # May fail if schema doesn't match, that's okay
        
        # Step 4: Always update role in campus_circle.users (even if user exists)
        # This ensures roles are correct even if user was created with wrong role
        execute_query(
            "INSERT INTO campus_circle.users (id, role) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role",
            (auth_user_id, role)
        )
        print(f"   ✅ Added/Updated in campus_circle.users with role: {role}")
        
        # Step 5: Insert/Update profile table
        if user_type == 'parent':
            execute_query(
                """INSERT INTO campus_circle.parents (id, email, full_name, phone)
                   VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO UPDATE SET 
                   email = EXCLUDED.email, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone""",
                (auth_user_id, email, full_name, phone or '123-456-7890')
            )
            print(f"   ✅ Added/Updated in campus_circle.parents")
        elif user_type == 'student':
            execute_query(
                """INSERT INTO campus_circle.students (id, full_name, dob, status)
                   VALUES (%s, %s, %s, 'active') ON CONFLICT (id) DO UPDATE SET 
                   full_name = EXCLUDED.full_name, dob = EXCLUDED.dob, status = EXCLUDED.status""",
                (auth_user_id, full_name, dob)
            )
            print(f"   ✅ Added/Updated in campus_circle.students")
        
        print(f"   ✅ Successfully created {user_type}: {email}")
        return True
        
    except Exception as e:
        error_msg = str(e)
        import traceback
        print(f"   ❌ Error creating {user_type} {email}: {error_msg[:200]}")
        print(f"   📋 Full error: {traceback.format_exc()[:500]}")
        if "already registered" in error_msg.lower() or "already exists" in error_msg.lower():
            print(f"   ⚠️  User {email} already exists")
            return True
        return False

# Get email addresses from environment or use defaults
# This allows using real email addresses to prevent bounces
PARENT_EMAIL = os.getenv('TEST_PARENT_EMAIL', 'parent@campuscircle.com')
STUDENT_EMAIL = os.getenv('TEST_STUDENT_EMAIL', 'student@campuscircle.com')

# Create test users
test_users = [
    {
        "email": PARENT_EMAIL,
        "password": "password123",
        "full_name": "John Doe",
        "role": "parent",
        "user_type": "parent",
        "phone": "123-456-7890"
    },
    {
        "email": STUDENT_EMAIL,
        "password": "password123",
        "full_name": "Jane Doe",
        "role": "student",
        "user_type": "student",
        "dob": "2010-05-15"
    }
]

print(f"\n📧 Using email addresses:")
print(f"   Parent: {PARENT_EMAIL}")
print(f"   Student: {STUDENT_EMAIL}")
print(f"\n💡 Tip: Set TEST_PARENT_EMAIL and TEST_STUDENT_EMAIL environment variables")
print(f"   to use real email addresses and prevent bounce issues.\n")

results = {"success": [], "failed": []}

for user in test_users:
    try:
        success = create_and_confirm_user(**user)
        if success:
            results["success"].append(user["email"])
        else:
            results["failed"].append(user["email"])
    except Exception as e:
        print(f"\n❌ Fatal error creating {user['email']}: {str(e)}")
        results["failed"].append(user["email"])

print("\n" + "=" * 60)
print("📊 Summary")
print("=" * 60)
print(f"✅ Successfully created/verified: {len(results['success'])} user(s)")
for email in results["success"]:
    print(f"   - {email}")

if results["failed"]:
    print(f"\n❌ Failed to create: {len(results['failed'])} user(s)")
    for email in results["failed"]:
        print(f"   - {email}")
    print("\n⚠️  If users failed to create, check:")
    print("   1. Backend container logs: ./scripts/docker-manage.sh logs backend")
    print("   2. Supabase Dashboard → Authentication → Users")
    print("   3. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")

print("\n" + "=" * 60)
print("✨ Test Users Ready!")
print("=" * 60)
print("\nLogin credentials:")
print(f"  Parent: {PARENT_EMAIL} / password123")
print(f"  Student: {STUDENT_EMAIL} / password123")
print("")
PYTHON_SCRIPT

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}Step 3: Test users created with confirmed emails via Admin API${NC}"
    echo -e "${GREEN}✅ Test users setup complete!${NC}"
    echo ""
    echo "You can now login with the credentials shown above."
    echo ""
    echo -e "${YELLOW}💡 Email Bounce Prevention:${NC}"
    echo "   To prevent email bounces, set these in your .env file:"
    echo "   TEST_PARENT_EMAIL=your-real-email@example.com"
    echo "   TEST_STUDENT_EMAIL=your-real-email@example.com"
    echo "   Then re-run this script to use real email addresses."
else
    echo -e "${RED}❌ Failed to create test users${NC}"
    exit 1
fi
