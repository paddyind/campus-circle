-- 002_seed_minimal.sql
-- Seed a school
INSERT INTO campus_circle.schools (name, address) VALUES ('Greenwood High', '123 Oak Avenue') ON CONFLICT DO NOTHING;

-- NOTE: Test users are created via Supabase Auth API (not SQL) to ensure proper password hashing and email confirmation
-- Run ./scripts/setup-test-users.sh after migrations to create test users:
--   - parent@campuscircle.com / password123
--   - student@campuscircle.com / password123
-- These users will be automatically linked to campus_circle schema by the setup script

-- Seed past events (for testing registered users' past events view)
INSERT INTO campus_circle.events (title, description, start_time, end_time, location, school_id, max_registrations)
SELECT 'Annual Science Fair', 'A showcase of the brilliant scientific minds of our students.', '2024-09-15 10:00:00', '2024-09-15 14:00:00', 'Main Auditorium', id, 100
FROM campus_circle.schools WHERE name = 'Greenwood High'
ON CONFLICT DO NOTHING;

INSERT INTO campus_circle.events (title, description, start_time, end_time, location, school_id, max_registrations)
SELECT 'Parent-Teacher Conference', 'Discuss your child''s progress with their teachers.', '2024-10-01 08:00:00', '2024-10-01 17:00:00', 'School Campus', id, 200
FROM campus_circle.schools WHERE name = 'Greenwood High'
ON CONFLICT DO NOTHING;

-- Seed future events
INSERT INTO campus_circle.events (title, description, start_time, end_time, location, school_id, max_registrations)
SELECT 'Spring Sports Day', 'Annual inter-house sports competition with various track and field events.', NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days' + INTERVAL '6 hours', 'Sports Ground', id, 150
FROM campus_circle.schools WHERE name = 'Greenwood High'
ON CONFLICT DO NOTHING;

INSERT INTO campus_circle.events (title, description, start_time, end_time, location, school_id, max_registrations)
SELECT 'Art Exhibition', 'Showcase of student artwork and creative projects from all grades.', NOW() + INTERVAL '45 days', NOW() + INTERVAL '45 days' + INTERVAL '4 hours', 'Art Gallery', id, 80
FROM campus_circle.schools WHERE name = 'Greenwood High'
ON CONFLICT DO NOTHING;

INSERT INTO campus_circle.events (title, description, start_time, end_time, location, school_id, max_registrations)
SELECT 'Graduation Ceremony', 'Celebrating the achievements of our graduating class.', NOW() + INTERVAL '60 days', NOW() + INTERVAL '60 days' + INTERVAL '3 hours', 'Main Auditorium', id, 300
FROM campus_circle.schools WHERE name = 'Greenwood High'
ON CONFLICT DO NOTHING;

INSERT INTO campus_circle.events (title, description, start_time, end_time, location, school_id, max_registrations)
SELECT 'Math Olympiad', 'Competitive mathematics competition for students of all grades.', NOW() + INTERVAL '20 days', NOW() + INTERVAL '20 days' + INTERVAL '5 hours', 'Math Lab', id, 50
FROM campus_circle.schools WHERE name = 'Greenwood High'
ON CONFLICT DO NOTHING;
