-- Event resources (documents, media, agreements) and tenant feature flags.
-- Handles both fresh install (creates event_resources) and legacy (renames event_attachments).
-- Run after 003. See docs/DATABASE.md.

-- campus_circle: rename event_attachments if exists, else create event_resources
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'campus_circle' AND table_name = 'event_attachments') THEN
    ALTER TABLE campus_circle.event_attachments RENAME TO event_resources;
    ALTER INDEX IF EXISTS campus_circle.idx_event_attachments_event RENAME TO idx_event_resources_event;
    ALTER INDEX IF EXISTS campus_circle.idx_event_attachments_category RENAME TO idx_event_resources_category;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'campus_circle' AND table_name = 'event_resources') THEN
    CREATE TABLE campus_circle.event_resources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES campus_circle.events(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK (category IN ('details', 'media', 'agreements')),
      visibility TEXT NOT NULL DEFAULT 'participants' CHECK (visibility IN ('public', 'participants', 'private')),
      storage_path TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT,
      size_bytes BIGINT,
      metadata JSONB DEFAULT '{}',
      created_by UUID REFERENCES campus_circle_auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX idx_event_resources_event ON campus_circle.event_resources(event_id);
    CREATE INDEX idx_event_resources_category ON campus_circle.event_resources(category);
  END IF;
END $$;

-- campus_bhis: same logic
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'campus_bhis' AND table_name = 'event_attachments') THEN
    ALTER TABLE campus_bhis.event_attachments RENAME TO event_resources;
    ALTER INDEX IF EXISTS campus_bhis.idx_bhis_event_attachments_event RENAME TO idx_bhis_event_resources_event;
    ALTER INDEX IF EXISTS campus_bhis.idx_bhis_event_attachments_category RENAME TO idx_bhis_event_resources_category;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'campus_bhis' AND table_name = 'event_resources') THEN
    CREATE TABLE campus_bhis.event_resources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES campus_bhis.events(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK (category IN ('details', 'media', 'agreements')),
      visibility TEXT NOT NULL DEFAULT 'participants' CHECK (visibility IN ('public', 'participants', 'private')),
      storage_path TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT,
      size_bytes BIGINT,
      metadata JSONB DEFAULT '{}',
      created_by UUID REFERENCES campus_bhis_auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX idx_bhis_event_resources_event ON campus_bhis.event_resources(event_id);
    CREATE INDEX idx_bhis_event_resources_category ON campus_bhis.event_resources(category);
  END IF;
END $$;

-- Tenant feature flags
UPDATE public.tenants SET
  settings = COALESCE(settings, '{}'::jsonb) || '{"features": {"event_storage": true, "calendar_import": true, "calendar_view": true}}'::jsonb,
  updated_at = now()
WHERE slug IN ('demo-circle', 'demo-bhis')
  AND (settings->'features' IS NULL OR settings->'features' = 'null'::jsonb);
