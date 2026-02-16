-- =====================================================
-- Add 'on_way' to jobs status CHECK constraint
-- Aligns DB schema with TypeScript JobStatus type
-- =====================================================

-- Drop the old CHECK constraint and add the updated one
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('scheduled', 'on_way', 'in_progress', 'completed', 'cancelled', 'no_show'));
