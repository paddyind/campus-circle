-- 007_add_admin_setup.sql
-- Add admin user setup (one-time setup for new installations)

-- Note: Admin user should be created via Supabase Auth API
-- This migration ensures the admin role exists in user_roles table
-- Run ./scripts/setup-admin.sh after migrations to create admin user

-- Ensure admin role exists
INSERT INTO campus_circle.user_roles (role) VALUES ('admin') ON CONFLICT (role) DO NOTHING;
INSERT INTO campus_circle.user_roles (role) VALUES ('event_organizer') ON CONFLICT (role) DO NOTHING;
