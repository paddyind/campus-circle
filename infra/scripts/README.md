# Campus Circle – Infra Scripts

Scripts in `infra/scripts/` manage database, Docker, and setup. Run from **project root** (parent of `infra/`).

## Overview

| Script | Purpose |
|--------|---------|
| `db.py` | DB: migrate, reset, backup, restore (uses `.env`; run Supabase updates without SQL editor) |
| `migrate.sh` | Run migrations (calls `python3` or `python`; use if `python` is not in PATH) |
| `setup-test-users.sh` | Create admin, parent, and student (after migrations); optional `--disable-email-confirmation` for instructions |
| `docker-manage.sh` | Docker: start, stop, dev, prod, migrate, logs, etc. |
| `sanity-test.sh` | Pre-deploy checks (env, Docker, database/, code); used in CI |

## Quick usage (from repo root)

```bash
# Sanity check
./infra/scripts/sanity-test.sh

# DB: apply migrations to Supabase or local Postgres (no SQL editor)
# Dependencies are in backend/requirements.txt. migrate.sh uses project .venv if present.
./infra/scripts/migrate.sh
# One-time: create venv and install deps so migrate.sh works:
#   python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
# Then: .venv/bin/python3 infra/scripts/db.py migrate

# DB: fresh reset then migrate
python3 infra/scripts/db.py reset

# DB: backup / restore (backups go to database/backup/)
python infra/scripts/db.py backup
python infra/scripts/db.py restore database/backup/backup_YYYYMMDD_HHMMSS.sql

# Docker: dev (frontend + backend + db)
./infra/scripts/docker-manage.sh dev

# Docker: run migrations (local DB)
./infra/scripts/docker-manage.sh migrate

# Create admin, parent, student (after migrations). Uses backend/requirements.txt.
./infra/scripts/setup-test-users.sh
```

## Paths

- **Schema/seed**: `database/` (001_schema.sql, 002_seed.sql when present; structure in place without migration data is fine)
- **.env**: Project root. Required for DB scripts and Docker.
- **Backups**: `database/backup/` (created by `db.py backup`; initial/demo data can also live here)

## Requirements

- **Dependencies**: All Python deps (including `psycopg2-binary` for db.py) are in **`backend/requirements.txt`**. Use a project venv: `python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt`. Then `./infra/scripts/migrate.sh` and `./infra/scripts/setup-test-users.sh` use `.venv` automatically.
- `db.py` also needs `pg_dump` for backup and `psql` for restore (system tools).
- `.env`: `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`

See main [README](../../README.md) and [docs/DATABASE.md](../../docs/DATABASE.md) for full setup and troubleshooting.
