-- 006_add_contact_feedback.sql
-- Add contact/feedback tables for user feedback, complaints, and suggestions

CREATE TABLE IF NOT EXISTS campus_circle.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES campus_circle_auth.users(id) ON DELETE SET NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('feedback', 'complaint', 'suggestion', 'general')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  related_event_id UUID REFERENCES campus_circle.events(id) ON DELETE SET NULL,
  related_organizer_id UUID REFERENCES campus_circle.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_user ON campus_circle.contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_type ON campus_circle.contact_submissions(submission_type);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON campus_circle.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_event ON campus_circle.contact_submissions(related_event_id);
