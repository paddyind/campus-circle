-- Campus Circle Database Seed Data
-- DML (Data Manipulation Language) - Initial Data
-- Schema: campus_circle
-- Domain: campuscircle.com

-- ============================================
-- SEED USER ROLES
-- ============================================
INSERT INTO campus_circle.user_roles (role, description) VALUES
('admin', 'System administrator with full access'),
('event_owner', 'Event owner with full event management rights'),
('event_organizer', 'Event organizer with limited event management rights'),
('parent', 'Parent user account'),
('student', 'Student user account')
ON CONFLICT (role) DO NOTHING;

-- ============================================
-- SEED TEST SCHOOLS
-- ============================================
INSERT INTO campus_circle.schools (id, name, address, phone, email) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Greenwood High School', '123 Oak Avenue, Greenwood City', '555-0100', 'info@greenwoodhigh.campuscircle.com'),
('550e8400-e29b-41d4-a716-446655440001', 'Riverside Academy', '456 River Road, Riverside', '555-0200', 'info@riverside.campuscircle.com')
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED TEST CLASSES
-- ============================================
INSERT INTO campus_circle.classes (id, school_id, name, year) 
SELECT 
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'Grade ' || g,
  g
FROM generate_series(1, 12) g
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED TEST EVENTS
-- ============================================
INSERT INTO campus_circle.events (id, school_id, title, description, start_time, end_time, location, is_published) VALUES
('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Annual Science Fair', 'A showcase of the brilliant scientific minds of our students. Projects from all grades will be displayed.', '2024-09-15 10:00:00+00', '2024-09-15 14:00:00+00', 'Main Auditorium', TRUE),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Parent-Teacher Conference', 'Discuss your child''s progress with their teachers. Multiple time slots available.', '2024-10-01 08:00:00+00', '2024-10-01 17:00:00+00', 'School Campus', TRUE),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Sports Day', 'Annual inter-house sports competition featuring track and field events.', '2024-10-20 09:00:00+00', '2024-10-20 16:00:00+00', 'Sports Ground', TRUE),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Cultural Festival', 'Celebration of arts, music, and cultural diversity.', '2024-11-10 10:00:00+00', '2024-11-10 18:00:00+00', 'Cultural Center', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- NOTE: Test users should be created via Supabase Auth
-- The following are example UUIDs for reference only
-- Actual users must be created through the registration API
-- ============================================

-- Example structure for test users (DO NOT RUN - for reference only):
-- 
-- 1. Create user in Supabase Auth (via API or Supabase Dashboard)
--    - Email: parent@campuscircle.com
--    - Password: [set via Supabase]
--    - This creates an entry in campus_circle_auth.users (or Supabase's auth.users if using Supabase)
--
-- 2. Then insert into campus_circle tables:
--    INSERT INTO campus_circle.users (id, role) 
--    VALUES ('[auth_user_id_from_step_1]', 'parent');
--
--    INSERT INTO campus_circle.parents (id, email, full_name, phone)
--    VALUES ('[auth_user_id_from_step_1]', 'parent@campuscircle.com', 'John Doe', '555-1000');

-- ============================================
-- SEED EVENT FAQs (Example)
-- ============================================
INSERT INTO campus_circle.event_faqs (event_id, question, answer, is_published) 
SELECT 
  '660e8400-e29b-41d4-a716-446655440000',
  'What time does the Science Fair start?',
  'The Science Fair begins at 10:00 AM and runs until 2:00 PM.',
  TRUE
WHERE EXISTS (SELECT 1 FROM campus_circle.events WHERE id = '660e8400-e29b-41d4-a716-446655440000')
ON CONFLICT DO NOTHING;
