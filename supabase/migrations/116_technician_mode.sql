-- =====================================================
-- TECHNICIAN MODE - Voice Notes Table
-- Supports voice notes for job documentation
-- =====================================================

-- Create job_voice_notes table
CREATE TABLE IF NOT EXISTS job_voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT, -- NULL until transcribed
  transcription_status TEXT DEFAULT 'none' CHECK (transcription_status IN ('none', 'pending', 'completed', 'failed')),
  transcription_started_at TIMESTAMPTZ,
  transcription_completed_at TIMESTAMPTZ,
  transcription_provider TEXT DEFAULT 'whisper',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_notes_job ON job_voice_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_user ON job_voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_pending_transcription
  ON job_voice_notes(transcription_status)
  WHERE transcription_status = 'pending';

-- RLS Policies
ALTER TABLE job_voice_notes ENABLE ROW LEVEL SECURITY;

-- Users can read voice notes for jobs in their business
CREATE POLICY "Users can view voice notes for their business jobs"
  ON job_voice_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN users u ON u.business_id = j.business_id
      WHERE j.id = job_voice_notes.job_id
      AND u.id = auth.uid()
    )
  );

-- Users can insert voice notes for jobs they're assigned to
CREATE POLICY "Users can create voice notes for their assigned jobs"
  ON job_voice_notes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = job_id
      AND (j.assigned_to = auth.uid() OR EXISTS (
        SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('owner', 'admin')
      ))
    )
  );

-- Add on_way status to job status enum if not exists
-- Note: This is handled in the job status tracking via dispatch_history

-- Grant permissions
GRANT ALL ON job_voice_notes TO authenticated;
GRANT ALL ON job_voice_notes TO service_role;

COMMENT ON TABLE job_voice_notes IS 'Voice notes recorded by technicians for job documentation';
COMMENT ON COLUMN job_voice_notes.storage_path IS 'Path in Supabase Storage (job-media bucket)';
COMMENT ON COLUMN job_voice_notes.transcription_status IS 'Status of automatic transcription: none, pending, completed, failed';
