#!/usr/bin/env python3
"""
Create admin, parent, and student users in Supabase Auth and mirror into
campus_circle_auth and campus_bhis. Run from project root; loads .env.
Usage: ./infra/scripts/run.sh setup_test_users
       ./infra/scripts/run.sh setup_test_users --disable-email-confirmation  (show Supabase steps only)
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


def create_user(email, password, full_name, role, user_type, phone=None, dob=None, schema_auth="campus_circle_auth", schema_app="campus_circle"):
    admin_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    print(f"\n📝 Creating {user_type}: {email} ({schema_app})...")

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

    try:
        db_execute(
            f"""INSERT INTO {schema_auth}.users (id, email, email_confirmed_at)
               VALUES (%s, %s, NOW())
               ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, email_confirmed_at = EXCLUDED.email_confirmed_at""",
            (auth_user_id, email),
        )
        print(f"   ✅ Synced to {schema_auth}.users")
    except Exception as e:
        print(f"   ❌ {schema_auth}.users: {e}")
        return False

    db_execute(
        f"INSERT INTO {schema_app}.users (id, role) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role",
        (auth_user_id, role),
    )
    print(f"   ✅ {schema_app}.users (role={role})")

    if user_type in ("admin", "parent"):
        db_execute(
            f"""INSERT INTO {schema_app}.parents (id, email, full_name, phone)
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone""",
            (auth_user_id, email, full_name, phone or "N/A"),
        )
        print(f"   ✅ {schema_app}.parents")
    elif user_type == "student":
        db_execute(
            f"""INSERT INTO {schema_app}.students (id, auth_user_id, full_name, dob, status)
               VALUES (%s, %s, %s, %s, 'active')
               ON CONFLICT (id) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id, full_name = EXCLUDED.full_name, dob = EXCLUDED.dob""",
            (auth_user_id, auth_user_id, full_name, dob),
        )
        print(f"   ✅ {schema_app}.students")

    return True


def main():
    if "--disable-email-confirmation" in sys.argv:
        load_dotenv()
        url = os.environ.get("SUPABASE_URL", "")
        print("🔧 Email Confirmation Setup")
        print("=" * 60)
        print("\nDisable email confirmation in Supabase for development:\n")
        print("1. Go to https://supabase.com/dashboard → your project")
        print("2. Authentication → Settings → Email Auth")
        print("3. Turn OFF 'Enable email confirmations' → Save")
        print("\nThen run: ./infra/scripts/run.sh setup_test_users")
        sys.exit(0)

    admin_email = os.environ.get("TEST_ADMIN_EMAIL", "demo_admin@campuscircle.com")
    parent_email = os.environ.get("TEST_PARENT_EMAIL", "demo_parent@campuscircle.com")
    student_email = os.environ.get("TEST_STUDENT_EMAIL", "demo_student@campuscircle.com")

    demo_users = [
        {"email": admin_email, "password": "password123", "full_name": "Admin User", "role": "admin", "user_type": "admin", "phone": "N/A"},
        {"email": parent_email, "password": "password123", "full_name": "John Doe", "role": "parent", "user_type": "parent", "phone": "123-456-7890"},
        {"email": student_email, "password": "password123", "full_name": "Jane Doe", "role": "student", "user_type": "student", "dob": "2010-05-15"},
    ]

    bhis_users = [
        {"email": "bhis_admin@campuscircle.com", "password": "password123", "full_name": "BHIS Admin", "role": "admin", "user_type": "admin", "phone": "N/A"},
        {"email": "bhis_parent@campuscircle.com", "password": "password123", "full_name": "BHIS Parent", "role": "parent", "user_type": "parent", "phone": "555-1111"},
        {"email": "bhis_student@campuscircle.com", "password": "password123", "full_name": "BHIS Student", "role": "student", "user_type": "student", "dob": "2011-03-10"},
    ]

    print(f"DB: {DB_HOST}:{DB_PORT}/{DB_NAME}")
    try:
        db_execute("SELECT 1 FROM campus_circle_auth.users LIMIT 0")
        print("   (DB connection OK)")
    except Exception as e:
        print(f"   ❌ Cannot connect to DB: {e}")
        sys.exit(1)

    # Demo-BHIS requires migration 003 (campus_bhis_auth schema)
    bhis_schema_ok = False
    try:
        db_execute("SELECT 1 FROM campus_bhis_auth.users LIMIT 0")
        bhis_schema_ok = True
        print("   (Demo-BHIS schema campus_bhis_auth present)")
    except Exception:
        print("   ⚠️  campus_bhis_auth not found. Run migrations first: ./infra/scripts/run.sh db migrate")
        print("   Creating Demo-Circle users only; skipping Demo-BHIS.")

    failed = []
    for u in demo_users:
        try:
            if not create_user(**u):
                failed.append(u["email"])
        except Exception as e:
            print(f"   ❌ {e}")
            failed.append(u["email"])

    if bhis_schema_ok:
        for u in bhis_users:
            try:
                if not create_user(schema_auth="campus_bhis_auth", schema_app="campus_bhis", **u):
                    failed.append(u["email"])
            except Exception as e:
                print(f"   ❌ {e}")
                failed.append(u["email"])

    if failed:
        print(f"\n❌ Failed: {', '.join(failed)}")
        sys.exit(1)
    try:
        c1 = db_execute("SELECT COUNT(*) AS n FROM campus_circle_auth.users")
        c2 = db_execute("SELECT COUNT(*) AS n FROM campus_bhis_auth.users")
        n1 = c1[0]["n"] if c1 else 0
        n2 = c2[0]["n"] if c2 else 0
        print(f"\n✅ Done. Demo-Circle: {n1} auth users; Demo-BHIS: {n2} auth users.")
    except Exception:
        pass
    print("Login (Demo-Circle): demo_admin@campuscircle.com | demo_parent@campuscircle.com | demo_student@campuscircle.com")
    print("Login (Demo-BHIS):  bhis_admin@campuscircle.com | bhis_parent@campuscircle.com | bhis_student@campuscircle.com (password123)")


if __name__ == "__main__":
    main()
