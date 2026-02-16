-- =====================================================
-- JOB WRAP UP — ORCHESTRATION RECORD
-- Migration 139: Core Wrap Up schema
-- =====================================================

-- One wrap up per job completion attempt
-- If a job is wrapped up, reopened, and wrapped up again, there will be multiple records
CREATE TABLE IF NOT EXISTS job_wrapups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,

  -- Job reference
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID,

  -- Who wrapped up
  technician_id UUID NOT NULL REFERENCES users(id),
  technician_name VARCHAR(200),

  -- Completion status
  completion_status VARCHAR(20) NOT NULL,

  -- Return needed details (only if completion_status = 'return_needed')
  return_reason TEXT,
  return_scheduled_for TIMESTAMPTZ,

  -- Callback details (only if completion_status = 'callback')
  callback_reason TEXT,

  -- Flags
  invoice_ready BOOLEAN DEFAULT false,

  -- Linked records (populated after creation)
  note_id UUID,
  reminder_id UUID,
  photo_count INTEGER DEFAULT 0,

  -- Job timing (calculated at wrap up time)
  job_arrival_time TIMESTAMPTZ,
  job_departure_time TIMESTAMPTZ,
  job_duration_minutes INTEGER,

  -- Contextual Intelligence (V1.5 — nullable for now)
  upsell_logged BOOLEAN DEFAULT false,
  upsell_description TEXT,
  maintenance_nudge_shown BOOLEAN DEFAULT false,
  maintenance_nudge_acted BOOLEAN DEFAULT false,

  -- Analytics timestamps
  wrapup_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  wrapup_confirmed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_completion_status CHECK (completion_status IN (
    'completed',
    'return_needed',
    'callback'
  ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wrapups_business ON job_wrapups(business_id);
CREATE INDEX IF NOT EXISTS idx_wrapups_job ON job_wrapups(job_id);
CREATE INDEX IF NOT EXISTS idx_wrapups_tech ON job_wrapups(technician_id);
CREATE INDEX IF NOT EXISTS idx_wrapups_status ON job_wrapups(business_id, completion_status);
CREATE INDEX IF NOT EXISTS idx_wrapups_invoice_ready ON job_wrapups(business_id, invoice_ready)
  WHERE invoice_ready = true;
CREATE INDEX IF NOT EXISTS idx_wrapups_created ON job_wrapups(business_id, created_at DESC);

-- RLS
ALTER TABLE job_wrapups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business wrapups"
  ON job_wrapups FOR SELECT
  USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own business wrapups"
  ON job_wrapups FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- =====================================================
-- Add wrapup_id to existing tables for traceability
-- =====================================================

ALTER TABLE job_voice_notes ADD COLUMN IF NOT EXISTS wrapup_id UUID;
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS wrapup_id UUID;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS wrapup_id UUID;

-- Partial indexes for wrapup linkage queries
CREATE INDEX IF NOT EXISTS idx_voice_notes_wrapup ON job_voice_notes(wrapup_id) WHERE wrapup_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_wrapup ON job_photos(wrapup_id) WHERE wrapup_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_wrapup ON reminders(wrapup_id) WHERE wrapup_id IS NOT NULL;

-- =====================================================
-- Add return_needed and callback to job statuses
-- =====================================================

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN (
  'scheduled',
  'on_way',
  'in_progress',
  'completed',
  'return_needed',
  'callback',
  'cancelled',
  'no_show'
));
