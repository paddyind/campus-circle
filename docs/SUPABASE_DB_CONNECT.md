# Supabase database connection (Session pooler for IPv4)

If your backend runs on an **IPv4-only** platform (e.g. Vercel, Render, GitHub Actions) or you see **"Network is unreachable"** to `db.xxx.supabase.co`, use the **Session pooler** instead of the direct connection. The pooler host is **region-specific**: you must use the host shown for your project.

## Where to get the correct values

1. Open **Supabase Dashboard** → your project.
2. Go to **Connect to your project** (or **Database** → **Connect**).
3. Stay on the **"Connection String"** tab.
4. Change **Method** from **"Direct connection"** to **"Session pooler"** (or **Connection pooling** → **Session mode**).
5. The URI updates. Either:
   - Copy the full URI and parse host/user/port, or  
   - Click **"View parameters"** and copy **Host**, **Port**, **User** (and use your DB password).
6. Put them in `.env`:
   - `SUPABASE_DB_HOST=` **exactly the host shown** (e.g. `aws-0-eu-west-1.pooler.supabase.com` — region must match your project).
   - `SUPABASE_DB_PORT=5432`
   - `SUPABASE_DB_USER=` **exactly the user shown** (e.g. `postgres.qgbofecjkmihqgfcrdyg`).
   - `SUPABASE_DB_PASSWORD=` your database password.
   - `SUPABASE_DB_SSLMODE=require`
7. Recreate the backend so it loads the new env (e.g. `docker compose -f infra/docker-compose.yml up -d --force-recreate backend`).

## "Tenant or user not found"

This means the **pooler host region is wrong** for your project (e.g. you used `aws-0-us-east-1.pooler.supabase.com` but the project is in EU or APAC). Use the steps above and copy the **exact** Session pooler host (and user) from the Connect dialog; do not guess the region.
