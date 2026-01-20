-- 008_fix_event_registrations_constraint.sql
-- Add unique constraint to event_registrations table for ON CONFLICT to work

-- Drop existing index if it exists (we'll recreate it as a unique constraint)
DROP INDEX IF EXISTS campus_circle.idx_registrations_event_student;

-- Add unique constraint on (student_id, event_id) to prevent duplicate registrations
-- This allows ON CONFLICT (student_id, event_id) to work properly
ALTER TABLE campus_circle.event_registrations
ADD CONSTRAINT unique_event_student_registration UNIQUE (student_id, event_id);

-- Recreate the index for performance
CREATE INDEX IF NOT EXISTS idx_registrations_event_student 
ON campus_circle.event_registrations(event_id, student_id);
