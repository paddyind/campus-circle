-- Campus Circle: Sample/seed data (idempotent)
-- Users (admin, parent, student) are created via setup-test-users.sh

INSERT INTO campus_circle.user_roles (role, description) VALUES
('admin', 'System administrator'),
('event_owner', 'Event owner'),
('event_organizer', 'Event organizer'),
('parent', 'Parent'),
('student', 'Student')
ON CONFLICT (role) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO campus_circle.schools (id, name, address, phone, email) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Greenwood High School', '123 Oak Avenue, Greenwood City', '555-0100', 'info@greenwoodhigh.campuscircle.com'),
('550e8400-e29b-41d4-a716-446655440001', 'Riverside Academy', '456 River Road, Riverside', '555-0200', 'info@riverside.campuscircle.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campus_circle.classes (id, school_id, name, year) VALUES
('770e8400-e29b-41d4-a716-446655440001'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 1', 1),
('770e8400-e29b-41d4-a716-446655440002'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 2', 2),
('770e8400-e29b-41d4-a716-446655440003'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 3', 3),
('770e8400-e29b-41d4-a716-446655440004'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 4', 4),
('770e8400-e29b-41d4-a716-446655440005'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 5', 5),
('770e8400-e29b-41d4-a716-446655440006'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 6', 6),
('770e8400-e29b-41d4-a716-446655440007'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 7', 7),
('770e8400-e29b-41d4-a716-446655440008'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 8', 8),
('770e8400-e29b-41d4-a716-446655440009'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 9', 9),
('770e8400-e29b-41d4-a716-44665544000a'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 10', 10),
('770e8400-e29b-41d4-a716-44665544000b'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 11', 11),
('770e8400-e29b-41d4-a716-44665544000c'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grade 12', 12)
ON CONFLICT (id) DO NOTHING;

-- Event dates are in the future so they appear in the app (API filters out past events).
INSERT INTO campus_circle.events (id, school_id, title, description, start_time, end_time, location, is_published, max_registrations) VALUES
('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Demo_Annual Science Fair', 'A showcase of student science projects.', '2026-09-15 10:00:00+00', '2026-09-15 14:00:00+00', 'Main Auditorium', TRUE, 100),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Demo_Parent-Teacher Conference', 'Discuss progress with teachers.', '2026-10-01 08:00:00+00', '2026-10-01 17:00:00+00', 'School Campus', TRUE, 50),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Demo_Sports Day', 'Inter-house sports competition.', '2026-10-20 09:00:00+00', '2026-10-20 16:00:00+00', 'Sports Ground', TRUE, 200),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Demo_Cultural Festival', 'Arts, music, and culture.', '2026-11-10 10:00:00+00', '2026-11-10 18:00:00+00', 'Cultural Center', TRUE, 150),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Demo_Math Olympiad', 'Mathematics competition.', '2026-11-20 09:00:00+00', '2026-11-20 12:00:00+00', 'Examination Hall', TRUE, 50)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  location = EXCLUDED.location,
  is_published = EXCLUDED.is_published,
  max_registrations = EXCLUDED.max_registrations;

INSERT INTO campus_circle.event_faqs (id, event_id, question, answer, is_published)
SELECT '880e8400-e29b-41d4-a716-446655440000'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, 'What time does the Science Fair start?', '10:00 AM until 2:00 PM.', TRUE
WHERE EXISTS (SELECT 1 FROM campus_circle.events WHERE id = '660e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;
