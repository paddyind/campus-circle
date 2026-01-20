-- 009_update_students_for_children_under_14.sql
-- Long-term solution: Allow children under 14 to exist without auth accounts
-- They use parent's email by default, can be updated later
-- When they turn 14+, they can create auth account using their email

-- Step 1: Add email field to students table (defaults to parent email)
ALTER TABLE campus_circle.students 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Add nullable auth_user_id (for students 14+ who have auth accounts)
-- This will be set when child creates their own account at 14+
ALTER TABLE campus_circle.students 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES campus_circle_auth.users(id) ON DELETE SET NULL;

-- Step 3: Populate email for existing students (from auth.users or parent email)
UPDATE campus_circle.students s
SET email = COALESCE(
    (SELECT email FROM campus_circle_auth.users WHERE id = s.id),
    (SELECT p.email FROM campus_circle.parents p 
     JOIN campus_circle.parent_students ps ON p.id = ps.parent_id 
     WHERE ps.student_id = s.id LIMIT 1)
)
WHERE s.email IS NULL;

-- Step 4: Set auth_user_id for existing students (their current id is the auth user id)
UPDATE campus_circle.students s
SET auth_user_id = s.id
WHERE s.auth_user_id IS NULL AND EXISTS (
    SELECT 1 FROM campus_circle_auth.users WHERE id = s.id
);

-- Step 5: Create index on auth_user_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON campus_circle.students(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Step 6: Create index on email
CREATE INDEX IF NOT EXISTS idx_students_email ON campus_circle.students(email) WHERE email IS NOT NULL;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN campus_circle.students.email IS 'Student email (defaults to parent email for children under 14, can be updated by parent)';
COMMENT ON COLUMN campus_circle.students.auth_user_id IS 'Reference to auth account (NULL for children under 14 without accounts, set when they create account at 14+)';

-- Step 8: Make students.id independent (not FK to auth.users)
-- This allows children under 14 to exist without auth accounts
-- We need to drop and recreate the FK constraint

-- First, check if the constraint exists and drop it
DO $$
BEGIN
    -- Drop the foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'students_id_fkey' 
        AND conrelid = 'campus_circle.students'::regclass
    ) THEN
        ALTER TABLE campus_circle.students DROP CONSTRAINT students_id_fkey;
    END IF;
END $$;

-- Now students.id is independent - children under 14 can be created without auth accounts
-- The auth_user_id column links to auth accounts when children turn 14+
