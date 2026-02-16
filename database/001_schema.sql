-- Campus Circle: Full schema (consolidated)
-- Run with .env via: ./infra/scripts/run.sh db migrate
-- Only schemas used: campus_circle_auth, campus_circle (no other app schemas)

DROP SCHEMA IF EXISTS "campus-circle" CASCADE;
CREATE SCHEMA IF NOT EXISTS campus_circle_auth;
CREATE SCHEMA IF NOT EXISTS campus_circle;

-- Auth (isolated for portability)
CREATE TABLE IF NOT EXISTS campus_circle_auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON campus_circle_auth.users(email);

-- User roles and app users
CREATE TABLE IF NOT EXISTS campus_circle.user_roles (
  role TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.users (
  id UUID PRIMARY KEY REFERENCES campus_circle_auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_user_role FOREIGN KEY (role) REFERENCES campus_circle.user_roles(role)
);

-- Schools and classes
CREATE TABLE IF NOT EXISTS campus_circle.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES campus_circle.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Parents and students (students: independent id, optional email, nullable auth_user_id for children under 14)
CREATE TABLE IF NOT EXISTS campus_circle.parents (
  id UUID PRIMARY KEY REFERENCES campus_circle_auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES campus_circle_auth.users(id) ON DELETE SET NULL,
  email TEXT,
  school_id UUID REFERENCES campus_circle.schools(id) ON DELETE SET NULL,
  class_id UUID REFERENCES campus_circle.classes(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  dob DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON campus_circle.students(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_email ON campus_circle.students(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS campus_circle.parent_students (
  parent_id UUID REFERENCES campus_circle.parents(id) ON DELETE CASCADE,
  student_id UUID REFERENCES campus_circle.students(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events
CREATE TABLE IF NOT EXISTS campus_circle.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES campus_circle.schools(id) ON DELETE SET NULL,
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
COMMENT ON COLUMN campus_circle.events.registration_cancellation_cutoff IS 'After this time, users cannot cancel registration. If NULL, event start_time is used.';

CREATE TABLE IF NOT EXISTS campus_circle.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_circle.events(id) ON DELETE CASCADE,
  student_id UUID REFERENCES campus_circle.students(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'registered',
  UNIQUE(event_id, student_id)
);

CREATE TABLE IF NOT EXISTS campus_circle.event_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_circle.events(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.event_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_circle.events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.event_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_circle.events(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES campus_circle.parents(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  answered_at TIMESTAMPTZ
);

-- Documents
CREATE TABLE IF NOT EXISTS campus_circle.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES campus_circle.students(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contact submissions
CREATE TABLE IF NOT EXISTS campus_circle.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES campus_circle_auth.users(id) ON DELETE SET NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('feedback', 'complaint', 'suggestion', 'general')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  related_event_id UUID REFERENCES campus_circle.events(id) ON DELETE SET NULL,
  related_organizer_id UUID REFERENCES campus_circle.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS campus_circle.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_parent_id UUID REFERENCES campus_circle.parents(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON campus_circle.users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON campus_circle.users(created_at);
CREATE INDEX IF NOT EXISTS idx_classes_school ON campus_circle.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON campus_circle.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON campus_circle.students(class_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON campus_circle.parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON campus_circle.parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_events_school ON campus_circle.events(school_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON campus_circle.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_published ON campus_circle.events(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_registrations_event ON campus_circle.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_student ON campus_circle.event_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_student ON campus_circle.event_registrations(event_id, student_id);
CREATE INDEX IF NOT EXISTS idx_event_updates_event ON campus_circle.event_updates(event_id);
CREATE INDEX IF NOT EXISTS idx_event_faqs_event ON campus_circle.event_faqs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questions_event ON campus_circle.event_questions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questions_parent ON campus_circle.event_questions(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_student ON campus_circle.documents(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON campus_circle.documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user ON campus_circle.contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON campus_circle.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_type ON campus_circle.contact_submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_event ON campus_circle.contact_submissions(related_event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_parent ON campus_circle.audit_logs(actor_parent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON campus_circle.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON campus_circle.audit_logs(entity, entity_id);

-- Supabase: optional role helper (uses auth.uid(); safe to skip on local Postgres)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE OR REPLACE FUNCTION public.get_user_role()
    RETURNS TEXT AS $body$
    DECLARE r TEXT;
    BEGIN
      SELECT role INTO r FROM campus_circle.users WHERE id = auth.uid();
      RETURN r;
    END;
    $body$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
