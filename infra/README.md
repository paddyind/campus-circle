# Infrastructure

Campus Circle infrastructure: Docker, scripts, and (future) deployment assets.

## Layout

- **docker-compose.yml** – Local services (backend, frontend, db, nginx, migrations)
- **Dockerfile.backend**, **Dockerfile.frontend** – Backend and frontend (frontend is multi-stage: dev + prod); migrations use `postgres:15-alpine` image
- **nginx.conf** – Reverse proxy config for production-style serving
- **scripts/** – DB (db.py), Docker (docker-manage.sh), setup-test-users (admin/parent/student), sanity-test

## Future

- **Helm charts** – Will live here for Kubernetes deployment (e.g. `infra/helm/` or `infra/charts/`).
- **Multi-DB support** – Scripts and config can be extended to support additional databases alongside PostgreSQL/Supabase; migration and connection logic will remain in `database/` and `infra/scripts/`.

## Running locally

From project root:

```bash
./infra/scripts/docker-manage.sh dev    # Frontend + backend + DB
./infra/scripts/docker-manage.sh migrate
python infra/scripts/db.py migrate      # Or apply to Supabase using .env
```

See [infra/scripts/README.md](scripts/README.md) for all script usage.
