-- 002_seed_minimal.sql
-- Seed a school
INSERT INTO campus_circle.schools (name, address) VALUES ('Greenwood High', '123 Oak Avenue') ON CONFLICT DO NOTHING;

-- Seed users in auth.users
INSERT INTO auth.users (id, email, encrypted_password) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'parent@test.com', 'password123'),
('b2c3d4e5-f6a7-8901-2345-67890abcdef0', 'student@test.com', 'password123')
ON CONFLICT DO NOTHING;

-- Seed parents
INSERT INTO campus_circle.parents (id, email, full_name, phone) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'parent@test.com', 'John Doe', '123-456-7890')
ON CONFLICT DO NOTHING;

-- Seed students
INSERT INTO campus_circle.students (id, full_name, dob, school_id, class_id)
SELECT 'b2c3d4e5-f6a7-8901-2345-67890abcdef0', 'Jane Doe', '2010-05-15', id, NULL
FROM campus_circle.schools WHERE name = 'Greenwood High'
ON CONFLICT DO NOTHING;

-- Seed events
INSERT INTO campus_circle.events (title, description, start_time, end_time, location, school_id)
SELECT 'Annual Science Fair', 'A showcase of the brilliant scientific minds of our students.', '2024-09-15 10:00:00', '2024-09-15 14:00:00', 'Main Auditorium', id
FROM campus_circle.schools WHERE name = 'Greenwood High'
ON CONFLICT DO NOTHING;

INSERT INTO campus_circle.events (title, description, start_time, end_time, location, school_id)
SELECT 'Parent-Teacher Conference', 'Discuss your child''s progress with their teachers.', '2024-10-01 08:00:00', '2024-10-01 17:00:00', 'School Campus', id
FROM campus_circle.schools WHERE name = 'Greenwood High'
ON CONFLICT DO NOTHING;
