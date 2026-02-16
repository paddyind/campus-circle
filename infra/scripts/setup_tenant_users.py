#!/usr/bin/env python3
"""
Create or sync demo users for a specific tenant only. Use after migrations.
Supabase Auth is global; we mirror each user into the tenant's auth schema (e.g. campus_bhis_auth.users)
so that tenant has its own "user list" for FKs and demo separation.

Usage:
  ./infra/scripts/run.sh setup_tenant_users demo-bhis   # Create BHIS users in Supabase Auth + campus_bhis_auth / campus_bhis
  ./infra/scripts/run.sh setup_tenant_users demo-circle  # Create Demo-Circle users only

Requires: .env with SUPABASE_* and DB credentials. Run migrations first for the target tenant.
"""
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent


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
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError as e:
    print(f"Missing dependency: {e}. Install: pip install -r backend/requirements.txt", file=sys.stderr)
    sys.exit(1)


def get_db_conn():
    conn_kw = {"host": DB_HOST, "port": DB_PORT, "dbname": DB_NAME, "user": DB_USER, "password": DB_PASSWORD}
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


# Tenant config: slug -> (schema_auth, schema_app, list of user dicts)
TENANTS = {
    "demo-circle": (
        "campus_circle_auth",
        "campus_circle",
        [
            {"email": "demo_admin@campuscircle.com", "password": "password123", "full_name": "Admin User", "role": "admin", "user_type": "admin", "phone": "N/A"},
            {"email": "demo_parent@campuscircle.com", "password": "password123", "full_name": "John Doe", "role": "parent", "user_type": "parent", "phone": "123-456-7890"},
            {"email": "demo_student@campuscircle.com", "password": "password123", "full_name": "Jane Doe", "role": "student", "user_type": "student", "dob": "2010-05-15"},
        ],
    ),
    "demo-bhis": (
        "campus_bhis_auth",
        "campus_bhis",
        [
            {"email": "bhis_admin@campuscircle.com", "password": "password123", "full_name": "BHIS Admin", "role": "admin", "user_type": "admin", "phone": "N/A"},
            {"email": "bhis_parent@campuscircle.com", "password": "password123", "full_name": "BHIS Parent", "role": "parent", "user_type": "parent", "phone": "555-1111"},
            {"email": "bhis_student@campuscircle.com", "password": "password123", "full_name": "BHIS Student", "role": "student", "user_type": "student", "dob": "2011-03-10"},
        ],
    ),
}


def create_user(email, password, full_name, role, user_type, schema_auth, schema_app, phone=None, dob=None):
    admin_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    print(f"  Creating {user_type}: {email}...")

    r = requests.get(admin_url, headers=headers, timeout=10)
    if r.status_code != 200:
        print(f"    ❌ Auth API error: {r.status_code}")
        return False

    users = r.json().get("users", [])
    email_lower = email.lower()
    match = next((u for u in users if (u.get("email") or "").lower() == email_lower), None)
    auth_user_id = match["id"] if match else None

    if auth_user_id:
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
            print(f"    ❌ Create failed: {r2.status_code} {r2.text[:200]}")
            return False
        auth_user_id = r2.json().get("id")

    try:
        db_execute(
            f"""INSERT INTO {schema_auth}.users (id, email, email_confirmed_at)
               VALUES (%s, %s, NOW())
               ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, email_confirmed_at = EXCLUDED.email_confirmed_at""",
            (auth_user_id, email),
        )
        db_execute(
            f"INSERT INTO {schema_app}.users (id, role) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role",
            (auth_user_id, role),
        )
        if user_type in ("admin", "parent"):
            db_execute(
                f"""INSERT INTO {schema_app}.parents (id, email, full_name, phone)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone""",
                (auth_user_id, email, full_name, phone or "N/A"),
            )
        elif user_type == "student":
            db_execute(
                f"""INSERT INTO {schema_app}.students (id, auth_user_id, full_name, dob, status)
                   VALUES (%s, %s, %s, %s, 'active')
                   ON CONFLICT (id) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id, full_name = EXCLUDED.full_name, dob = EXCLUDED.dob""",
                (auth_user_id, auth_user_id, full_name, dob),
            )
        print(f"    ✅ {schema_auth}.users + {schema_app}.*")
        return True
    except Exception as e:
        print(f"    ❌ DB: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("Available tenants:", ", ".join(TENANTS))
        sys.exit(0)

    slug = sys.argv[1].strip().lower()
    if slug not in TENANTS:
        print(f"Unknown tenant: {slug}. Use one of: {', '.join(TENANTS)}", file=sys.stderr)
        sys.exit(1)

    schema_auth, schema_app, users = TENANTS[slug]
    print(f"Ensuring tenant '{slug}' users in {schema_auth} / {schema_app}...")

    try:
        db_execute(f"SELECT 1 FROM {schema_auth}.users LIMIT 0")
    except Exception as e:
        print(f"❌ Schema not found: {e}. Run migrations first: ./infra/scripts/run.sh db migrate")
        sys.exit(1)

    failed = []
    for u in users:
        if not create_user(
            schema_auth=schema_auth,
            schema_app=schema_app,
            email=u["email"],
            password=u["password"],
            full_name=u["full_name"],
            role=u["role"],
            user_type=u["user_type"],
            phone=u.get("phone"),
            dob=u.get("dob"),
        ):
            failed.append(u["email"])

    if failed:
        print(f"Failed: {', '.join(failed)}")
        sys.exit(1)

    count = db_execute(f"SELECT COUNT(*) AS n FROM {schema_auth}.users")
    print(f"✅ Done. {schema_auth}.users has {count[0]['n']} row(s).")
    print(f"Login: {' | '.join(u['email'] for u in users)} (password123)")


if __name__ == "__main__":
    main()
