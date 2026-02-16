-- Super admins: one row per Supabase auth user id. These users can access all tenants
-- and are treated as admin in every tenant (no per-tenant user row required).
-- See docs/TENANTS_AND_DEPLOYMENT.md.

CREATE TABLE IF NOT EXISTS public.super_admins (
  auth_user_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.super_admins IS 'Supabase auth user ids that have super-admin: access all tenants, admin role in every tenant. No FK to auth.users so it works with Supabase (auth in separate service).';
