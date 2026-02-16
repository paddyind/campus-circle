-- Tenant registry: single table in public schema for all tenants.
-- Demo-Circle is the default/internal tenant; current schema (campus_circle) is its app schema.
-- New clients get their own schemas (e.g. tenant_<slug>) created from the same baseline; see docs/TENANTS_AND_DEPLOYMENT.md.

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  schema_app TEXT NOT NULL,
  schema_auth TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.tenants IS 'Registry of tenants. Demo-Circle is the default internal tenant; client tenants use schema_app/schema_auth with prefix (e.g. tenant_<slug>).';
COMMENT ON COLUMN public.tenants.schema_app IS 'PostgreSQL schema name for application data (e.g. campus_circle or tenant_acme).';
COMMENT ON COLUMN public.tenants.schema_auth IS 'PostgreSQL schema name for auth users (e.g. campus_circle_auth or tenant_acme_auth).';
COMMENT ON COLUMN public.tenants.is_internal IS 'True for Demo-Circle only; internal tenant with demo data and tenant-creation privileges.';

-- Insert default tenant: Demo-Circle (current schema = campus_circle)
INSERT INTO public.tenants (id, name, slug, schema_app, schema_auth, is_internal)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Demo-Circle',
  'demo-circle',
  'campus_circle',
  'campus_circle_auth',
  TRUE
)
ON CONFLICT (slug) DO NOTHING;
