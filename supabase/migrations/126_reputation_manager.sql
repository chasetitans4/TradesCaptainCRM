-- =====================================================
-- MIGRATION 126: REPUTATION MANAGER
--
-- Convert completed jobs into verified public reputation
-- Consumes Proof of Work artifacts (READ-ONLY reference)
--
-- Key Principle: "Proof of Work creates trust artifacts.
--                Reputation Manager distributes and amplifies them."
--
-- CRITICAL INTEGRATION DIRECTIVE:
--   - Proof of Work is EXISTING and IMMUTABLE
--   - NEVER modify PoW records
--   - NEVER duplicate PoW tables or logic
--   - Reference PoW by foreign key ONLY
-- =====================================================

-- =====================================================
-- 1. REPUTATION REQUESTS
-- One request per job (enforced by UNIQUE constraint)
-- Tracks outbound reputation requests to customers
-- =====================================================

CREATE TABLE IF NOT EXISTS reputation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- PoW Reference (READ-ONLY, NEVER modify the referenced PoW)
  proof_of_work_id UUID REFERENCES proof_of_work(id),

  -- Request identification
  access_token VARCHAR(32) NOT NULL UNIQUE,

  -- Status lifecycle
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',           -- Created, not yet sent
      'scheduled',         -- Scheduled for future delivery
      'sent',              -- Delivered to customer
      'delivered',         -- Confirmed delivery
      'opened',            -- Customer opened the link
      'feedback_received', -- Customer submitted feedback
      'review_requested',  -- Positive: sent to review site
      'recovery_started',  -- Negative: human recovery initiated
      'completed',         -- Workflow complete
      'expired'            -- No response within expiry period
    )),

  -- Delivery configuration
  delivery_channel VARCHAR(10) NOT NULL DEFAULT 'SMS'
    CHECK (delivery_channel IN ('SMS', 'EMAIL', 'BOTH')),
  delivery_delay_minutes INTEGER DEFAULT 0,

  -- Delivery tracking
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  delivery_failed_at TIMESTAMPTZ,
  delivery_error TEXT,
  delivery_attempts INTEGER DEFAULT 0,

  -- TCPA Compliance
  tcpa_consent_method VARCHAR(30) NOT NULL DEFAULT 'transactional'
    CHECK (tcpa_consent_method IN ('transactional', 'prior_express', 'customer_initiated')),
  tcpa_consent_at TIMESTAMPTZ,
  opt_out_at TIMESTAMPTZ,

  -- Reminder tracking (max 1 reminder per spec)
  reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Enforce one request per job
  UNIQUE(job_id)
);

COMMENT ON TABLE reputation_requests IS 'Outbound reputation requests - one per completed job';
COMMENT ON COLUMN reputation_requests.proof_of_work_id IS 'FK to proof_of_work - READ-ONLY reference, never modify PoW';
COMMENT ON COLUMN reputation_requests.tcpa_consent_method IS 'TCPA compliance method - transactional follow-up is primary';

-- =====================================================
-- 2. REPUTATION FEEDBACK
-- Collected customer responses and sentiment routing
-- =====================================================

CREATE TABLE IF NOT EXISTS reputation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES reputation_requests(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Sentiment (determines routing)
  sentiment_score INTEGER NOT NULL CHECK (sentiment_score BETWEEN 1 AND 5),
  sentiment_category VARCHAR(20) NOT NULL
    CHECK (sentiment_category IN ('positive', 'neutral', 'negative')),

  -- Feedback content
  feedback_text TEXT,

  -- Structured feedback (optional)
  praise_areas TEXT[],
  improvement_areas TEXT[],

  -- Review site routing (for positive sentiment)
  review_link_shown BOOLEAN DEFAULT FALSE,
  review_link_clicked BOOLEAN DEFAULT FALSE,
  review_link_clicked_at TIMESTAMPTZ,
  review_platform VARCHAR(20),
  review_url_used TEXT,

  -- Recovery tracking (for negative sentiment)
  recovery_needed BOOLEAN DEFAULT FALSE,
  recovery_assigned_to UUID REFERENCES users(id),
  recovery_status VARCHAR(20)
    CHECK (recovery_status IN ('pending', 'in_progress', 'resolved', 'escalated', 'closed')),
  recovery_notes TEXT,
  recovery_started_at TIMESTAMPTZ,
  recovery_resolved_at TIMESTAMPTZ,
  recovery_resolution TEXT,

  -- Privacy
  is_public BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reputation_feedback IS 'Customer feedback with sentiment-based routing';
COMMENT ON COLUMN reputation_feedback.sentiment_category IS 'Determines routing: positive→review, negative→recovery';
COMMENT ON COLUMN reputation_feedback.recovery_needed IS 'True if negative sentiment requires human follow-up';

-- =====================================================
-- 3. REPUTATION SETTINGS
-- Per-business configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS reputation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Feature toggle
  is_enabled BOOLEAN DEFAULT TRUE,

  -- Timing configuration
  send_delay_minutes INTEGER DEFAULT 60,
  request_expiry_days INTEGER DEFAULT 14,
  reminder_delay_hours INTEGER DEFAULT 48,
  max_reminders INTEGER DEFAULT 1,

  -- Sentiment thresholds
  positive_threshold INTEGER DEFAULT 4,
  negative_threshold INTEGER DEFAULT 2,

  -- Delivery preferences
  default_channel VARCHAR(10) DEFAULT 'SMS'
    CHECK (default_channel IN ('SMS', 'EMAIL', 'BOTH')),

  -- Daily limits
  max_requests_per_day INTEGER DEFAULT 25,

  -- Review platforms (priority order)
  review_platforms JSONB DEFAULT '[
    {"platform": "google", "enabled": true, "priority": 1, "url": null},
    {"platform": "facebook", "enabled": false, "priority": 2, "url": null}
  ]',

  -- Message templates
  initial_message_template TEXT DEFAULT 'Hi {{customer.firstName}}! Thanks for choosing {{business.name}}. We''d love to hear about your experience. It only takes 30 seconds: {{feedbackUrl}}',

  initial_message_with_pow_template TEXT DEFAULT 'Hi {{customer.firstName}}! Thanks for choosing {{business.name}}. View your verified service record: {{powUrl}} - We''d also love your feedback: {{feedbackUrl}}',

  positive_followup_template TEXT DEFAULT 'Thanks for your kind words! Would you mind sharing your experience on Google? It really helps other homeowners find us: {{reviewUrl}}',

  negative_followup_template TEXT DEFAULT 'We''re sorry to hear that. {{business.ownerName}} would like to personally make this right. They''ll reach out within 24 hours.',

  reminder_template TEXT DEFAULT 'Hi {{customer.firstName}}, just a quick reminder - we''d love to hear how your service went: {{feedbackUrl}}',

  -- Recovery settings
  auto_assign_recovery BOOLEAN DEFAULT TRUE,
  recovery_default_assignee UUID REFERENCES users(id),
  recovery_sla_hours INTEGER DEFAULT 24,
  recovery_escalation_hours INTEGER DEFAULT 48,

  -- PoW integration
  attach_pow_link BOOLEAN DEFAULT TRUE,
  pow_link_position VARCHAR(20) DEFAULT 'before_feedback'
    CHECK (pow_link_position IN ('before_feedback', 'after_feedback', 'separate_message')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id)
);

COMMENT ON TABLE reputation_settings IS 'Per-business reputation manager configuration';
COMMENT ON COLUMN reputation_settings.attach_pow_link IS 'Include PoW public URL in reputation request when available';
COMMENT ON COLUMN reputation_settings.review_platforms IS 'JSON array of enabled review platforms with priority';

-- =====================================================
-- 4. REPUTATION RECOVERY LOG
-- Audit trail for recovery actions
-- =====================================================

CREATE TABLE IF NOT EXISTS reputation_recovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES reputation_feedback(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Action tracking
  action_type VARCHAR(30) NOT NULL
    CHECK (action_type IN (
      'assigned',
      'reassigned',
      'note_added',
      'status_changed',
      'customer_contacted',
      'resolution_offered',
      'resolved',
      'escalated',
      'closed'
    )),

  -- Actor
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Details
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reputation_recovery_log IS 'Audit trail for recovery workflow actions';

-- =====================================================
-- 5. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reputation_requests_business ON reputation_requests(business_id, status);
CREATE INDEX IF NOT EXISTS idx_reputation_requests_customer ON reputation_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_reputation_requests_job ON reputation_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_reputation_requests_token ON reputation_requests(access_token);
CREATE INDEX IF NOT EXISTS idx_reputation_requests_scheduled ON reputation_requests(scheduled_at)
  WHERE status IN ('pending', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_reputation_requests_pow ON reputation_requests(proof_of_work_id)
  WHERE proof_of_work_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reputation_feedback_business ON reputation_feedback(business_id);
CREATE INDEX IF NOT EXISTS idx_reputation_feedback_request ON reputation_feedback(request_id);
CREATE INDEX IF NOT EXISTS idx_reputation_feedback_recovery ON reputation_feedback(business_id, recovery_status)
  WHERE recovery_needed = TRUE;
CREATE INDEX IF NOT EXISTS idx_reputation_feedback_sentiment ON reputation_feedback(business_id, sentiment_category);

CREATE INDEX IF NOT EXISTS idx_reputation_recovery_log_feedback ON reputation_recovery_log(feedback_id);

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE reputation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_recovery_log ENABLE ROW LEVEL SECURITY;

-- Business users can manage reputation requests
CREATE POLICY "Business users manage reputation requests" ON reputation_requests
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Business users can view/manage reputation feedback
CREATE POLICY "Business users manage reputation feedback" ON reputation_feedback
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Business users can manage reputation settings
CREATE POLICY "Business users manage reputation settings" ON reputation_settings
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Business users can view recovery logs
CREATE POLICY "Business users view recovery logs" ON reputation_recovery_log
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- =====================================================
-- 7. SERVICE ROLE BYPASS
-- =====================================================

CREATE POLICY "Service role bypass reputation_requests" ON reputation_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass reputation_feedback" ON reputation_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass reputation_settings" ON reputation_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass reputation_recovery_log" ON reputation_recovery_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

CREATE TRIGGER trigger_reputation_requests_updated_at
  BEFORE UPDATE ON reputation_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_reputation_feedback_updated_at
  BEFORE UPDATE ON reputation_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_reputation_settings_updated_at
  BEFORE UPDATE ON reputation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. FUNCTION: Auto-categorize sentiment
-- =====================================================

CREATE OR REPLACE FUNCTION categorize_sentiment(
  score INTEGER,
  positive_threshold INTEGER DEFAULT 4,
  negative_threshold INTEGER DEFAULT 2
) RETURNS VARCHAR(20) AS $$
BEGIN
  IF score >= positive_threshold THEN
    RETURN 'positive';
  ELSIF score <= negative_threshold THEN
    RETURN 'negative';
  ELSE
    RETURN 'neutral';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION categorize_sentiment IS 'Categorize sentiment score into positive/neutral/negative';
