-- 003_add_users_table.sql
-- Ensure campus_circle_auth schema and users table exist (in case migrations run out of order)
CREATE SCHEMA IF NOT EXISTS campus_circle_auth;

CREATE TABLE IF NOT EXISTS campus_circle_auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON campus_circle_auth.users(email);

CREATE TABLE IF NOT EXISTS campus_circle.users (
  id UUID PRIMARY KEY REFERENCES campus_circle_auth.users(id) ON DELETE CASCADE,
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
('student')
ON CONFLICT (role) DO NOTHING;

-- Add foreign key constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'fk_user_role' 
        AND conrelid = 'campus_circle.users'::regclass
    ) THEN
        ALTER TABLE campus_circle.users
        ADD CONSTRAINT fk_user_role
        FOREIGN KEY (role)
        REFERENCES campus_circle.user_roles(role);
    END IF;
END $$;
