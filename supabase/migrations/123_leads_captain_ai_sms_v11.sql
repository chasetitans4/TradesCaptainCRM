-- =====================================================
-- MIGRATION 123: LEADS CAPTAIN AI SMS - SPEC v1.1 COMPLIANCE
-- Implements formal conversation lifecycle, qualification tracking,
-- TCPA-compliant opt-out logging, and follow-up scheduling
-- =====================================================

-- =====================================================
-- 1. CONVERSATION STATE ENUM
-- States: INITIATED → QUALIFYING → QUALIFIED → ROUTED → HUMAN_ACTIVE → UNRESPONSIVE → OPTED_OUT → CLOSED
-- =====================================================

DO $$ BEGIN
  CREATE TYPE conversation_state AS ENUM (
    'INITIATED',      -- First contact received, no AI response yet
    'QUALIFYING',     -- AI is gathering qualification data
    'QUALIFIED',      -- All required fields collected (name, service_needed, urgency)
    'ROUTED',         -- Handed to human/CRM for follow-up
    'HUMAN_ACTIVE',   -- Human has taken over (AI PERMANENTLY DISABLED - no auto-resume)
    'UNRESPONSIVE',   -- Customer stopped responding (48hr+ silence)
    'OPTED_OUT',      -- Customer sent STOP keyword
    'CLOSED'          -- Conversation ended
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. URGENCY ENUM
-- Used for routing timeout determination
-- =====================================================

DO $$ BEGIN
  CREATE TYPE lead_urgency AS ENUM (
    'routine',   -- 30 minute hold before routing
    'soon',      -- 30 minute hold before routing
    'urgent',    -- 10 minute hold before routing
    'emergency'  -- Immediate routing (0 minutes)
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 3. INITIATION SOURCE ENUM (TCPA compliance)
-- Every conversation must have proof of inbound initiation
-- =====================================================

DO $$ BEGIN
  CREATE TYPE initiation_source AS ENUM (
    'missed_call',     -- Customer called, we missed it
    'incoming_sms',    -- Customer texted first
    'voicemail',       -- Customer left voicemail
    'voice_handoff',   -- AI voice receptionist handed off
    'web_form'         -- Customer submitted web form with consent
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 4. ADD COLUMNS TO leads_captain_conversations_v2
-- =====================================================

ALTER TABLE leads_captain_conversations_v2
  -- Formal conversation state (replaces informal status field)
  ADD COLUMN IF NOT EXISTS conversation_state conversation_state DEFAULT 'INITIATED',
  ADD COLUMN IF NOT EXISTS state_changed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS state_change_reason TEXT,

  -- Qualification tracking (spec Section 5)
  -- Required: name, service_needed, urgency
  -- Optional: address, availability, photos_offered
  ADD COLUMN IF NOT EXISTS qualification_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS qualification_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS urgency lead_urgency,

  -- Routing timeout (based on urgency)
  ADD COLUMN IF NOT EXISTS routing_timeout_at TIMESTAMPTZ,

  -- Human override tracking (ABSOLUTE - AI permanently disabled)
  ADD COLUMN IF NOT EXISTS human_active_since TIMESTAMPTZ,
  -- NOTE: NO auto-resume timer - AI stays disabled until explicit reset

  -- Follow-up tracking (1hr, 4hr, 24hr per spec Section 4.4)
  ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,

  -- Unresponsive tracking (48hr total silence)
  ADD COLUMN IF NOT EXISTS unresponsive_at TIMESTAMPTZ,

  -- Opt-back-in safety delay (AI resumes on NEXT message after START)
  ADD COLUMN IF NOT EXISTS opt_back_in_pending BOOLEAN DEFAULT FALSE,

  -- Initiation evidence (TCPA compliance)
  ADD COLUMN IF NOT EXISTS initiation_source initiation_source,
  ADD COLUMN IF NOT EXISTS initiation_evidence_id VARCHAR(100), -- Call SID, SMS SID, Form ID
  ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ;

-- =====================================================
-- 5. STATE TRANSITION LOG (audit trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_state_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  from_state conversation_state,
  to_state conversation_state NOT NULL,
  reason TEXT,
  triggered_by VARCHAR(50) CHECK (triggered_by IN ('ai', 'human', 'system', 'customer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key only if leads_captain_conversations_v2 exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads_captain_conversations_v2') THEN
    ALTER TABLE conversation_state_log
      ADD CONSTRAINT fk_conversation_state_log_conversation
      FOREIGN KEY (conversation_id) REFERENCES leads_captain_conversations_v2(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 6. OPT-OUT AUDIT LOG (TCPA compliance)
-- Records every STOP/START action for legal defense
-- =====================================================

CREATE TABLE IF NOT EXISTS opt_out_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('opt_out', 'opt_back_in')),
  keyword_used VARCHAR(50), -- STOP, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT, START, UNSTOP, SUBSCRIBE
  message_sid VARCHAR(50),  -- Twilio message SID for evidence
  conversation_id UUID,     -- Link to conversation if available
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL
);

-- =====================================================
-- 7. FOLLOW-UP SCHEDULE (1hr, 4hr, 24hr timing)
-- =====================================================

CREATE TABLE IF NOT EXISTS follow_up_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  follow_up_number INTEGER NOT NULL CHECK (follow_up_number BETWEEN 1 AND 3),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  customer_responded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, follow_up_number)
);

-- Add foreign key
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads_captain_conversations_v2') THEN
    ALTER TABLE follow_up_schedule
      ADD CONSTRAINT fk_follow_up_schedule_conversation
      FOREIGN KEY (conversation_id) REFERENCES leads_captain_conversations_v2(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 8. AI SMS ANALYTICS (spec Section 15)
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_sms_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Response metrics
  total_conversations INTEGER DEFAULT 0,
  total_ai_messages INTEGER DEFAULT 0,
  total_customer_messages INTEGER DEFAULT 0,
  median_response_time_seconds INTEGER,
  p95_response_time_seconds INTEGER,

  -- Qualification metrics
  conversations_qualified INTEGER DEFAULT 0,
  qualification_rate DECIMAL(5,2),

  -- Handoff metrics
  conversations_handed_off INTEGER DEFAULT 0,
  handoff_rate DECIMAL(5,2),

  -- Opt-out metrics
  total_opt_outs INTEGER DEFAULT 0,
  opt_out_rate DECIMAL(5,2),

  -- Emergency metrics
  emergency_detections INTEGER DEFAULT 0,
  emergency_false_positives INTEGER DEFAULT 0,

  -- Follow-up metrics
  follow_ups_sent INTEGER DEFAULT 0,
  follow_ups_re_engaged INTEGER DEFAULT 0,
  follow_up_effectiveness DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, period_start)
);

-- =====================================================
-- 9. MMS ATTACHMENT TRACKING (30-day retention)
-- =====================================================

CREATE TABLE IF NOT EXISTS mms_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL, -- References leads_captain_messages_v2 or sms_messages
  conversation_id UUID NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,

  media_url TEXT NOT NULL,
  content_type VARCHAR(100),
  file_size_bytes INTEGER,

  received_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- 30 days from received_at

  -- Cleanup tracking
  deleted_at TIMESTAMPTZ,
  deletion_reason VARCHAR(50), -- 'expired', 'manual', 'customer_request'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. INDEXES FOR PERFORMANCE
-- =====================================================

-- Conversation state lookups
CREATE INDEX IF NOT EXISTS idx_lc_conversations_state
  ON leads_captain_conversations_v2(config_id, conversation_state);

-- Follow-up queue processing
CREATE INDEX IF NOT EXISTS idx_lc_conversations_next_followup
  ON leads_captain_conversations_v2(next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

-- Human active tracking
CREATE INDEX IF NOT EXISTS idx_lc_conversations_human_active
  ON leads_captain_conversations_v2(config_id, human_active_since)
  WHERE human_active_since IS NOT NULL;

-- State log lookups
CREATE INDEX IF NOT EXISTS idx_state_log_conversation
  ON conversation_state_log(conversation_id, created_at DESC);

-- Opt-out log lookups (for compliance checks)
CREATE INDEX IF NOT EXISTS idx_opt_out_log_phone
  ON opt_out_log(phone_number, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_opt_out_log_business
  ON opt_out_log(business_id, logged_at DESC);

-- Follow-up schedule processing
CREATE INDEX IF NOT EXISTS idx_follow_up_pending
  ON follow_up_schedule(scheduled_at)
  WHERE sent_at IS NULL;

-- MMS attachment expiration cleanup
CREATE INDEX IF NOT EXISTS idx_mms_attachments_expiry
  ON mms_attachments(expires_at)
  WHERE deleted_at IS NULL;

-- Analytics lookups
CREATE INDEX IF NOT EXISTS idx_ai_sms_analytics_business
  ON ai_sms_analytics(business_id, period_start DESC);

-- =====================================================
-- 11. HELPER FUNCTION: Valid State Transitions
-- CRITICAL: HUMAN_ACTIVE only transitions to OPTED_OUT or CLOSED
-- AI cannot re-engage after human takeover (compliance requirement)
-- =====================================================

CREATE OR REPLACE FUNCTION is_valid_state_transition(
  from_state conversation_state,
  to_state conversation_state
) RETURNS BOOLEAN AS $$
BEGIN
  -- From INITIATED
  IF from_state = 'INITIATED' THEN
    RETURN to_state IN ('QUALIFYING', 'OPTED_OUT', 'CLOSED');
  END IF;

  -- From QUALIFYING
  IF from_state = 'QUALIFYING' THEN
    RETURN to_state IN ('QUALIFIED', 'HUMAN_ACTIVE', 'UNRESPONSIVE', 'OPTED_OUT', 'CLOSED');
  END IF;

  -- From QUALIFIED
  IF from_state = 'QUALIFIED' THEN
    RETURN to_state IN ('ROUTED', 'HUMAN_ACTIVE', 'OPTED_OUT', 'CLOSED');
  END IF;

  -- From ROUTED
  IF from_state = 'ROUTED' THEN
    RETURN to_state IN ('HUMAN_ACTIVE', 'UNRESPONSIVE', 'OPTED_OUT', 'CLOSED');
  END IF;

  -- From HUMAN_ACTIVE (LOCKED: AI cannot re-engage)
  IF from_state = 'HUMAN_ACTIVE' THEN
    RETURN to_state IN ('OPTED_OUT', 'CLOSED');
  END IF;

  -- From UNRESPONSIVE (customer can return)
  IF from_state = 'UNRESPONSIVE' THEN
    RETURN to_state IN ('QUALIFYING', 'HUMAN_ACTIVE', 'OPTED_OUT', 'CLOSED');
  END IF;

  -- From OPTED_OUT (only via opt-back-in)
  IF from_state = 'OPTED_OUT' THEN
    RETURN to_state = 'QUALIFYING';
  END IF;

  -- From CLOSED (terminal state)
  IF from_state = 'CLOSED' THEN
    RETURN FALSE;
  END IF;

  -- NULL from_state (new conversation)
  IF from_state IS NULL THEN
    RETURN to_state = 'INITIATED';
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 12. TRIGGER: Validate State Transitions
-- =====================================================

CREATE OR REPLACE FUNCTION validate_conversation_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if conversation_state is being changed
  IF OLD.conversation_state IS DISTINCT FROM NEW.conversation_state THEN
    IF NOT is_valid_state_transition(OLD.conversation_state, NEW.conversation_state) THEN
      RAISE EXCEPTION 'Invalid state transition from % to %',
        COALESCE(OLD.conversation_state::TEXT, 'NULL'),
        NEW.conversation_state::TEXT;
    END IF;

    -- Auto-update state_changed_at
    NEW.state_changed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads_captain_conversations_v2') THEN
    DROP TRIGGER IF EXISTS validate_state_transition ON leads_captain_conversations_v2;
    CREATE TRIGGER validate_state_transition
      BEFORE UPDATE ON leads_captain_conversations_v2
      FOR EACH ROW
      EXECUTE FUNCTION validate_conversation_state_transition();
  END IF;
END $$;

-- =====================================================
-- 13. TRIGGER: Log State Transitions
-- =====================================================

CREATE OR REPLACE FUNCTION log_conversation_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.conversation_state IS DISTINCT FROM NEW.conversation_state THEN
    INSERT INTO conversation_state_log (
      conversation_id,
      from_state,
      to_state,
      reason,
      triggered_by
    ) VALUES (
      NEW.id,
      OLD.conversation_state,
      NEW.conversation_state,
      NEW.state_change_reason,
      COALESCE(NEW.state_change_reason, 'system')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads_captain_conversations_v2') THEN
    DROP TRIGGER IF EXISTS log_state_transition ON leads_captain_conversations_v2;
    CREATE TRIGGER log_state_transition
      AFTER UPDATE ON leads_captain_conversations_v2
      FOR EACH ROW
      EXECUTE FUNCTION log_conversation_state_transition();
  END IF;
END $$;

-- =====================================================
-- 14. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TYPE conversation_state IS 'Leads Captain AI SMS conversation lifecycle states per spec v1.1';
COMMENT ON TYPE lead_urgency IS 'Urgency levels for routing timeout calculation';
COMMENT ON TYPE initiation_source IS 'TCPA-compliant inbound initiation evidence sources';

COMMENT ON TABLE conversation_state_log IS 'Audit trail of all conversation state transitions';
COMMENT ON TABLE opt_out_log IS 'TCPA-compliant log of all opt-out and opt-back-in actions';
COMMENT ON TABLE follow_up_schedule IS 'Scheduled follow-up messages (1hr, 4hr, 24hr timing)';
COMMENT ON TABLE ai_sms_analytics IS 'Aggregated AI SMS performance metrics per spec Section 15';
COMMENT ON TABLE mms_attachments IS 'MMS media attachments with 30-day retention policy';

COMMENT ON FUNCTION is_valid_state_transition IS 'Validates conversation state transitions. CRITICAL: HUMAN_ACTIVE is terminal for AI engagement.';
