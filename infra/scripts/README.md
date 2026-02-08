# Campus Circle – Infra Scripts

Scripts in `infra/scripts/` manage database, Docker, and setup. Run from **project root** (parent of `infra/`).

## Overview

| Script | Purpose |
|--------|---------|
| `db.py` | DB: migrate, reset, backup, restore (uses `.env`; run Supabase updates without SQL editor) |
| `setup-test-users.sh` | Create admin, parent, and student (after migrations); optional `--disable-email-confirmation` for instructions |
| `docker-manage.sh` | Docker: start, stop, dev, prod, migrate, logs, etc. |
| `sanity-test.sh` | Pre-deploy checks (env, Docker, database/, code); used in CI |

## Quick usage (from repo root)

```bash
# Sanity check
./infra/scripts/sanity-test.sh

# DB: apply migrations to Supabase or local Postgres (no SQL editor)
python infra/scripts/db.py migrate

# DB: fresh reset then migrate
python infra/scripts/db.py reset

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

- `db.py`: `psycopg2-binary` for migrate/reset; `pg_dump` for backup; `psql` for restore
- `.env`: `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`

See main [README](../../README.md) and [docs/DATABASE.md](../../docs/DATABASE.md) for full setup and troubleshooting.
