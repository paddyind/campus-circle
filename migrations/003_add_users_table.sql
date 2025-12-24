-- 003_add_users_table.sql
-- Ensure auth schema and users table exist (in case migrations run out of order)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_circle.user_roles (
  role TEXT PRIMARY KEY
);

INSERT INTO campus_circle.user_roles (role) VALUES
('admin'),
('event_owner'),
('event_organizer'),
('parent'),
('student');

ALTER TABLE campus_circle.users
ADD CONSTRAINT fk_user_role
FOREIGN KEY (role)
REFERENCES campus_circle.user_roles(role);
