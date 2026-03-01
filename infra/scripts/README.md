# Infra Scripts

Run all commands from **project root**. Python scripts should be run via **`./infra/scripts/run.sh`** so the project's `.venv` and `backend/requirements.txt` are used (no need for system Python to have the right libraries).

## One-time setup (recommended)

After cloning and configuring `.env`:

```bash
./infra/scripts/run.sh db setup
```

This runs **migrate** (001→005) then **demo users** (Demo-Circle + Demo-BHIS) and **super admin**. One command for a full demo-ready DB.

## Runner script (use this for Python)

| Invocation | What it runs |
|------------|----------------|
| `./infra/scripts/run.sh db setup` | `db.py setup` (migrate + users + super admin) |
| `./infra/scripts/run.sh db migrate` | `db.py migrate` |
| `./infra/scripts/run.sh db reset` | `db.py reset` |
| `./infra/scripts/run.sh db backup` | `db.py backup` |
| `./infra/scripts/run.sh db restore <path>` | `db.py restore` |
| `./infra/scripts/run.sh setup_super_admin` | `setup_super_admin.py` |
| `./infra/scripts/run.sh setup_tenant_users demo-bhis` | `setup_tenant_users.py demo-bhis` |
| `./infra/scripts/run.sh infra/scripts/db.py setup` | Any script by path |

`run.sh` creates `.venv` and installs `backend/requirements.txt` if needed, then runs the script with that interpreter.

## Scripts at a glance

| What you need | Command | Notes |
|---------------|---------|--------|
| **Full DB + users (first time)** | `./infra/scripts/run.sh db setup` | Migrate + demo users + super admin |
| **Schema only** | `./infra/scripts/run.sh db migrate` | 001–005 in order |
| **Fresh DB (drop & re-run)** | `./infra/scripts/run.sh db reset` | Drops app schemas, then migrate |
| **Backup / restore** | `./infra/scripts/run.sh db backup` / `restore <path>` | Backups under `database/backup/` |
| **Demo users (both tenants)** | `./infra/scripts/setup-test-users.sh` | Or `./infra/scripts/run.sh setup_test_users` |
| **One tenant’s users** | `./infra/scripts/run.sh setup_tenant_users demo-bhis` | After 004 for that tenant |
| **Super admin only** | `./infra/scripts/run.sh setup_super_admin` | After 005; env: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` |
| **Verify before push (CI-like)** | `./infra/scripts/ci-verify.sh` | Sanity tests + docker compose config. Add `--build` to also build images. |
| **Docker run (demo/MVP)** | `./infra/scripts/docker-manage.sh run` | Stop all, then build + start backend + frontend dev. http://localhost:3000. |
| **Docker dev** | `./infra/scripts/docker-manage.sh dev` | Build + recreate backend + frontend (http://localhost:3000). |
| **Docker prod** | `./infra/scripts/docker-manage.sh prod` | Backend + Nginx (needs existing `frontend/build`). |
| **Docker deploy** | `./infra/scripts/docker-manage.sh deploy` | Stop all, build frontend + backend, start prod stack. |
| **Docker migrate** | `./infra/scripts/docker-manage.sh migrate` | Runs migrations in Docker. |
| **Android (Capacitor)** | `./infra/scripts/docker-manage.sh android` | Build web, sync, open Android Studio. Use `REACT_APP_API_URL` for device. |
| **iOS (Capacitor)** | `./infra/scripts/docker-manage.sh ios` | Build web, sync, open Xcode. Use `REACT_APP_API_URL` for device. |
| **Pre-deploy check** | `./infra/scripts/sanity-test.sh` | Used in CI |

## SQL migrations (database/)

| File | Purpose |
|------|--------|
| 001_schema.sql | Demo-Circle app + auth schemas |
| 002_seed.sql | Demo-Circle seed (schools, events, roles) |
| 003_tenant_registry.sql | `public.tenants` + Demo-Circle row |
| 004_demo_bhis_tenant.sql | Demo-BHIS schemas + seed + tenant row |
| 005_super_admins.sql | `public.super_admins` table |

Order is fixed in `db.py`; do not skip or reorder.

## Paths and env

- **.env**: Project root. Required for DB and user-setup scripts.
- **Backups**: `database/backup/` (created by `db.py backup`).

See [TENANTS_AND_DEPLOYMENT.md](../../docs/TENANTS_AND_DEPLOYMENT.md) for tenants, super admin, and deployment.
