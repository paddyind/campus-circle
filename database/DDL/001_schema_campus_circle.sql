-- Campus Circle Database Schema
-- DDL (Data Definition Language) - Schema Definition
-- Schema: campus_circle
-- Domain: campuscircle.com

-- ============================================
-- SCHEMA CREATION
-- ============================================
CREATE SCHEMA IF NOT EXISTS campus_circle;

-- ============================================
-- AUTH SCHEMA (Isolated for Campus Circle)
-- ============================================
-- This schema is isolated to Campus Circle for portability
-- When using Supabase, you can map this to Supabase's auth.users
-- For local development or portability, this schema is self-contained
CREATE SCHEMA IF NOT EXISTS campus_circle_auth;

-- Create campus_circle_auth.users table
-- This is isolated to Campus Circle and can be recreated independently
CREATE TABLE IF NOT EXISTS campus_circle_auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON campus_circle_auth.users(email);

-- ============================================
-- USER MANAGEMENT TABLES
-- ============================================

-- User roles lookup table
CREATE TABLE IF NOT EXISTS campus_circle.user_roles (
  role TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users table (links to campus_circle_auth.users)
CREATE TABLE IF NOT EXISTS campus_circle.users (
  id UUID PRIMARY KEY REFERENCES campus_circle_auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_user_role FOREIGN KEY (role) REFERENCES campus_circle.user_roles(role)
);

-- ============================================
-- SCHOOL AND CLASS MANAGEMENT
-- ============================================

-- Schools table
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

-- Classes/Grades table
CREATE TABLE IF NOT EXISTS campus_circle.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES campus_circle.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- USER PROFILE TABLES
-- ============================================

-- Parents table
CREATE TABLE IF NOT EXISTS campus_circle.parents (
  id UUID PRIMARY KEY REFERENCES campus_circle_auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Students table
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

-- Parent-Student relationships
CREATE TABLE IF NOT EXISTS campus_circle.parent_students (
  parent_id UUID REFERENCES campus_circle.parents(id) ON DELETE CASCADE,
  student_id UUID REFERENCES campus_circle.students(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EVENT MANAGEMENT TABLES
-- ============================================

-- Events table
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

-- Event registrations (students register for events)
CREATE TABLE IF NOT EXISTS campus_circle.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_circle.events(id) ON DELETE CASCADE,
  student_id UUID REFERENCES campus_circle.students(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'registered',
  UNIQUE(event_id, student_id)
);

-- Event updates/announcements
CREATE TABLE IF NOT EXISTS campus_circle.event_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_circle.events(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event FAQs
CREATE TABLE IF NOT EXISTS campus_circle.event_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES campus_circle.events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Event questions from parents
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

-- ============================================
-- DOCUMENT MANAGEMENT
-- ============================================

-- Student documents
CREATE TABLE IF NOT EXISTS campus_circle.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES campus_circle.students(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- e.g., 'passport', 'birth_certificate', 'medical_record'
  storage_path TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AUDIT LOGGING
-- ============================================

-- Audit logs
CREATE TABLE IF NOT EXISTS campus_circle.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_parent_id UUID REFERENCES campus_circle.parents(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON campus_circle.users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON campus_circle.users(created_at);

-- School and class indexes
CREATE INDEX IF NOT EXISTS idx_classes_school ON campus_circle.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON campus_circle.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON campus_circle.students(class_id);

-- Parent-Student relationship indexes
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON campus_circle.parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON campus_circle.parent_students(student_id);

-- Event indexes
CREATE INDEX IF NOT EXISTS idx_events_school ON campus_circle.events(school_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON campus_circle.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_published ON campus_circle.events(is_published) WHERE is_published = TRUE;

-- Event registration indexes
CREATE INDEX IF NOT EXISTS idx_registrations_event ON campus_circle.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_student ON campus_circle.event_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_student ON campus_circle.event_registrations(event_id, student_id);

-- Event updates and FAQs indexes
CREATE INDEX IF NOT EXISTS idx_event_updates_event ON campus_circle.event_updates(event_id);
CREATE INDEX IF NOT EXISTS idx_event_faqs_event ON campus_circle.event_faqs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questions_event ON campus_circle.event_questions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questions_parent ON campus_circle.event_questions(parent_id);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_documents_student ON campus_circle.documents(student_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON campus_circle.documents(doc_type);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_parent ON campus_circle.audit_logs(actor_parent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON campus_circle.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON campus_circle.audit_logs(entity, entity_id);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON SCHEMA campus_circle IS 'Campus Circle application schema - domain: campuscircle.com';
COMMENT ON SCHEMA campus_circle_auth IS 'Campus Circle isolated authentication schema - can be recreated independently';
COMMENT ON TABLE campus_circle_auth.users IS 'Campus Circle user authentication table - isolated from other applications';
COMMENT ON TABLE campus_circle.users IS 'User accounts linked to campus_circle_auth.users';
COMMENT ON TABLE campus_circle.parents IS 'Parent user profiles';
COMMENT ON TABLE campus_circle.students IS 'Student user profiles';
COMMENT ON TABLE campus_circle.events IS 'Campus events';
COMMENT ON TABLE campus_circle.event_registrations IS 'Student registrations for events';
