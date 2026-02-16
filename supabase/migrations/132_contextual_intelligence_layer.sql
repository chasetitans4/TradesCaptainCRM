-- =====================================================
-- MIGRATION 132: CONTEXTUAL INTELLIGENCE LAYER (CIL)
--
-- Per CIL Spec v1.1:
-- Implements the Nudge System infrastructure:
--   1. nudge_dismissals - Track dismissed nudges
--   2. follow_up_reminders - Promise Keeper system
--
-- Design Principles:
--   - Contextual, not navigational
--   - Subtle, not aggressive
--   - Dismissible without penalty
--   - Lifecycle-aware
-- =====================================================

-- =====================================================
-- PART 1: NUDGE DISMISSALS TABLE
-- =====================================================

-- Track which nudges have been dismissed by users
-- Per spec: "Dismissals respected. No reappearing unless conditions materially change"
CREATE TABLE IF NOT EXISTS nudge_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who dismissed
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What was dismissed
  nudge_type TEXT NOT NULL,
  entity_type TEXT,  -- 'customer', 'job', 'equipment', 'agreement'
  entity_id UUID,
  context_key TEXT,  -- For material change detection (hash of conditions)

  -- When
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- NULL = permanent dismissal

  -- Ensure unique dismissals per context
  UNIQUE(user_id, nudge_type, entity_type, entity_id, context_key)
);

-- Index for fast lookups during nudge evaluation
CREATE INDEX IF NOT EXISTS idx_nudge_dismissals_lookup
  ON nudge_dismissals(user_id, nudge_type, entity_type, entity_id);

-- Index for cleanup of expired dismissals
CREATE INDEX IF NOT EXISTS idx_nudge_dismissals_expires
  ON nudge_dismissals(expires_at)
  WHERE expires_at IS NOT NULL;

-- RLS Policies for nudge_dismissals
ALTER TABLE nudge_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can only see their own dismissals
CREATE POLICY "Users can view own dismissals"
  ON nudge_dismissals FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own dismissals
CREATE POLICY "Users can create own dismissals"
  ON nudge_dismissals FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only delete their own dismissals (for material change resets)
CREATE POLICY "Users can delete own dismissals"
  ON nudge_dismissals FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- PART 2: FOLLOW-UP REMINDERS TABLE (Promise Keeper)
-- =====================================================

-- Per spec Section 2.2: "Trust system, not task management"
-- Lightweight follow-up system for verbal commitments
CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization scope
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Who created/assigned
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  -- What entity this relates to
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- The promise details
  description TEXT NOT NULL,
  source_note TEXT,  -- The original note that triggered the promise

  -- When it's due
  due_date DATE NOT NULL,
  due_time TIME,

  -- Status tracking
  -- 'pending' - not yet due
  -- 'due' - due today
  -- 'overdue' - past due date
  -- 'completed' - marked as done
  -- 'snoozed' - pushed to later date
  -- 'dismissed' - dismissed without completing
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'due', 'overdue', 'completed', 'snoozed', 'dismissed')),

  -- Completion tracking
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completion_note TEXT,

  -- Snooze tracking
  snoozed_until DATE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup of pending/due reminders by assigned user
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_pending
  ON follow_up_reminders(assigned_to, due_date)
  WHERE status IN ('pending', 'due', 'overdue');

-- Index for finding reminders by customer
CREATE INDEX IF NOT EXISTS idx_reminders_customer
  ON follow_up_reminders(customer_id, status);

-- Index for finding reminders by job
CREATE INDEX IF NOT EXISTS idx_reminders_job
  ON follow_up_reminders(job_id)
  WHERE job_id IS NOT NULL;

-- Index for organization-wide queries
CREATE INDEX IF NOT EXISTS idx_reminders_business_status
  ON follow_up_reminders(business_id, status, due_date);

-- RLS Policies for follow_up_reminders
ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;

-- Users can view reminders in their organization
CREATE POLICY "Users can view org reminders"
  ON follow_up_reminders FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can create reminders in their organization
CREATE POLICY "Users can create org reminders"
  ON follow_up_reminders FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update reminders they created or are assigned to
CREATE POLICY "Users can update assigned reminders"
  ON follow_up_reminders FOR UPDATE
  USING (
    created_by = auth.uid() OR assigned_to = auth.uid()
  );

-- Only creator can delete reminders
CREATE POLICY "Creators can delete reminders"
  ON follow_up_reminders FOR DELETE
  USING (created_by = auth.uid());

-- =====================================================
-- PART 3: HELPER FUNCTIONS
-- =====================================================

-- Function to update reminder statuses based on due dates
-- Should be called periodically (e.g., via cron job or on app startup)
CREATE OR REPLACE FUNCTION update_reminder_statuses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark due reminders
  UPDATE follow_up_reminders
  SET
    status = 'due',
    updated_at = NOW()
  WHERE
    status = 'pending'
    AND due_date = CURRENT_DATE;

  -- Mark overdue reminders
  UPDATE follow_up_reminders
  SET
    status = 'overdue',
    updated_at = NOW()
  WHERE
    status IN ('pending', 'due')
    AND due_date < CURRENT_DATE;

  -- Handle snoozed reminders that are now active
  UPDATE follow_up_reminders
  SET
    status = CASE
      WHEN due_date < CURRENT_DATE THEN 'overdue'
      WHEN due_date = CURRENT_DATE THEN 'due'
      ELSE 'pending'
    END,
    snoozed_until = NULL,
    updated_at = NOW()
  WHERE
    status = 'snoozed'
    AND snoozed_until <= CURRENT_DATE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Function to cleanup expired nudge dismissals
CREATE OR REPLACE FUNCTION cleanup_expired_dismissals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM nudge_dismissals
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to reset dismissals for material condition changes
-- Called when conditions that generated a nudge have materially changed
CREATE OR REPLACE FUNCTION reset_nudge_dismissals(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_nudge_types TEXT[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF p_nudge_types IS NOT NULL THEN
    DELETE FROM nudge_dismissals
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND nudge_type = ANY(p_nudge_types);
  ELSE
    DELETE FROM nudge_dismissals
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id;
  END IF;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- PART 4: TRIGGERS
-- =====================================================

-- Update updated_at timestamp on follow_up_reminders
CREATE OR REPLACE FUNCTION update_reminder_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_reminder_updated_at
  BEFORE UPDATE ON follow_up_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_reminder_timestamp();

-- Reset quiet_customer dismissals when a new job is completed
-- Per spec: "Auto-clears on new job completion"
CREATE OR REPLACE FUNCTION on_job_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Reset quiet_customer nudge dismissals for this customer
    PERFORM reset_nudge_dismissals('customer', NEW.customer_id, ARRAY['quiet_customer']);
  END IF;
  RETURN NEW;
END;
$$;

-- Only create trigger if jobs table exists and doesn't already have this trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
    DROP TRIGGER IF EXISTS trigger_job_completed_nudge_reset ON jobs;
    CREATE TRIGGER trigger_job_completed_nudge_reset
      AFTER UPDATE OF status ON jobs
      FOR EACH ROW
      EXECUTE FUNCTION on_job_completed();
  END IF;
END;
$$;

-- =====================================================
-- PART 5: ADD last_completed_job_date TO CUSTOMERS
-- =====================================================

-- Add column if it doesn't exist (for quiet customer detection)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'last_completed_job_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN last_completed_job_date TIMESTAMPTZ;
  END IF;
END;
$$;

-- Function to update customer's last_completed_job_date
CREATE OR REPLACE FUNCTION update_customer_last_job_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE customers
    SET last_completed_job_date = NEW.completed_at
    WHERE id = NEW.customer_id
      AND (last_completed_job_date IS NULL OR last_completed_job_date < NEW.completed_at);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for updating customer's last job date
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
    DROP TRIGGER IF EXISTS trigger_update_customer_last_job ON jobs;
    CREATE TRIGGER trigger_update_customer_last_job
      AFTER UPDATE OF status ON jobs
      FOR EACH ROW
      EXECUTE FUNCTION update_customer_last_job_date();
  END IF;
END;
$$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
COMMENT ON TABLE nudge_dismissals IS 'Tracks dismissed nudges per CIL spec - dismissals respected until material change';
COMMENT ON TABLE follow_up_reminders IS 'Promise Keeper system - lightweight follow-up tracking for verbal commitments';
