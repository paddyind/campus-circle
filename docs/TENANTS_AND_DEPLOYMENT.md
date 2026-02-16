# Tenants and Deployment

This document covers the **tenant-based product model** (Demo-Circle as default, client tenants, baseline) and **deployment to Firebase / free hosting**. Test data, CI, and documentation structure stay unchanged.

---

## Quick setup (one-time)

From project root, with `.env` configured for your DB:

1. **Migrations + demo users + super admin (recommended):**
   ```bash
   ./infra/scripts/run.sh db setup
   ```
   This uses the project’s `.venv` and `backend/requirements.txt` (created automatically if missing), runs migrations 001→005, then demo users (Demo-Circle + Demo-BHIS) and super admin.

2. **Or step by step:**  
   `./infra/scripts/run.sh db migrate` → then `./infra/scripts/run.sh setup_test_users` and `./infra/scripts/run.sh setup_super_admin` (or use `run.sh db setup` to do all at once).

3. **Start the app:**  
   `./infra/scripts/docker-manage.sh build` then `./infra/scripts/docker-manage.sh dev`.

For a full list of scripts and when to use them, see [infra/scripts/README.md](../infra/scripts/README.md).

---

## 1. Tenant Model Overview

### 1.1 Concepts

| Concept | Description |
|--------|-------------|
| **Default / parent tenant** | **Demo-Circle** — internal-only tenant with demo data and admin privileges to create new tenants. |
| **Client tenant** | A separate tenant for a customer (e.g. "Acme School District") with its own users, roles, data, and optional settings. |
| **Tenant registry** | Table `public.tenants`: id, name, slug, schema_app, schema_auth, is_internal, settings. |
| **Schema-per-tenant** | Each tenant has its own PostgreSQL schemas: app (e.g. `campus_circle` or `tenant_acme`) and auth (e.g. `campus_circle_auth` or `tenant_acme_auth`). Data is isolated by schema. |

### 1.2 Demo-Circle (Default / Parent Tenant)

- **Name:** Demo-Circle  
- **Slug:** `demo-circle`  
- **App schema:** `campus_circle`  
- **Auth schema:** `campus_circle_auth`  
- **Is internal:** Yes (demo data, admin privileges to access all tenants and manage tenant settings).  
- **Registry:** One row in `public.tenants` (migration `003_tenant_registry.sql`).

Demo-Circle admins manage **only the Demo-Circle tenant** (users, schools, events, etc.). They do not see the tenant switcher and cannot switch to other tenants.

### 1.3 Demo-BHIS (Second Tenant)

- **Name:** Demo-BHIS  
- **Slug:** `demo-bhis`  
- **App schema:** `campus_bhis`  
- **Auth schema:** `campus_bhis_auth`  
- **Is internal:** No.  
- **Registry:** Inserted by migration `004_demo_bhis_tenant.sql`.  
- **Data:** Same structure as Demo-Circle; seed data uses BHIS-prefixed names (e.g. BHIS_Annual Science Fair, BHIS Greenwood High School). Demo users: `bhis_admin@campuscircle.com`, `bhis_parent@campuscircle.com`, `bhis_student@campuscircle.com` (created by `setup-test-users.sh`).

### 1.4 Super Admin (login across all tenants, same role everywhere)

- **Table:** `public.super_admins` — one row per Supabase auth user id (migration `005_super_admins.sql`).  
- **Behaviour:** Super admins can log in once and **switch to any tenant** via the tenant switcher. They have **admin role in every tenant** without needing a user row in that tenant’s schema.  
- **Setup:** Run `./infra/scripts/run.sh setup_super_admin` (after migrations). Creates `superadmin@campuscircle.com` in Supabase Auth and adds their id to `public.super_admins`. Optional env: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_FULL_NAME`.

### 1.5 Tenant Switching and Default Tenant

- **Resolution:** Backend resolves tenant from `X-Tenant` header (slug) or uses the user’s default (first allowed tenant).  
- **Allowed tenants:** Only **super admins** (in `public.super_admins`) get all tenants. Tenant admins (e.g. Demo-Circle admin, Demo-BHIS admin) get only the single tenant where they have a user record.  
- **Frontend:** The tenant switcher is shown **only to super admins**. Tenant admins manage their one tenant only (no switcher). Choice is stored in `localStorage` and sent as `X-Tenant` on every request.

### 1.6 Future Client Tenants

- **Naming:** `tenant_<slug>` (e.g. `tenant_acme` / `tenant_acme_auth`) or dedicated schemas like `campus_bhis`.  
- **Creation:** Scripts or admin API create new schemas from the baseline, optionally apply demo seed, then insert a row into `public.tenants`.  
- **Switching:** Same as above (X-Tenant header and tenant switcher).

### 1.7 Auth: Supabase is global; we differentiate per tenant with a mirror per schema

**Supabase Auth is shared:** All logins use the same `auth.users` table and the same JWT. There is no “separate login” per tenant at the Supabase level.

**How we differentiate per tenant:** Each tenant has its own **auth mirror** table: `campus_circle_auth.users`, `campus_bhis_auth.users`, etc. We only insert (mirror) the users that **belong to that tenant** into that tenant’s auth schema. The app schema (e.g. `campus_bhis.users`, `campus_bhis.parents`) references the **tenant’s** auth schema via FK, so each tenant sees only its own users and stays self-contained for demo and isolation.

| Where | Purpose |
|-------|---------|
| **Supabase `auth.users`** | Single source of truth for login (email/password, JWT). Global. |
| **`campus_circle_auth.users`** | Mirror: only Demo-Circle users (id + email). Used by `campus_circle.users` FK. |
| **`campus_bhis_auth.users`** | Mirror: only Demo-BHIS users (id + email). Used by `campus_bhis.users` FK. |

- **Demo / tenant-specific logins:** Use different emails per tenant (e.g. `demo_admin@…` for Demo-Circle, `bhis_admin@…` for Demo-BHIS). Each is one row in `auth.users` and one row in **that tenant’s** auth mirror. So each tenant has its own visible “user list” for demos.
- **One person, many tenants:** The same `auth.users` id can be mirrored into **multiple** tenant auth schemas so one login can access several tenants; the backend decides which tenant(s) they can use.

**Scripts:** Run migrations first so the tenant’s auth schema exists. Then create/mirror users:

- `./infra/scripts/setup-test-users.sh` — creates Demo-Circle and Demo-BHIS users (if `campus_bhis_auth` exists).
- `./infra/scripts/run.sh setup_tenant_users demo-bhis` — creates or syncs only Demo-BHIS users into `campus_bhis_auth` / `campus_bhis` (run after `004_demo_bhis_tenant.sql`).
- `./infra/scripts/run.sh setup_super_admin` — creates the super-admin user in Supabase Auth and adds their id to `public.super_admins` (run after 005). Env: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`.

---

## 2. Implementation Phases

### Phase 1 (Done): Base tenant and baseline

- [x] **Tenant registry:** `public.tenants` with Demo-Circle row.  
- [x] **Docs and CI:** ARCHITECTURE and README updated; migrations include 003; sanity tests unchanged.

### Phase 2 (Done): Tenant resolution and multi-tenant API

- [x] **Tenant resolution:** Middleware reads `X-Tenant` header (or user default); resolves schema from `public.tenants`; sets request tenant context.  
- [x] **Backend:** All queries use resolved schema (campus_circle or campus_bhis, etc.) via context.  
- [x] **Frontend:** Tenant switcher in navbar; `X-Tenant` sent on every request; `GET /api/tenants` and `GET /api/tenants/current`.  
- [x] **Super admin:** Users in `public.super_admins` can access all tenants and have admin role in every tenant (no per-tenant user row).  
- [x] **Parent admin:** Demo-Circle admins can access all tenants; RoleChecker allows admin actions in any tenant for super admins and Demo-Circle admins.  
- [x] **Admin tenant settings:** `GET/PUT /api/admin/tenants/{slug}/settings` and Admin → Tenant Settings page.

### Phase 3 (Later): Create-tenant flow

- Allowed only from Demo-Circle (or super-admin).  
- Scripts or admin API: create schemas from baseline (001_schema parameterized by slug), optional seed (002-style), insert into `public.tenants`.  
- Optional: tenant-specific settings (branding, features, limits).

---

## 3. Baseline: Artifacts and New Tenant Creation

### 3.1 Baseline Artifacts

| Artifact | Purpose |
|----------|---------|
| `database/001_schema.sql` | Full schema for one tenant (app + auth). **Template** for a new tenant’s schema. |
| `database/002_seed.sql` | Demo/seed data (schools, classes, roles, events). Reusable when provisioning a new tenant. |
| `database/003_tenant_registry.sql` | Creates `public.tenants` and inserts Demo-Circle. Run after 001 and 002. |
| `database/004_demo_bhis_tenant.sql` | Creates Demo-BHIS schemas (`campus_bhis`, `campus_bhis_auth`), BHIS-prefixed seed data, and inserts Demo-BHIS into `public.tenants`. Run after 003. |
| `database/005_super_admins.sql` | Creates `public.super_admins(auth_user_id)`. Users listed here can access all tenants and have admin role in every tenant (no per-tenant user row). |
| `infra/scripts/setup-test-users.sh` | Demo users for **Demo-Circle** and **Demo-BHIS** in Supabase Auth and per-tenant auth/app schemas. Run **after** migrations (004 for BHIS). |
| `infra/scripts/setup_tenant_users.py <slug>` | Create/sync users for **one tenant** only (e.g. `demo-bhis`). Use after migrations so that tenant’s auth schema exists; ensures users appear in e.g. `campus_bhis_auth.users`. |

For **Demo-Circle**, schemas are `campus_circle` and `campus_circle_auth`. For **Demo-BHIS**, `campus_bhis` and `campus_bhis_auth`. Each tenant’s auth schema holds only the users that belong to that tenant (mirrored from Supabase Auth).

### 3.2 How to Create a New Tenant (Future)

When Phase 3 is implemented:

**Inputs:** Slug (e.g. `acme`), display name, optional “copy demo seed”.

**Steps (to script or expose via admin API):**

1. Use `001_schema.sql` as template: replace `campus_circle` → `tenant_<slug>`, `campus_circle_auth` → `tenant_<slug>_auth`.  
2. Execute the parameterized schema SQL (create new schemas only).  
3. Optionally run a parameterized `002_seed.sql` against the new app schema.  
4. Insert row into `public.tenants`: name, slug, schema_app = `tenant_<slug>`, schema_auth = `tenant_<slug>_auth`, is_internal = false.

**Future scripts/API:** e.g. `infra/scripts/create-tenant.sh` or `POST /api/admin/tenants` (Demo-Circle only).

### 3.3 Data Separation

- **Demo-Circle:** All data in `campus_circle` and `campus_circle_auth`.  
- **Demo-BHIS:** All data in `campus_bhis` and `campus_bhis_auth`.  
- **Other tenants:** Each has its own schemas; queries use the resolved tenant schema (from `X-Tenant` or default).

---

## 4. Deployment (Firebase and Free Hosting)

### 4.1 Overview

| Layer | Recommended (free) | Alternatives |
|-------|--------------------|--------------|
| **Frontend** | Firebase Hosting | Vercel, Netlify, GitHub Pages |
| **Backend** | Cloud Run (FastAPI in container) | Railway, Render, Fly.io |
| **Database** | Supabase (existing) | Keep current PostgreSQL/Supabase |
| **Auth** | Supabase Auth (existing) | Keep current JWT flow |

Goals: deploy to Firebase or other free hosting; keep CI, test data, and doc structure unchanged.

### 4.2 Firebase Hosting (Frontend)

**Prerequisites:** Node.js, npm, Firebase CLI (`npm install -g firebase-tools`), Firebase project.

**Steps:**

1. Build: `cd frontend && npm ci && npm run build` (set `REACT_APP_API_URL` to deployed backend URL).  
2. Init: `firebase login` and `firebase init hosting`; set public directory to `frontend/build`; single-page app rewrites to `index.html`.  
3. Deploy: `firebase deploy --only hosting`.

**Optional `firebase.json`:**

```json
{
  "hosting": {
    "public": "frontend/build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

### 4.3 Backend (Cloud Run or other)

- **Cloud Run:** Build image from `infra/Dockerfile.backend`, push to Artifact Registry (or Docker Hub), deploy to Cloud Run with env vars (`SUPABASE_*`, etc.). Expose HTTPS URL and set frontend `REACT_APP_API_URL` to it (e.g. `https://xxx.run.app/api`).  
- **Railway / Render / Fly.io:** Deploy same Docker image or run `uvicorn`; set env vars in dashboard.

### 4.4 Database and Auth

- Keep Supabase (PostgreSQL + Auth). Run `./infra/scripts/run.sh db migrate` (or `./infra/scripts/docker-manage.sh migrate`) including 001–004.  
- Test data: `002_seed.sql` and `004_demo_bhis_tenant.sql` for seed data; `setup-test-users.sh` creates Demo-Circle and Demo-BHIS demo users.

### 4.5 CI and Test Data

- CI: existing sanity test and build steps unchanged.  
- Optional: add Firebase deploy step (e.g. on push to `main`) using a Firebase token secret.

### 4.6 Environment Variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `REACT_APP_API_URL` | Frontend build | Backend API base (e.g. `https://xxx.run.app/api`) |
| `SUPABASE_URL` | Backend | Supabase project URL |
| `SUPABASE_ANON_KEY` | Backend | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Service role (if used) |
| `SUPABASE_DB_*` | Backend / migrations | PostgreSQL connection |

---

## 5. Documentation Map

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System overview, tenant model, Demo-Circle as default. |
| [TENANTS_AND_DEPLOYMENT.md](TENANTS_AND_DEPLOYMENT.md) | This file: tenants (model, baseline, phases) and deployment. |
| [DATABASE.md](DATABASE.md) | Schema details, migrations, backups. |

---

## 6. Summary

- **Phase 1 (done):** Demo-Circle as default tenant, `public.tenants` registry, baseline documented.  
- **Phase 2 (done):** Tenant resolution via `X-Tenant`, Demo-BHIS tenant (schema + seed + registry), tenant switcher in UI, parent admin access to all tenants and Tenant Settings page, BHIS demo users in `setup-test-users.sh`.  
- **Later:** Create-tenant flow (Phase 3), then deploy to Firebase or other free hosting using this doc.
