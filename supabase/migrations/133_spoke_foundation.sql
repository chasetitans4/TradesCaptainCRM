-- =====================================================
-- MIGRATION 133: SPOKE FOUNDATION
--
-- Per Spoke Spec v1.0 (Beta Gate Addendum):
-- Voice-first CRM updates via natural contractor speech
--
-- Core Principle: "Speak once, structured data appears"
--
-- Beta Constraints Applied:
--   - One call = One job (multi-job creates DRAFT)
--   - Global thresholds only (no adaptive per-contractor)
--   - Corrections logged but don't modify behavior
-- =====================================================

-- =====================================================
-- PART 1: CONTRACTOR PHONES TABLE
-- Phone-based identity for crew members
-- =====================================================

CREATE TABLE IF NOT EXISTS contractor_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business scope
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Phone identity
  phone_number TEXT NOT NULL,          -- E.164 format (+1XXXXXXXXXX)
  display_name TEXT NOT NULL,          -- "Mike", "Sarah", etc.

  -- Role determines what actions Spoke can take
  -- OWNER: Full CRM writes
  -- ADMIN: Full CRM writes
  -- TECH: Job updates only (no customer creation)
  role TEXT NOT NULL DEFAULT 'TECH'
    CHECK (role IN ('OWNER', 'ADMIN', 'TECH')),

  -- Verification status
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_code TEXT,              -- 6-digit code for verification
  verification_expires_at TIMESTAMPTZ,

  -- Active status
  is_active BOOLEAN NOT NULL DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,

  -- Flagged for review (suspicious activity)
  flagged_for_review BOOLEAN NOT NULL DEFAULT false,
  flagged_at TIMESTAMPTZ,
  flag_reason TEXT,

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  total_updates INT NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique phone per business
  UNIQUE(business_id, phone_number)
);

-- Index for fast lookup by phone (used on every incoming call)
CREATE INDEX IF NOT EXISTS idx_contractor_phones_lookup
  ON contractor_phones(phone_number, is_active);

-- Index for business listing
CREATE INDEX IF NOT EXISTS idx_contractor_phones_business
  ON contractor_phones(business_id, is_active);

-- =====================================================
-- PART 2: SPOKE UPDATES TABLE
-- Main audit trail for all voice updates
-- =====================================================

CREATE TABLE IF NOT EXISTS spoke_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business scope
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Who made the update
  contractor_phone_id UUID REFERENCES contractor_phones(id) ON DELETE SET NULL,

  -- What job was updated (NULL if unmatched/draft)
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Entry point
  source TEXT NOT NULL
    CHECK (source IN ('CALL', 'SMS', 'APP')),

  -- Raw audio/transcript (encrypted, 24hr TTL per spec)
  audio_url TEXT,                      -- S3/Supabase storage URL
  audio_duration_seconds FLOAT,
  raw_transcript TEXT,                 -- Whisper output
  transcript_language TEXT DEFAULT 'en',

  -- Audio quality metrics
  audio_quality_score FLOAT,           -- 0.0-1.0 SNR-based
  transcription_confidence FLOAT,      -- Whisper confidence

  -- Parsed data (the structured output)
  parsed_data JSONB NOT NULL DEFAULT '{}',
  -- Example parsed_data structure:
  -- {
  --   "status": { "value": "complete", "confidence": 0.95 },
  --   "payment": { "amount": 450, "method": "cash", "confidence": 0.92 },
  --   "duration": { "minutes": 120, "confidence": 0.88 },
  --   "notes": { "value": "Replaced capacitor", "confidence": 0.85 },
  --   "customer_name": { "value": "Martinez", "confidence": 0.90 }
  -- }

  -- Confidence scores per field
  confidence_scores JSONB DEFAULT '{}',

  -- Job matching signals
  match_signals JSONB DEFAULT '{}',
  -- Example match_signals structure:
  -- {
  --   "customer_name_match": 0.95,
  --   "gps_proximity": 0.85,
  --   "schedule_window": 0.70,
  --   "last_viewed": 0.30,
  --   "composite_score": 0.88
  -- }

  -- Overall quality score (composite of all factors)
  quality_score FLOAT,                 -- 0.0-1.0

  -- Processing status
  status TEXT NOT NULL DEFAULT 'PROCESSING'
    CHECK (status IN (
      'PROCESSING',    -- Currently being processed
      'MATCHED',       -- Job match found, awaiting confirmation
      'CONFIRMED',     -- Confirmation SMS sent
      'PROCESSED',     -- Successfully written to CRM
      'DRAFT',         -- Needs manual resolution (ambiguous)
      'EDITED',        -- User corrected via EDIT
      'FAILED',        -- Processing failed
      'REJECTED'       -- Invalid/spam
    )),

  -- Clarification tracking
  needs_clarification BOOLEAN NOT NULL DEFAULT false,
  clarification_type TEXT
    CHECK (clarification_type IN ('MULTI_JOB', 'AMBIGUOUS_MATCH', 'LOW_CONFIDENCE')),

  -- Match confidence
  match_confidence FLOAT,

  -- Edit session tracking
  edit_session_active BOOLEAN NOT NULL DEFAULT false,

  -- Resolution tracking
  resolved_at TIMESTAMPTZ,

  -- Error tracking
  error_code TEXT,
  error_message TEXT,

  -- Confirmation tracking
  confirmation_sent_at TIMESTAMPTZ,
  confirmation_sms_id TEXT,            -- Twilio message SID

  -- Edit tracking
  edit_count INT NOT NULL DEFAULT 0,
  last_edited_at TIMESTAMPTZ,
  edit_window_expires_at TIMESTAMPTZ,  -- 30 min from confirmation

  -- What was actually written to CRM
  crm_writes JSONB DEFAULT '{}',
  -- Example crm_writes structure:
  -- {
  --   "job_status": "completed",
  --   "job_completion_notes": "Replaced capacitor",
  --   "payment_logged": { "amount": 450, "method": "cash" }
  -- }

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Processing latency tracking (for performance monitoring)
  transcription_completed_at TIMESTAMPTZ,
  parsing_completed_at TIMESTAMPTZ,
  matching_completed_at TIMESTAMPTZ
);

-- Index for business queries
CREATE INDEX IF NOT EXISTS idx_spoke_updates_business
  ON spoke_updates(business_id, created_at DESC);

-- Index for job relationship
CREATE INDEX IF NOT EXISTS idx_spoke_updates_job
  ON spoke_updates(job_id)
  WHERE job_id IS NOT NULL;

-- Index for contractor queries
CREATE INDEX IF NOT EXISTS idx_spoke_updates_contractor
  ON spoke_updates(contractor_phone_id, created_at DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_spoke_updates_status
  ON spoke_updates(business_id, status);

-- Index for drafts that need resolution
CREATE INDEX IF NOT EXISTS idx_spoke_updates_drafts
  ON spoke_updates(business_id, created_at DESC)
  WHERE status = 'DRAFT';

-- Index for edit sessions
CREATE INDEX IF NOT EXISTS idx_spoke_updates_edit_session
  ON spoke_updates(contractor_phone_id, edit_session_active)
  WHERE edit_session_active = true;

-- Index for needs clarification
CREATE INDEX IF NOT EXISTS idx_spoke_updates_clarification
  ON spoke_updates(business_id, needs_clarification)
  WHERE needs_clarification = true;

-- =====================================================
-- PART 3: SPOKE DRAFTS TABLE
-- Track unresolved updates awaiting job assignment
-- =====================================================

CREATE TABLE IF NOT EXISTS spoke_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the update
  spoke_update_id UUID NOT NULL REFERENCES spoke_updates(id) ON DELETE CASCADE,

  -- Business scope (denormalized for faster queries)
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Candidate jobs (for clarification)
  candidate_jobs JSONB DEFAULT '[]',
  -- Example: [{"job_id": "uuid", "customer_name": "Martinez", "score": 0.85}]

  -- Clarification options (numbered choices sent to contractor)
  clarification_options JSONB DEFAULT '[]',
  -- Example: [{"number": 1, "jobId": "uuid", "customerName": "Martinez"}]

  -- Clarification SMS tracking
  clarification_sent_at TIMESTAMPTZ,
  clarification_sms_id TEXT,
  clarification_response TEXT,
  clarification_response_at TIMESTAMPTZ,

  -- Resolution
  assigned_to_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,                    -- 'SMS_REPLY', 'APP', 'AUTO_TIMEOUT'

  -- Auto-close after 24 hours with no resolution
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for unresolved drafts
CREATE INDEX IF NOT EXISTS idx_spoke_drafts_unresolved
  ON spoke_drafts(business_id, created_at DESC)
  WHERE resolved_at IS NULL;

-- Index for expiring drafts (cleanup job)
CREATE INDEX IF NOT EXISTS idx_spoke_drafts_expiring
  ON spoke_drafts(expires_at)
  WHERE resolved_at IS NULL;

-- =====================================================
-- PART 4: SPOKE CORRECTIONS TABLE
-- Track EDIT corrections (for post-beta learning)
-- =====================================================

CREATE TABLE IF NOT EXISTS spoke_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was corrected
  spoke_update_id UUID NOT NULL REFERENCES spoke_updates(id) ON DELETE CASCADE,

  -- Who corrected (denormalized for analytics)
  contractor_phone_id UUID NOT NULL REFERENCES contractor_phones(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- What field was corrected
  field_name TEXT NOT NULL,            -- 'payment.amount', 'status', 'duration', etc.

  -- Original vs corrected values
  original_value JSONB,
  corrected_value JSONB,

  -- How it was corrected
  correction_method TEXT NOT NULL
    CHECK (correction_method IN ('SMS_EDIT', 'APP_EDIT', 'CLARIFICATION')),

  -- Time from confirmation to correction (for learning priority)
  time_to_correction INTERVAL,

  -- Raw correction input (for learning)
  raw_correction_input TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for learning queries (post-beta)
CREATE INDEX IF NOT EXISTS idx_spoke_corrections_contractor
  ON spoke_corrections(contractor_phone_id, field_name);

-- Index for business analytics
CREATE INDEX IF NOT EXISTS idx_spoke_corrections_business
  ON spoke_corrections(business_id, created_at DESC);

-- =====================================================
-- PART 5: BUSINESS SPOKE SETTINGS
-- Add Spoke configuration to businesses table
-- =====================================================

-- Add Spoke columns to businesses table
DO $$
BEGIN
  -- Spoke enabled flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'spoke_enabled'
  ) THEN
    ALTER TABLE businesses ADD COLUMN spoke_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Spoke phone number (separate from main business phone)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'spoke_phone_number'
  ) THEN
    ALTER TABLE businesses ADD COLUMN spoke_phone_number TEXT;
  END IF;

  -- Spoke phone SID (Twilio reference)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'spoke_phone_sid'
  ) THEN
    ALTER TABLE businesses ADD COLUMN spoke_phone_sid TEXT;
  END IF;

  -- Unknown caller policy
  -- 'reject' - Don't process calls from unknown numbers
  -- 'provisional' - Auto-create provisional contractor record
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'spoke_unknown_caller_policy'
  ) THEN
    ALTER TABLE businesses ADD COLUMN spoke_unknown_caller_policy TEXT NOT NULL DEFAULT 'reject'
      CHECK (spoke_unknown_caller_policy IN ('reject', 'provisional'));
  END IF;

  -- Spoke settings JSON (extensible)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'spoke_settings'
  ) THEN
    ALTER TABLE businesses ADD COLUMN spoke_settings JSONB NOT NULL DEFAULT '{
      "confirmation_sms_enabled": true,
      "edit_window_minutes": 30,
      "auto_draft_multi_job": true
    }';
  END IF;

  -- Auto-create crew flag (for first-time callers)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'spoke_auto_create_crew'
  ) THEN
    ALTER TABLE businesses ADD COLUMN spoke_auto_create_crew BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Owner phone (for notifications)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'owner_phone'
  ) THEN
    ALTER TABLE businesses ADD COLUMN owner_phone TEXT;
  END IF;
END;
$$;

-- =====================================================
-- PART 5B: JOB TABLE SPOKE COLUMNS
-- Add Spoke-related columns to jobs table
-- =====================================================

DO $$
BEGIN
  -- Last spoke update reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'last_spoke_update_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN last_spoke_update_id UUID;
  END IF;

  -- Payment tracking (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'payment_amount'
  ) THEN
    ALTER TABLE jobs ADD COLUMN payment_amount DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE jobs ADD COLUMN payment_method TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'payment_received_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN payment_received_at TIMESTAMPTZ;
  END IF;

  -- Actual duration (vs estimated)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'actual_duration_minutes'
  ) THEN
    ALTER TABLE jobs ADD COLUMN actual_duration_minutes INT;
  END IF;

  -- Completion tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END;
$$;

-- =====================================================
-- PART 6: RLS POLICIES
-- =====================================================

-- Enable RLS on all Spoke tables
ALTER TABLE contractor_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE spoke_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE spoke_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spoke_corrections ENABLE ROW LEVEL SECURITY;

-- Contractor Phones: Users can view/manage phones in their business
CREATE POLICY "Users can view business contractor phones"
  ON contractor_phones FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage contractor phones"
  ON contractor_phones FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Spoke Updates: Users can view updates in their business
CREATE POLICY "Users can view business spoke updates"
  ON spoke_updates FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Spoke Drafts: Users can view and resolve drafts in their business
CREATE POLICY "Users can view business spoke drafts"
  ON spoke_drafts FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update business spoke drafts"
  ON spoke_drafts FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Spoke Corrections: Users can view corrections in their business
CREATE POLICY "Users can view business spoke corrections"
  ON spoke_corrections FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- PART 7: TRIGGERS
-- =====================================================

-- Update contractor_phones.updated_at on change
CREATE OR REPLACE FUNCTION update_contractor_phone_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_contractor_phone_updated_at
  BEFORE UPDATE ON contractor_phones
  FOR EACH ROW
  EXECUTE FUNCTION update_contractor_phone_timestamp();

-- Increment contractor total_updates when spoke_update is processed
CREATE OR REPLACE FUNCTION on_spoke_update_processed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'PROCESSED' AND (OLD.status IS NULL OR OLD.status != 'PROCESSED') THEN
    UPDATE contractor_phones
    SET
      total_updates = total_updates + 1,
      last_used_at = NOW()
    WHERE id = NEW.contractor_phone_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_spoke_update_processed
  AFTER INSERT OR UPDATE OF status ON spoke_updates
  FOR EACH ROW
  EXECUTE FUNCTION on_spoke_update_processed();

-- =====================================================
-- PART 8: HELPER FUNCTIONS
-- =====================================================

-- Function to find contractor by phone number
CREATE OR REPLACE FUNCTION find_contractor_by_phone(
  p_phone_number TEXT,
  p_business_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  display_name TEXT,
  role TEXT,
  is_verified BOOLEAN,
  is_active BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.business_id,
    cp.display_name,
    cp.role,
    cp.is_verified,
    cp.is_active
  FROM contractor_phones cp
  WHERE cp.phone_number = p_phone_number
    AND cp.is_active = true
    AND (p_business_id IS NULL OR cp.business_id = p_business_id);
END;
$$;

-- Function to cleanup expired drafts
CREATE OR REPLACE FUNCTION cleanup_expired_spoke_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Mark expired drafts as timed out
  UPDATE spoke_updates su
  SET
    status = 'FAILED',
    error_code = 'DRAFT_TIMEOUT',
    error_message = 'Draft expired without resolution'
  FROM spoke_drafts sd
  WHERE sd.spoke_update_id = su.id
    AND sd.resolved_at IS NULL
    AND sd.expires_at < NOW();

  -- Update the drafts themselves
  UPDATE spoke_drafts
  SET
    resolved_at = NOW(),
    resolved_by = 'AUTO_TIMEOUT'
  WHERE resolved_at IS NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Function to get contractor stats (for dashboard)
CREATE OR REPLACE FUNCTION get_contractor_stats(
  p_contractor_phone_id UUID
)
RETURNS TABLE (
  total_updates BIGINT,
  successful_updates BIGINT,
  draft_updates BIGINT,
  edit_rate FLOAT,
  avg_quality_score FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_updates,
    COUNT(*) FILTER (WHERE status = 'PROCESSED')::BIGINT as successful_updates,
    COUNT(*) FILTER (WHERE status = 'DRAFT')::BIGINT as draft_updates,
    CASE
      WHEN COUNT(*) > 0
      THEN (SUM(edit_count)::FLOAT / COUNT(*)::FLOAT)
      ELSE 0.0
    END as edit_rate,
    AVG(quality_score) as avg_quality_score
  FROM spoke_updates
  WHERE contractor_phone_id = p_contractor_phone_id;
END;
$$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE contractor_phones IS 'Phone-based identity for Spoke crew members - phone number = identity';
COMMENT ON TABLE spoke_updates IS 'Audit trail for all Spoke voice updates - the core processing record';
COMMENT ON TABLE spoke_drafts IS 'Unresolved Spoke updates awaiting job assignment via clarification';
COMMENT ON TABLE spoke_corrections IS 'EDIT corrections logged for post-beta learning system';
