#!/usr/bin/env python3
"""
Remove cross-tenant user contamination.

Demo-Circle users (demo_admin, demo_parent, demo_student) should ONLY be in campus_circle.
Demo-BHIS users (bhis_admin, bhis_parent, bhis_student) should ONLY be in campus_bhis.

This script removes:
- demo_* users from campus_bhis (they belong in campus_circle only)
- bhis_* users from campus_circle (they belong in campus_bhis only)

Usage:
  ./infra/scripts/run.sh fix_tenant_users
  # Or: python infra/scripts/fix_tenant_users.py
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

DB_HOST = os.environ.get("SUPABASE_DB_HOST", "db")
DB_PORT = os.environ.get("SUPABASE_DB_PORT", "5432")
DB_NAME = os.environ.get("SUPABASE_DB_NAME", "postgres")
DB_USER = os.environ.get("SUPABASE_DB_USER", "postgres")
DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Missing psycopg2. Install: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)


def get_db_conn():
    conn_kw = {
        "host": DB_HOST,
        "port": int(DB_PORT),
        "dbname": DB_NAME,
        "user": DB_USER,
        "password": DB_PASSWORD,
    }
    if "supabase.co" in str(DB_HOST):
        conn_kw["sslmode"] = "require"
    return psycopg2.connect(**conn_kw)


def main():
    print("Fixing cross-tenant user contamination...")
    print(f"DB: {DB_HOST}:{DB_PORT}/{DB_NAME}")

    conn = get_db_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. List current state
            cur.execute(
                "SELECT u.id, au.email, u.role FROM campus_circle.users u "
                "LEFT JOIN campus_circle_auth.users au ON u.id = au.id ORDER BY au.email"
            )
            circle_users = cur.fetchall()
            cur.execute(
                "SELECT u.id, au.email, u.role FROM campus_bhis.users u "
                "LEFT JOIN campus_bhis_auth.users au ON u.id = au.id ORDER BY au.email"
            )
            bhis_users = cur.fetchall()

            print("\nBefore:")
            print(f"  campus_circle: {[r['email'] for r in circle_users]}")
            print(f"  campus_bhis:   {[r['email'] for r in bhis_users]}")

            # 2. Remove demo_* from campus_bhis (app tables first, then auth due to FK order)
            demo_in_bhis = [r for r in bhis_users if r["email"] and r["email"].lower().startswith("demo_")]
            if demo_in_bhis:
                print(f"\nRemoving demo users from campus_bhis: {[r['email'] for r in demo_in_bhis]}")
                for r in demo_in_bhis:
                    uid = r["id"]
                    cur.execute(
                        "UPDATE campus_bhis.contact_submissions SET user_id = NULL, related_organizer_id = NULL "
                        "WHERE user_id = %s OR related_organizer_id = %s",
                        (uid, uid),
                    )
                    cur.execute("DELETE FROM campus_bhis.users WHERE id = %s", (uid,))
                    cur.execute("DELETE FROM campus_bhis.parents WHERE id = %s", (uid,))
                    cur.execute(
                        "DELETE FROM campus_bhis.students WHERE auth_user_id = %s",
                        (uid,),
                    )
                    cur.execute("DELETE FROM campus_bhis_auth.users WHERE id = %s", (uid,))

            # 3. Remove bhis_* from campus_circle
            bhis_in_circle = [
                r for r in circle_users if r["email"] and r["email"].lower().startswith("bhis_")
            ]
            if bhis_in_circle:
                print(f"\nRemoving bhis users from campus_circle: {[r['email'] for r in bhis_in_circle]}")
                for r in bhis_in_circle:
                    uid = r["id"]
                    cur.execute(
                        "UPDATE campus_circle.contact_submissions SET user_id = NULL, related_organizer_id = NULL "
                        "WHERE user_id = %s OR related_organizer_id = %s",
                        (uid, uid),
                    )
                    cur.execute("DELETE FROM campus_circle.users WHERE id = %s", (uid,))
                    cur.execute("DELETE FROM campus_circle.parents WHERE id = %s", (uid,))
                    cur.execute(
                        "DELETE FROM campus_circle.students WHERE auth_user_id = %s",
                        (uid,),
                    )
                    cur.execute("DELETE FROM campus_circle_auth.users WHERE id = %s", (uid,))

            conn.commit()

            # 4. Verify
            cur.execute(
                "SELECT u.id, au.email FROM campus_circle.users u "
                "LEFT JOIN campus_circle_auth.users au ON u.id = au.id ORDER BY au.email"
            )
            circle_after = cur.fetchall()
            cur.execute(
                "SELECT u.id, au.email FROM campus_bhis.users u "
                "LEFT JOIN campus_bhis_auth.users au ON u.id = au.id ORDER BY au.email"
            )
            bhis_after = cur.fetchall()

            print("\nAfter:")
            print(f"  campus_circle: {[r['email'] for r in circle_after]}")
            print(f"  campus_bhis:   {[r['email'] for r in bhis_after]}")

            if not demo_in_bhis and not bhis_in_circle:
                print("\nNo cross-tenant contamination found. Data was already correct.")
            else:
                print("\nDone. Cross-tenant users removed. Re-run setup_tenant_users if any tenants are missing users.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
