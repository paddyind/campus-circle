-- 001_init_schema.sql
-- Create isolated auth schema for Campus Circle
CREATE SCHEMA IF NOT EXISTS campus_circle_auth;

-- Create campus_circle_auth.users table (isolated for Campus Circle)
CREATE TABLE IF NOT EXISTS campus_circle_auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON campus_circle_auth.users(email);

CREATE SCHEMA IF NOT EXISTS campus_circle;

CREATE TABLE IF NOT EXISTS campus_circle.parents (
  id UUID PRIMARY KEY REFERENCES campus_circle_auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
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

CREATE TABLE IF NOT EXISTS campus_circle.students (
  id UUID PRIMARY KEY REFERENCES campus_circle_auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES campus_circle.schools(id) ON DELETE SET NULL,
  class_id UUID REFERENCES campus_circle.classes(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  dob DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.parent_students (
  parent_id UUID REFERENCES campus_circle.parents(id) ON DELETE CASCADE,
  student_id UUID REFERENCES campus_circle.students(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_circle.events(id) ON DELETE CASCADE,
  student_id UUID REFERENCES campus_circle.students(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'registered'
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

CREATE TABLE IF NOT EXISTS campus_circle.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES campus_circle.students(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- e.g., 'passport'
  storage_path TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_parent_id UUID,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes (examples)
CREATE INDEX IF NOT EXISTS idx_events_school ON campus_circle.events(school_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_student ON campus_circle.event_registrations(event_id, student_id);
