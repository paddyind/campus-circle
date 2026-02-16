#!/usr/bin/env python3
"""
Campus Circle database: run migrations and manage DB using .env credentials.
Use this to apply schema/seed to Supabase or local Postgres without opening SQL editor.

Usage:
  ./infra/scripts/run.sh db migrate   # Run 001–005 (idempotent). run.sh uses .venv + backend/requirements.txt.
  ./infra/scripts/run.sh db setup     # Migrate + create demo users (Demo-Circle, Demo-BHIS) + super admin (one-time/fresh install).
  ./infra/scripts/run.sh db reset     # Drop app schemas, then run 001–005 (fresh DB).
  ./infra/scripts/run.sh db backup    # Dump to database/backup/
  ./infra/scripts/run.sh db restore <path>   # Execute SQL file (e.g. backup)
"""

import os
import sys
import subprocess
from pathlib import Path

# Repo root: infra/scripts -> infra -> project root
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
# Schema/seed SQL files live in database/ (optional when no migration data)
DATABASE_DIR = PROJECT_ROOT / "database"
BACKUPS_DIR = PROJECT_ROOT / "database" / "backup"

def load_env():
    env_file = PROJECT_ROOT / ".env"
    if not env_file.exists():
        print("Error: .env not found in project root.")
        sys.exit(1)
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

def get_conn_params():
    load_env()
    return {
        "host": os.environ.get("SUPABASE_DB_HOST", "localhost"),
        "port": os.environ.get("SUPABASE_DB_PORT", "5432"),
        "dbname": os.environ.get("SUPABASE_DB_NAME", "postgres"),
        "user": os.environ.get("SUPABASE_DB_USER", "postgres"),
        "password": os.environ.get("SUPABASE_DB_PASSWORD", ""),
    }

def run_sql_file(conn, filepath):
    with open(filepath) as f:
        sql = f.read()
    with conn.cursor() as cur:
        try:
            cur.execute(sql)
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"Error executing {filepath}: {e}")
            raise

def run_migrations(conn, paths_only=False):
    order = ["001_schema.sql", "002_seed.sql", "003_tenant_registry.sql", "004_demo_bhis_tenant.sql", "005_super_admins.sql"]
    for name in order:
        path = DATABASE_DIR / name
        if not path.exists():
            continue
        if paths_only:
            yield path
            continue
        print(f"Running {name}...")
        run_sql_file(conn, path)
    if not paths_only:
        print("Migrations done.")

def _require_psycopg2():
    try:
        import psycopg2
        return psycopg2
    except ImportError:
        venv_py = PROJECT_ROOT / ".venv" / "bin" / "python3"
        if venv_py.exists():
            print("psycopg2 not found. Re-running with project venv...")
            os.chdir(PROJECT_ROOT)
            os.execv(venv_py, [str(venv_py)] + sys.argv)
        print("psycopg2 not found. Install it using a project venv:")
        print("  python3 -m venv .venv")
        print("  .venv/bin/pip install -r backend/requirements.txt")
        print("Then run:  ./infra/scripts/run.sh db migrate")
        print("Or from project root:  ./infra/scripts/migrate.sh")
        sys.exit(1)

def migrate():
    psycopg2 = _require_psycopg2()
    p = get_conn_params()
    print(f"Connecting to {p['host']}:{p['port']}/{p['dbname']}...")
    conn = psycopg2.connect(**p)
    try:
        for path in run_migrations(conn, paths_only=True):
            print(f"Running {path.name}...")
            run_sql_file(conn, path)
        print("Done.")
    finally:
        conn.close()

def reset():
    psycopg2 = _require_psycopg2()
    p = get_conn_params()
    print(f"Connecting to {p['host']}:{p['port']}/{p['dbname']}...")
    conn = psycopg2.connect(**p)
    try:
        conn.autocommit = True
        print("Dropping app schemas (campus_circle, campus_bhis, and auth)...")
        with conn.cursor() as cur:
            cur.execute('DROP SCHEMA IF EXISTS "campus-circle" CASCADE;')
            cur.execute("DROP SCHEMA IF EXISTS campus_circle CASCADE;")
            cur.execute("DROP SCHEMA IF EXISTS campus_circle_auth CASCADE;")
            cur.execute("DROP SCHEMA IF EXISTS campus_bhis CASCADE;")
            cur.execute("DROP SCHEMA IF EXISTS campus_bhis_auth CASCADE;")
        conn.autocommit = False
        run_migrations(conn)
    finally:
        conn.close()

def backup():
    load_env()
    p = get_conn_params()
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    from datetime import datetime
    name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    path = BACKUPS_DIR / name
    env = os.environ.copy()
    env["PGPASSWORD"] = p["password"]
    cmd = [
        "pg_dump", "-h", p["host"], "-p", p["port"], "-U", p["user"], "-d", p["dbname"],
        "-n", "campus_circle", "-n", "campus_circle_auth", "--no-owner", "-f", str(path)
    ]
    if subprocess.run(cmd, env=env).returncode != 0:
        print("Backup failed. Ensure pg_dump is installed and DB is reachable.")
        sys.exit(1)
    print(f"Backup written to {path}")

def restore(path_arg):
    if not path_arg or not os.path.isfile(path_arg):
        print("Usage: ./infra/scripts/run.sh db restore <path-to-backup.sql>")
        sys.exit(1)
    p = get_conn_params()
    env = os.environ.copy()
    env["PGPASSWORD"] = p["password"]
    print(f"Restoring from {path_arg}...")
    r = subprocess.run(
        ["psql", "-h", p["host"], "-p", p["port"], "-U", p["user"], "-d", p["dbname"], "-v", "ON_ERROR_STOP=1", "-f", path_arg],
        env=env,
    )
    if r.returncode != 0:
        print("Restore failed.")
        sys.exit(1)
    print("Restore done.")

def setup():
    """Run migrate, then create demo users (Demo-Circle + Demo-BHIS) and super admin."""
    migrate()
    py = sys.executable
    scripts_dir = PROJECT_ROOT / "infra" / "scripts"
    r1 = subprocess.run([py, str(scripts_dir / "setup_test_users.py")], cwd=PROJECT_ROOT)
    r2 = subprocess.run([py, str(scripts_dir / "setup_super_admin.py")], cwd=PROJECT_ROOT)
    if r1.returncode != 0 or r2.returncode != 0:
        sys.exit(1)
    print("Setup done. See docs/TENANTS_AND_DEPLOYMENT.md for login credentials.")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    cmd = sys.argv[1].lower()
    if cmd == "migrate":
        migrate()
    elif cmd == "setup":
        setup()
    elif cmd == "reset":
        reset()
    elif cmd == "backup":
        backup()
    elif cmd == "restore":
        restore(sys.argv[2] if len(sys.argv) > 2 else None)
    else:
        print("Commands: migrate | setup | reset | backup | restore <path>")
        sys.exit(1)

if __name__ == "__main__":
    main()
