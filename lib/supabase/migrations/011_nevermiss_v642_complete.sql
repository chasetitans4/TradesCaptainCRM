-- ============================================
-- NeverMiss v6.4.2 Complete Migration
-- Adds missing tables and fixes from spec
-- ============================================

-- =====================================================
-- 1. NEVERMISS EVENTS TABLE
-- Webhook event logging with idempotency handling
-- Critical for v6.4.2 multi-status approach
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- Event identification
  twilio_sid VARCHAR(50),  -- MessageSid or CallSid
  event_type VARCHAR(50) NOT NULL,  -- 'sms_status', 'sms_inbound', 'call_status', etc.

  -- For sms_status events, track individual status
  status VARCHAR(20),  -- 'queued', 'sent', 'delivered', 'failed', 'undelivered'
  error_code VARCHAR(20),
  error_message TEXT,

  -- Raw webhook payload
  raw_payload JSONB,

  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regular index for Twilio SID lookups (v6.4.2: NOT UNIQUE at column level!)
CREATE INDEX IF NOT EXISTS idx_nevermiss_events_twilio_sid
ON nevermiss_events(twilio_sid);

-- v6.4.2 FIX #1: Partial unique indexes for idempotency
-- Allow multiple status events per MessageSid (queued, sent, delivered all have same SID)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sms_status_event
ON nevermiss_events(twilio_sid, event_type, status)
WHERE event_type = 'sms_status';

-- For non-status events, one per SID
CREATE UNIQUE INDEX IF NOT EXISTS uniq_other_events
ON nevermiss_events(twilio_sid, event_type)
WHERE event_type != 'sms_status';

-- Index for processing pending events
CREATE INDEX IF NOT EXISTS idx_nevermiss_events_unprocessed
ON nevermiss_events(created_at)
WHERE processed = false;

-- Index for business lookups
CREATE INDEX IF NOT EXISTS idx_nevermiss_events_business
ON nevermiss_events(business_id, created_at DESC);

-- =====================================================
-- 2. NEVERMISS MESSAGES TABLE
-- Enhanced SMS message tracking with v6.4.2 fields
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES sms_conversations(id) ON DELETE CASCADE,

  -- Message content
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,

  -- Twilio tracking
  twilio_sid VARCHAR(50),
  from_number VARCHAR(50),  -- v6.4.2: Actual Twilio from number
  to_number VARCHAR(50),    -- v6.4.2: Destination number

  -- Status tracking (v6.4.2 priority: delivered=4 > failed=3 > sent=2 > queued=1)
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered')),
  error_code VARCHAR(20),

  -- AI tracking
  is_ai_response BOOLEAN DEFAULT false,
  ai_model VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,           -- v6.4.2: When delivered
  status_updated_at TIMESTAMPTZ,      -- v6.4.2: Last status change

  -- Metadata
  metadata JSONB
);

-- Index for Twilio SID lookups
CREATE INDEX IF NOT EXISTS idx_nevermiss_messages_twilio_sid
ON nevermiss_messages(twilio_sid);

-- Index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_nevermiss_messages_conversation
ON nevermiss_messages(conversation_id, created_at);

-- Index for business lookups
CREATE INDEX IF NOT EXISTS idx_nevermiss_messages_business
ON nevermiss_messages(business_id, created_at DESC);

-- =====================================================
-- 3. NEVERMISS CONVERSATIONS TABLE
-- Conversation state tracking with v6.4.2 fields
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),

  -- Phone numbers
  customer_phone VARCHAR(50) NOT NULL,
  business_phone VARCHAR(50) NOT NULL,

  -- Conversation state
  state VARCHAR(30) DEFAULT 'active' CHECK (state IN (
    'active',
    'awaiting_customer',
    'awaiting_staff',
    'booking_in_progress',
    'booking_confirmed',
    'handed_off',
    'abandoned',
    'blocked',
    'completed'
  )),

  -- AI mode
  ai_enabled BOOLEAN DEFAULT true,
  ai_handoff_reason TEXT,
  handed_off_at TIMESTAMPTZ,
  handed_off_to UUID,

  -- Booking context
  booking_hold_id UUID,  -- References calendar_slot_holds
  booking_job_id UUID REFERENCES jobs(id),

  -- Abuse detection (v6.4.1)
  message_count INTEGER DEFAULT 0,
  abuse_score INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_customer_message_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB
);

-- Index for phone number lookups (finding existing conversation)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_nevermiss_conversation_phones
ON nevermiss_conversations(business_id, customer_phone, business_phone)
WHERE state IN ('active', 'awaiting_customer', 'awaiting_staff', 'booking_in_progress');

-- Index for business lookups
CREATE INDEX IF NOT EXISTS idx_nevermiss_conversations_business
ON nevermiss_conversations(business_id, state, created_at DESC);

-- Index for customer lookups
CREATE INDEX IF NOT EXISTS idx_nevermiss_conversations_customer
ON nevermiss_conversations(customer_id);

-- =====================================================
-- 4. v6.4.2 FIX: UPDATE sms_messages status check
-- Add 'undelivered' to the status constraint
-- =====================================================

-- Update status check constraint on sms_messages to include 'undelivered'
ALTER TABLE sms_messages DROP CONSTRAINT IF EXISTS sms_messages_status_check;
ALTER TABLE sms_messages ADD CONSTRAINT sms_messages_status_check
  CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered'));

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE nevermiss_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_conversations ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can view their business events" ON nevermiss_events
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "System can insert events" ON nevermiss_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update events" ON nevermiss_events
  FOR UPDATE USING (true);

-- Messages policies
CREATE POLICY "Users can view their business messages" ON nevermiss_messages
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can insert messages for their business" ON nevermiss_messages
  FOR INSERT WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Users can update their business messages" ON nevermiss_messages
  FOR UPDATE USING (business_id = get_user_business_id());

-- Conversations policies
CREATE POLICY "Users can view their business conversations" ON nevermiss_conversations
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can insert conversations for their business" ON nevermiss_conversations
  FOR INSERT WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Users can update their business conversations" ON nevermiss_conversations
  FOR UPDATE USING (business_id = get_user_business_id());

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get current status priority (v6.4.2)
CREATE OR REPLACE FUNCTION get_sms_status_priority(p_status TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE p_status
    WHEN 'queued' THEN 1
    WHEN 'sent' THEN 2
    WHEN 'undelivered' THEN 3
    WHEN 'failed' THEN 3
    WHEN 'delivered' THEN 4  -- v6.4.2: Highest priority
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to safely update message status (v6.4.2: strict > comparison)
CREATE OR REPLACE FUNCTION update_message_status(
  p_twilio_sid TEXT,
  p_new_status TEXT,
  p_error_code TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
  v_current_priority INTEGER;
  v_new_priority INTEGER;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM nevermiss_messages
  WHERE twilio_sid = p_twilio_sid;

  IF v_current_status IS NULL THEN
    -- Also check sms_messages for backwards compatibility
    SELECT status INTO v_current_status
    FROM sms_messages
    WHERE twilio_sid = p_twilio_sid;

    IF v_current_status IS NULL THEN
      RETURN FALSE;  -- Message not found
    END IF;

    -- Update sms_messages
    v_current_priority := get_sms_status_priority(v_current_status);
    v_new_priority := get_sms_status_priority(p_new_status);

    IF v_new_priority > v_current_priority THEN
      UPDATE sms_messages
      SET status = p_new_status
      WHERE twilio_sid = p_twilio_sid;
      RETURN TRUE;
    END IF;

    RETURN FALSE;
  END IF;

  -- Update nevermiss_messages
  v_current_priority := get_sms_status_priority(v_current_status);
  v_new_priority := get_sms_status_priority(p_new_status);

  -- v6.4.2: Only update if new priority is STRICTLY higher
  IF v_new_priority > v_current_priority THEN
    UPDATE nevermiss_messages
    SET
      status = p_new_status,
      error_code = COALESCE(p_error_code, error_code),
      delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
      status_updated_at = NOW()
    WHERE twilio_sid = p_twilio_sid;

    RETURN TRUE;
  END IF;

  RETURN FALSE;  -- Status not higher priority
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE nevermiss_events IS 'Twilio webhook event log for idempotent processing (v6.4.2)';
COMMENT ON TABLE nevermiss_messages IS 'NeverMiss SMS messages with delivery tracking (v6.4.2)';
COMMENT ON TABLE nevermiss_conversations IS 'NeverMiss conversation state machine (v6.4.2)';
COMMENT ON FUNCTION get_sms_status_priority IS 'Returns priority: delivered(4) > failed/undelivered(3) > sent(2) > queued(1)';
COMMENT ON FUNCTION update_message_status IS 'Safely updates status only if new status has higher priority (v6.4.2)';
