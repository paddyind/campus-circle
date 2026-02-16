-- Demo-BHIS tenant: same structure as Demo-Circle, with BHIS-prefixed demo data.
-- Run after 001, 002, 003. See docs/TENANTS_AND_DEPLOYMENT.md.

-- Schemas for Demo-BHIS
CREATE SCHEMA IF NOT EXISTS campus_bhis_auth;
CREATE SCHEMA IF NOT EXISTS campus_bhis;

-- Auth
CREATE TABLE IF NOT EXISTS campus_bhis_auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bhis_auth_users_email ON campus_bhis_auth.users(email);

CREATE TABLE IF NOT EXISTS campus_bhis.user_roles (
  role TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_bhis.users (
  id UUID PRIMARY KEY REFERENCES campus_bhis_auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_bhis_user_role FOREIGN KEY (role) REFERENCES campus_bhis.user_roles(role)
);

CREATE TABLE IF NOT EXISTS campus_bhis.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_bhis.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES campus_bhis.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_bhis.parents (
  id UUID PRIMARY KEY REFERENCES campus_bhis_auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_bhis.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES campus_bhis_auth.users(id) ON DELETE SET NULL,
  email TEXT,
  school_id UUID REFERENCES campus_bhis.schools(id) ON DELETE SET NULL,
  class_id UUID REFERENCES campus_bhis.classes(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  dob DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bhis_students_auth_user_id ON campus_bhis.students(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bhis_students_email ON campus_bhis.students(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS campus_bhis.parent_students (
  parent_id UUID REFERENCES campus_bhis.parents(id) ON DELETE CASCADE,
  student_id UUID REFERENCES campus_bhis.students(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_bhis.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES campus_bhis.schools(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  max_registrations INTEGER,
  registration_cancellation_cutoff TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_bhis.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_bhis.events(id) ON DELETE CASCADE,
  student_id UUID REFERENCES campus_bhis.students(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'registered',
  UNIQUE(event_id, student_id)
);

CREATE TABLE IF NOT EXISTS campus_bhis.event_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_bhis.events(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_bhis.event_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_bhis.events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_bhis.event_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_bhis.events(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES campus_bhis.parents(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  answered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS campus_bhis.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES campus_bhis.students(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_bhis.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES campus_bhis_auth.users(id) ON DELETE SET NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('feedback', 'complaint', 'suggestion', 'general')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  related_event_id UUID REFERENCES campus_bhis.events(id) ON DELETE SET NULL,
  related_organizer_id UUID REFERENCES campus_bhis.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS campus_bhis.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_parent_id UUID REFERENCES campus_bhis.parents(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bhis_users_role ON campus_bhis.users(role);
CREATE INDEX IF NOT EXISTS idx_bhis_classes_school ON campus_bhis.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_bhis_students_school ON campus_bhis.students(school_id);
CREATE INDEX IF NOT EXISTS idx_bhis_students_class ON campus_bhis.students(class_id);
CREATE INDEX IF NOT EXISTS idx_bhis_events_school ON campus_bhis.events(school_id);
CREATE INDEX IF NOT EXISTS idx_bhis_events_start_time ON campus_bhis.events(start_time);
CREATE INDEX IF NOT EXISTS idx_bhis_events_published ON campus_bhis.events(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_bhis_registrations_event ON campus_bhis.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_bhis_registrations_student ON campus_bhis.event_registrations(student_id);

-- Seed: BHIS-prefixed roles, schools, classes, events (distinct UUIDs from Demo-Circle)
INSERT INTO campus_bhis.user_roles (role, description) VALUES
('admin', 'System administrator'),
('event_owner', 'Event owner'),
('event_organizer', 'Event organizer'),
('parent', 'Parent'),
('student', 'Student')
ON CONFLICT (role) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO campus_bhis.schools (id, name, address, phone, email) VALUES
('a11e8400-e29b-41d4-a716-446655440000', 'BHIS Greenwood High School', '123 Oak Avenue, Greenwood City', '555-0100', 'info@greenwoodhigh.bhis.campuscircle.com'),
('a11e8400-e29b-41d4-a716-446655440001', 'BHIS Riverside Academy', '456 River Road, Riverside', '555-0200', 'info@riverside.bhis.campuscircle.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campus_bhis.classes (id, school_id, name, year) VALUES
('b22e8400-e29b-41d4-a716-446655440001'::uuid, 'a11e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 1', 1),
('b22e8400-e29b-41d4-a716-446655440002'::uuid, 'a11e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 2', 2),
('b22e8400-e29b-41d4-a716-446655440003'::uuid, 'a11e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 3', 3),
('b22e8400-e29b-41d4-a716-446655440004'::uuid, 'a11e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 4', 4),
('b22e8400-e29b-41d4-a716-446655440005'::uuid, 'a11e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 5', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO campus_bhis.events (id, school_id, title, description, start_time, end_time, location, is_published, max_registrations) VALUES
('c33e8400-e29b-41d4-a716-446655440000', 'a11e8400-e29b-41d4-a716-446655440000', 'BHIS_Annual Science Fair', 'A showcase of student science projects.', '2026-09-15 10:00:00+00', '2026-09-15 14:00:00+00', 'Main Auditorium', TRUE, 100),
('c33e8400-e29b-41d4-a716-446655440001', 'a11e8400-e29b-41d4-a716-446655440000', 'BHIS_Parent-Teacher Conference', 'Discuss progress with teachers.', '2026-10-01 08:00:00+00', '2026-10-01 17:00:00+00', 'School Campus', TRUE, 50),
('c33e8400-e29b-41d4-a716-446655440002', 'a11e8400-e29b-41d4-a716-446655440000', 'BHIS_Sports Day', 'Inter-house sports competition.', '2026-10-20 09:00:00+00', '2026-10-20 16:00:00+00', 'Sports Ground', TRUE, 200)
ON CONFLICT (id) DO NOTHING;

-- Register Demo-BHIS in tenant registry
INSERT INTO public.tenants (id, name, slug, schema_app, schema_auth, is_internal, settings)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Demo-BHIS',
  'demo-bhis',
  'campus_bhis',
  'campus_bhis_auth',
  FALSE,
  '{}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  schema_app = EXCLUDED.schema_app,
  schema_auth = EXCLUDED.schema_auth,
  settings = COALESCE(public.tenants.settings, '{}'::jsonb),
  updated_at = now();
