-- =====================================================
-- MIGRATION 122: AI VOICE RECEPTIONIST - FOUNDATION
-- Version: 2.0 with Delta Adjustments (LOCKED)
--
-- Delta 1: Emergency-only voice escalation
-- Delta 2: Multi-location config hierarchy
-- Delta 3: Hard minute caps with explicit approval
-- Delta 4: Silence-over-guessing (confidence thresholds)
-- Delta 5: Initiation evidence logging (TCPA)
-- Delta 6: No training / no cross-tenant
-- =====================================================

-- Voice receptionist global settings
CREATE TABLE IF NOT EXISTS voice_receptionist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Core settings (from spec Section 14)
  answer_certainty_mode VARCHAR(30) DEFAULT 'RING_TIMEOUT_OR_FORWARD'
    CHECK (answer_certainty_mode IN ('RING_TIMEOUT_ONLY', 'RING_TIMEOUT_OR_FORWARD', 'EXPLICIT_FORWARD_ONLY')),
  ring_timeout_seconds INTEGER DEFAULT 20 CHECK (ring_timeout_seconds >= 5 AND ring_timeout_seconds <= 60),
  enable_daytime_ai_voice BOOLEAN DEFAULT FALSE,
  daytime_ai_voice_consent_at TIMESTAMPTZ,
  daytime_ai_voice_consent_by UUID REFERENCES admin_users(id),
  voicemail_escape_enabled BOOLEAN DEFAULT TRUE,

  -- Synthflow integration
  synthflow_assistant_id VARCHAR(100),
  synthflow_voice_id VARCHAR(50),

  -- Greeting customization (TTS + custom audio)
  greeting_text TEXT,
  greeting_audio_url TEXT,
  after_hours_greeting TEXT,
  after_hours_audio_url TEXT,

  -- Default contacts (can be overridden per location - Delta 2)
  default_primary_contact_id UUID REFERENCES admin_users(id),
  default_backup_contact_id UUID REFERENCES admin_users(id),
  default_escalation_wait_minutes INTEGER DEFAULT 3 CHECK (default_escalation_wait_minutes >= 1 AND default_escalation_wait_minutes <= 15),

  -- Delta 3: Usage cap mode (REQUIRED - no default auto-overage)
  overage_mode VARCHAR(20) NOT NULL DEFAULT 'hard_stop'
    CHECK (overage_mode IN ('hard_stop', 'approved_overage')),
  overage_opt_in_at TIMESTAMPTZ,
  overage_opt_in_by UUID REFERENCES admin_users(id),

  -- Delta 1: Escalation configuration (voice only for emergencies)
  emergency_voice_escalation_enabled BOOLEAN DEFAULT TRUE,
  max_voice_escalation_attempts INTEGER DEFAULT 2 CHECK (max_voice_escalation_attempts >= 1 AND max_voice_escalation_attempts <= 5),

  -- Delta 4: Confidence thresholds
  confidence_threshold_high DECIMAL(3,2) DEFAULT 0.85 CHECK (confidence_threshold_high >= 0.5 AND confidence_threshold_high <= 1.0),
  confidence_threshold_medium DECIMAL(3,2) DEFAULT 0.60 CHECK (confidence_threshold_medium >= 0.3 AND confidence_threshold_medium <= 0.9),

  -- Delta 6: Training opt-out (ALWAYS true, cannot be changed)
  training_opt_out BOOLEAN DEFAULT TRUE NOT NULL CHECK (training_opt_out = TRUE),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delta 2: Location-specific overrides
-- Only overrideable fields - global fields remain in voice_receptionist_settings
CREATE TABLE IF NOT EXISTS voice_location_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  location_id UUID NOT NULL,

  -- Overrideable fields ONLY (per Delta 2)
  business_hours JSONB,
  primary_contact_id UUID REFERENCES admin_users(id),
  backup_contact_id UUID REFERENCES admin_users(id),
  escalation_wait_minutes INTEGER CHECK (escalation_wait_minutes >= 1 AND escalation_wait_minutes <= 15),
  emergency_phrases JSONB,
  service_categories TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, location_id)
);

-- Emergency rules (global framework - Delta 2: not overrideable)
CREATE TABLE IF NOT EXISTS voice_emergency_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,

  -- Trigger configuration
  caller_confirmation_enabled BOOLEAN DEFAULT TRUE,
  keypad_override_enabled BOOLEAN DEFAULT FALSE,

  -- Default routing (can be overridden per-location)
  default_primary_contact_id UUID REFERENCES admin_users(id),
  default_backup_contact_id UUID REFERENCES admin_users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, category)
);

-- Emergency trigger phrases
CREATE TABLE IF NOT EXISTS voice_emergency_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES voice_emergency_rules(id) ON DELETE CASCADE NOT NULL,
  phrase TEXT NOT NULL,
  phrase_type VARCHAR(20) NOT NULL CHECK (phrase_type IN ('required', 'optional')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice call events (non-recording, per spec Section 13)
-- Delta 5: Initiation evidence is REQUIRED
CREATE TABLE IF NOT EXISTS voice_call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  location_id UUID,
  conversation_id UUID REFERENCES sms_conversations(id),
  customer_id UUID REFERENCES customers(id),

  -- Delta 5: Initiation evidence (REQUIRED - TCPA defense)
  initiation_source VARCHAR(20) NOT NULL CHECK (initiation_source IN ('CALL', 'SMS', 'VOICEMAIL', 'FORM')),
  initiation_evidence_id VARCHAR(100) NOT NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Call metadata
  call_sid VARCHAR(50) NOT NULL,
  phone_from VARCHAR(20) NOT NULL,
  phone_to VARCHAR(20) NOT NULL,
  call_start_time TIMESTAMPTZ NOT NULL,
  call_end_time TIMESTAMPTZ,
  call_duration_seconds INTEGER,

  -- AI handling
  availability_state VARCHAR(20) NOT NULL CHECK (availability_state IN ('LIVE_ANSWER', 'ON_CALL', 'MESSAGE_ONLY')),
  answer_certainty_signal VARCHAR(20) CHECK (answer_certainty_signal IN ('TIMEOUT', 'FORWARD', 'IMMEDIATE')),
  was_ai_answered BOOLEAN DEFAULT FALSE,
  was_missed BOOLEAN DEFAULT FALSE,
  voicemail_requested BOOLEAN DEFAULT FALSE,

  -- Delta 4: AI confidence tracking
  ai_confidence DECIMAL(3,2),
  ai_deferred_reason TEXT,

  -- Emergency
  is_emergency BOOLEAN DEFAULT FALSE,
  emergency_source VARCHAR(30) CHECK (emergency_source IN ('CALLER_CONFIRMATION', 'PHRASE_REQUIRED', 'PHRASE_OPTIONAL_CONFIRMED', 'KEYPAD')),

  -- AI summary (non-verbatim, per spec Section 13)
  ai_summary TEXT,
  ai_extracted_data JSONB,
  routing_action_taken TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delta 5: Ensure initiation evidence cannot be null or empty
ALTER TABLE voice_call_events DROP CONSTRAINT IF EXISTS initiation_evidence_required;
ALTER TABLE voice_call_events ADD CONSTRAINT initiation_evidence_required
  CHECK (initiation_evidence_id IS NOT NULL AND initiation_evidence_id != '');

-- Usage tracking (per spec Section 12 + Delta 3)
CREATE TABLE IF NOT EXISTS voice_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,

  included_minutes INTEGER NOT NULL DEFAULT 0,
  used_minutes DECIMAL(10,2) DEFAULT 0,

  -- Delta 3: Overage tracking (explicit approval required)
  overage_minutes DECIMAL(10,2) DEFAULT 0,
  overage_approved BOOLEAN DEFAULT FALSE,
  overage_approved_at TIMESTAMPTZ,
  overage_approved_by UUID REFERENCES admin_users(id),

  -- Cap enforcement
  hard_cap_triggered_at TIMESTAMPTZ,
  hard_cap_active BOOLEAN DEFAULT FALSE,

  -- Warnings
  warning_70_sent_at TIMESTAMPTZ,
  warning_90_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, billing_period_start)
);

-- Escalation tracking (Delta 1: emergency-only voice)
CREATE TABLE IF NOT EXISTS voice_escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_event_id UUID REFERENCES voice_call_events(id) ON DELETE CASCADE NOT NULL,

  step INTEGER NOT NULL CHECK (step >= 1 AND step <= 4),
  action_type VARCHAR(30) NOT NULL CHECK (action_type IN ('sms', 'push', 'email', 'slack', 'outbound_voice')),
  target_contact_id UUID REFERENCES admin_users(id),

  -- Delta 1: Voice escalation requires emergency
  is_emergency_escalation BOOLEAN DEFAULT FALSE,

  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_method VARCHAR(20) CHECK (acknowledgment_method IN ('sms_reply', 'app_interaction', 'portal_click', 'callback')),

  -- Failure tracking
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DELTA 1: ENFORCE EMERGENCY-ONLY VOICE ESCALATION
-- =====================================================

CREATE OR REPLACE FUNCTION check_voice_escalation_emergency()
RETURNS TRIGGER AS $$
BEGIN
  -- Voice escalation is ONLY permitted for emergencies
  IF NEW.action_type = 'outbound_voice' THEN
    IF NOT EXISTS (
      SELECT 1 FROM voice_call_events
      WHERE id = NEW.call_event_id AND is_emergency = TRUE
    ) THEN
      RAISE EXCEPTION 'STOP: Voice escalation is only permitted for confirmed emergencies (is_emergency must be TRUE)';
    END IF;
    -- Mark as emergency escalation
    NEW.is_emergency_escalation := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_emergency_voice_escalation ON voice_escalation_events;
CREATE TRIGGER enforce_emergency_voice_escalation
  BEFORE INSERT ON voice_escalation_events
  FOR EACH ROW EXECUTE FUNCTION check_voice_escalation_emergency();

-- =====================================================
-- DELTA 3: ENFORCE OVERAGE APPROVAL
-- =====================================================

CREATE OR REPLACE FUNCTION check_overage_approval()
RETURNS TRIGGER AS $$
DECLARE
  settings RECORD;
BEGIN
  -- Only check on usage increase
  IF NEW.used_minutes <= OLD.used_minutes THEN
    RETURN NEW;
  END IF;

  SELECT overage_mode, overage_opt_in_at INTO settings
  FROM voice_receptionist_settings
  WHERE business_id = NEW.business_id;

  -- Check if going over limit
  IF NEW.used_minutes > NEW.included_minutes THEN
    IF settings.overage_mode = 'hard_stop' THEN
      -- Hard stop: cap at included minutes
      NEW.used_minutes := NEW.included_minutes;
      NEW.hard_cap_active := TRUE;
      NEW.hard_cap_triggered_at := COALESCE(NEW.hard_cap_triggered_at, NOW());
      RAISE NOTICE 'Voice usage capped at included minutes (hard_stop mode)';
    ELSIF settings.overage_mode = 'approved_overage' AND settings.overage_opt_in_at IS NULL THEN
      -- Overage mode but not approved - treat as hard stop
      NEW.used_minutes := NEW.included_minutes;
      NEW.hard_cap_active := TRUE;
      NEW.hard_cap_triggered_at := COALESCE(NEW.hard_cap_triggered_at, NOW());
      RAISE NOTICE 'Voice usage capped - overage not approved';
    END IF;
    -- Calculate overage minutes
    NEW.overage_minutes := GREATEST(0, NEW.used_minutes - NEW.included_minutes);
    NEW.overage_approved := (settings.overage_opt_in_at IS NOT NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_overage_approval ON voice_usage;
CREATE TRIGGER enforce_overage_approval
  BEFORE UPDATE ON voice_usage
  FOR EACH ROW EXECUTE FUNCTION check_overage_approval();

-- =====================================================
-- EXTEND BUSINESSES TABLE
-- =====================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS voice_minutes_limit INTEGER DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS voice_minutes_used DECIMAL(10,2) DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS voice_month_reset_at TIMESTAMPTZ;

-- =====================================================
-- ROW LEVEL SECURITY (Delta 6: Tenant Isolation)
-- =====================================================

ALTER TABLE voice_receptionist_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_location_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_emergency_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_emergency_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_escalation_events ENABLE ROW LEVEL SECURITY;

-- Policies for service role (bypass RLS)
DROP POLICY IF EXISTS "Service role bypass" ON voice_receptionist_settings;
CREATE POLICY "Service role bypass" ON voice_receptionist_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role bypass" ON voice_location_overrides;
CREATE POLICY "Service role bypass" ON voice_location_overrides
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role bypass" ON voice_emergency_rules;
CREATE POLICY "Service role bypass" ON voice_emergency_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role bypass" ON voice_emergency_phrases;
CREATE POLICY "Service role bypass" ON voice_emergency_phrases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role bypass" ON voice_call_events;
CREATE POLICY "Service role bypass" ON voice_call_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role bypass" ON voice_usage;
CREATE POLICY "Service role bypass" ON voice_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role bypass" ON voice_escalation_events;
CREATE POLICY "Service role bypass" ON voice_escalation_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_voice_receptionist_settings_business
  ON voice_receptionist_settings(business_id);

CREATE INDEX IF NOT EXISTS idx_voice_location_overrides_business_location
  ON voice_location_overrides(business_id, location_id);

CREATE INDEX IF NOT EXISTS idx_voice_emergency_rules_business
  ON voice_emergency_rules(business_id);

CREATE INDEX IF NOT EXISTS idx_voice_emergency_phrases_rule
  ON voice_emergency_phrases(rule_id);

CREATE INDEX IF NOT EXISTS idx_voice_call_events_business
  ON voice_call_events(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_call_events_emergency
  ON voice_call_events(business_id, is_emergency) WHERE is_emergency = TRUE;

CREATE INDEX IF NOT EXISTS idx_voice_call_events_call_sid
  ON voice_call_events(call_sid);

CREATE INDEX IF NOT EXISTS idx_voice_usage_period
  ON voice_usage(business_id, billing_period_start);

CREATE INDEX IF NOT EXISTS idx_voice_escalation_pending
  ON voice_escalation_events(call_event_id, acknowledged_at) WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_voice_escalation_call_event
  ON voice_escalation_events(call_event_id);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_voice_receptionist_settings_updated_at ON voice_receptionist_settings;
CREATE TRIGGER update_voice_receptionist_settings_updated_at
  BEFORE UPDATE ON voice_receptionist_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_voice_location_overrides_updated_at ON voice_location_overrides;
CREATE TRIGGER update_voice_location_overrides_updated_at
  BEFORE UPDATE ON voice_location_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_voice_emergency_rules_updated_at ON voice_emergency_rules;
CREATE TRIGGER update_voice_emergency_rules_updated_at
  BEFORE UPDATE ON voice_emergency_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE voice_receptionist_settings IS 'Global voice receptionist settings per business. Delta 6: training_opt_out is always TRUE.';
COMMENT ON TABLE voice_location_overrides IS 'Delta 2: Per-location overrides for operational fields only (hours, contacts, phrases).';
COMMENT ON TABLE voice_emergency_rules IS 'Emergency category definitions. Framework is global per Delta 2.';
COMMENT ON TABLE voice_emergency_phrases IS 'Trigger phrases for emergency detection (required = immediate, optional = confirm).';
COMMENT ON TABLE voice_call_events IS 'Voice call logs with Delta 5 initiation evidence for TCPA compliance.';
COMMENT ON TABLE voice_usage IS 'Voice minutes tracking with Delta 3 hard cap enforcement.';
COMMENT ON TABLE voice_escalation_events IS 'Escalation event log. Delta 1: outbound_voice only for emergencies.';

COMMENT ON COLUMN voice_receptionist_settings.training_opt_out IS 'Delta 6: ALWAYS TRUE. Voice/SMS data is never used for AI training.';
COMMENT ON COLUMN voice_receptionist_settings.overage_mode IS 'Delta 3: hard_stop (default) or approved_overage. No silent overages.';
COMMENT ON COLUMN voice_call_events.initiation_evidence_id IS 'Delta 5: Required proof of inbound initiation (Call SID, SMS SID, etc.)';
COMMENT ON COLUMN voice_escalation_events.is_emergency_escalation IS 'Delta 1: TRUE only when escalating for confirmed emergency.';

-- =====================================================
-- SYNTHFLOW CALL MAPPING
-- Maps Synthflow call IDs to our internal call events
-- =====================================================

CREATE TABLE IF NOT EXISTS synthflow_call_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synthflow_call_id VARCHAR(100) UNIQUE NOT NULL,
  call_event_id UUID REFERENCES voice_call_events(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_synthflow_call_mapping_synthflow_id
  ON synthflow_call_mapping(synthflow_call_id);

CREATE INDEX IF NOT EXISTS idx_synthflow_call_mapping_call_event
  ON synthflow_call_mapping(call_event_id);

ALTER TABLE synthflow_call_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass" ON synthflow_call_mapping;
CREATE POLICY "Service role bypass" ON synthflow_call_mapping
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE synthflow_call_mapping IS 'Maps Synthflow AI call IDs to internal voice_call_events for webhook processing.';
