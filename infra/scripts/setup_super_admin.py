#!/usr/bin/env python3
"""
Create the super-admin user in Supabase Auth and add to public.super_admins.
Super admins can log in once and switch to any tenant with admin role in all of them.

Usage: ./infra/scripts/run.sh setup_super_admin
       SUPER_ADMIN_EMAIL=superadmin@example.com SUPER_ADMIN_PASSWORD=secret ./infra/scripts/run.sh setup_super_admin

Requires: .env with SUPABASE_* and DB credentials. Run migrations first (005_super_admins.sql).
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

EMAIL = os.environ.get("SUPER_ADMIN_EMAIL", "superadmin@campuscircle.com")
PASSWORD = os.environ.get("SUPER_ADMIN_PASSWORD", "password123")
FULL_NAME = os.environ.get("SUPER_ADMIN_FULL_NAME", "Super Admin")

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


def main():
    print(f"Super admin: {EMAIL}")
    admin_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    r = requests.get(admin_url, headers=headers, timeout=10)
    if r.status_code != 200:
        print(f"Auth API error: {r.status_code}")
        sys.exit(1)

    users = r.json().get("users", [])
    email_lower = EMAIL.lower()
    match = next((u for u in users if (u.get("email") or "").lower() == email_lower), None)
    auth_user_id = match["id"] if match else None

    if auth_user_id:
        print(f"User already exists in Supabase Auth: {auth_user_id}")
        requests.put(
            f"{admin_url}/{auth_user_id}",
            headers=headers,
            json={"email_confirm": True, "user_metadata": {"full_name": FULL_NAME}},
            timeout=10,
        )
    else:
        r2 = requests.post(
            admin_url,
            headers=headers,
            json={
                "email": EMAIL,
                "password": PASSWORD,
                "email_confirm": True,
                "auto_confirm": True,
                "user_metadata": {"full_name": FULL_NAME},
            },
            timeout=10,
        )
        if r2.status_code not in (200, 201):
            print(f"Create failed: {r2.status_code} {r2.text[:200]}")
            sys.exit(1)
        auth_user_id = r2.json().get("id")
        print(f"Created in Supabase Auth: {auth_user_id}")

    conn = get_db_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO public.super_admins (auth_user_id) VALUES (%s) ON CONFLICT (auth_user_id) DO NOTHING",
                (auth_user_id,),
            )
            conn.commit()
        print("Added to public.super_admins")
    except Exception as e:
        print(f"DB error (run migrations first: ./infra/scripts/run.sh db migrate): {e}")
        sys.exit(1)
    finally:
        conn.close()

    print(f"Login: {EMAIL} / {PASSWORD}")
    print("This user can switch to any tenant and has admin role in all of them.")


if __name__ == "__main__":
    main()
