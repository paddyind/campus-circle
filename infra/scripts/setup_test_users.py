#!/usr/bin/env python3
"""
Create admin, parent, and student users in Supabase Auth and mirror into
campus_circle_auth.users and campus_circle. Run from project root; loads .env.
Usage: python3 infra/scripts/setup_test_users.py
"""
import os
import sys
from pathlib import Path

# Project root (infra/scripts -> infra -> project root)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent

# Load .env from project root
def load_dotenv():
    env_file = PROJECT_ROOT / ".env"
    if not env_file.exists():
        print("Error: .env not found in project root.", file=sys.stderr)
        sys.exit(1)
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip('"').strip("'")
                os.environ.setdefault(k, v)

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
DB_HOST = os.environ.get("SUPABASE_DB_HOST", "db")
DB_PORT = os.environ.get("SUPABASE_DB_PORT", "5432")
DB_NAME = os.environ.get("SUPABASE_DB_NAME", "postgres")
DB_USER = os.environ.get("SUPABASE_DB_USER", "postgres")
DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env", file=sys.stderr)
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Missing dependency: requests (from backend/requirements.txt)", file=sys.stderr)
    print("Install then re-run: pip install -r backend/requirements.txt", file=sys.stderr)
    sys.exit(1)
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Missing dependency: psycopg2-binary (from backend/requirements.txt)", file=sys.stderr)
    print("Install then re-run: pip install -r backend/requirements.txt", file=sys.stderr)
    sys.exit(1)


def get_db_conn():
    # Supabase (and most cloud Postgres) require SSL when connecting from outside
    conn_kw = {
        "host": DB_HOST,
        "port": DB_PORT,
        "dbname": DB_NAME,
        "user": DB_USER,
        "password": DB_PASSWORD,
    }
    if "supabase.co" in str(DB_HOST):
        conn_kw["sslmode"] = "require"
    return psycopg2.connect(**conn_kw)


def db_execute(query, params=None):
    conn = get_db_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if cur.description:
                out = cur.fetchall()
            else:
                out = []
            conn.commit()
            return out
    finally:
        conn.close()


def create_user(email, password, full_name, role, user_type, phone=None, dob=None):
    admin_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    print(f"\n📝 Creating {user_type}: {email}...")

    # Get or create in Supabase Auth (list returns all users; find by email)
    r = requests.get(admin_url, headers=headers, timeout=10)
    if r.status_code != 200:
        print(f"   ❌ Auth API error: {r.status_code} {r.text[:150]}")
        return False

    users = r.json().get("users", [])
    email_lower = email.lower()
    match = next((u for u in users if (u.get("email") or "").lower() == email_lower), None)
    auth_user_id = match["id"] if match else None

    if auth_user_id:
        print(f"   ⚠️  User exists in auth.users: {auth_user_id}")
        # Ensure confirmed
        requests.put(
            f"{admin_url}/{auth_user_id}",
            headers=headers,
            json={"email_confirm": True, "user_metadata": {"full_name": full_name, "role": role}},
            timeout=10,
        )
    else:
        r2 = requests.post(
            admin_url,
            headers=headers,
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "auto_confirm": True,
                "user_metadata": {"full_name": full_name, "role": role},
            },
            timeout=10,
        )
        if r2.status_code not in (200, 201):
            print(f"   ❌ Create failed: {r2.status_code} {r2.text[:200]}")
            return False
        auth_user_id = r2.json().get("id")
        print(f"   ✅ Created in auth.users: {auth_user_id}")

    # Mirror into campus_circle_auth.users (so they appear in your schema)
    try:
        db_execute(
            """INSERT INTO campus_circle_auth.users (id, email, email_confirmed_at)
               VALUES (%s, %s, NOW())
               ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, email_confirmed_at = EXCLUDED.email_confirmed_at""",
            (auth_user_id, email),
        )
        print(f"   ✅ Synced to campus_circle_auth.users")
    except Exception as e:
        print(f"   ❌ campus_circle_auth.users: {e}")
        return False

    # campus_circle.users
    db_execute(
        "INSERT INTO campus_circle.users (id, role) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role",
        (auth_user_id, role),
    )
    print(f"   ✅ campus_circle.users (role={role})")

    # Profile table
    if user_type in ("admin", "parent"):
        db_execute(
            """INSERT INTO campus_circle.parents (id, email, full_name, phone)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone""",
            (auth_user_id, email, full_name, phone or "N/A"),
        )
        print(f"   ✅ campus_circle.parents")
    elif user_type == "student":
        db_execute(
            """INSERT INTO campus_circle.students (id, auth_user_id, full_name, dob, status)
               VALUES (%s, %s, %s, %s, 'active')
               ON CONFLICT (id) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id, full_name = EXCLUDED.full_name, dob = EXCLUDED.dob""",
            (auth_user_id, auth_user_id, full_name, dob),
        )
        print(f"   ✅ campus_circle.students")

    return True


def main():
    admin_email = os.environ.get("TEST_ADMIN_EMAIL", "demo_admin@campuscircle.com")
    parent_email = os.environ.get("TEST_PARENT_EMAIL", "demo_parent@campuscircle.com")
    student_email = os.environ.get("TEST_STUDENT_EMAIL", "demo_student@campuscircle.com")

    users = [
        {"email": admin_email, "password": "password123", "full_name": "Admin User", "role": "admin", "user_type": "admin", "phone": "N/A"},
        {"email": parent_email, "password": "password123", "full_name": "John Doe", "role": "parent", "user_type": "parent", "phone": "123-456-7890"},
        {"email": student_email, "password": "password123", "full_name": "Jane Doe", "role": "student", "user_type": "student", "dob": "2010-05-15"},
    ]

    print(f"DB: {DB_HOST}:{DB_PORT}/{DB_NAME}")
    # Verify we can reach the DB before creating users
    try:
        rows = db_execute("SELECT 1 FROM campus_circle_auth.users LIMIT 0")
        print("   (DB connection OK)")
    except Exception as e:
        print(f"   ❌ Cannot connect to DB: {e}")
        sys.exit(1)
    print(f"Creating: {admin_email}, {parent_email}, {student_email}")

    failed = []
    for u in users:
        try:
            if not create_user(**u):
                failed.append(u["email"])
        except Exception as e:
            print(f"   ❌ {e}")
            failed.append(u["email"])

    if failed:
        print(f"\n❌ Failed: {', '.join(failed)}")
        sys.exit(1)
    # Verify rows in campus_circle_auth.users
    try:
        count = db_execute("SELECT COUNT(*) AS n FROM campus_circle_auth.users")
        n = count[0]["n"] if count else 0
        print(f"\n✅ Done. campus_circle_auth.users now has {n} row(s).")
    except Exception:
        pass
    print(f"Login: {admin_email} | {parent_email} | {student_email} (password123)")


if __name__ == "__main__":
    main()
