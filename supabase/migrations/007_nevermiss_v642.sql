-- ============================================
-- NeverMiss v6.4.2 Migration
-- Production-ready fixes for SMS and booking
-- ============================================

-- =====================================================
-- 1. SMS MESSAGE ENHANCEMENTS
-- Add columns for better tracking (v6.4.2)
-- =====================================================

-- Add from_number and to_number for tracking actual Twilio numbers used
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS from_number VARCHAR(50);
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS to_number VARCHAR(50);

-- Add delivered_at for tracking when message was delivered
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Add status_updated_at for tracking last status change
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

-- Index for Twilio SID lookups (used by status webhook)
CREATE INDEX IF NOT EXISTS idx_sms_messages_twilio_sid ON sms_messages(twilio_sid);

-- =====================================================
-- 1.5. SMS SUPPRESSION LIST
-- TCPA/CTIA compliance - opt-out tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS sms_suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  reason VARCHAR(30) NOT NULL CHECK (reason IN ('opt_out', 'spam', 'undeliverable')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_suppression_lookup
ON sms_suppression_list(business_id, phone_number)
WHERE is_active = true;

-- =====================================================
-- 1.6. SMS USAGE TRACKING
-- Soft caps for SMS limits (never hard cut)
-- =====================================================

CREATE TABLE IF NOT EXISTS sms_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sms_sent INTEGER DEFAULT 0,
  sms_received INTEGER DEFAULT 0,
  sms_limit INTEGER NOT NULL,

  -- Soft cap tracking
  notified_80_percent BOOLEAN DEFAULT false,
  notified_100_percent BOOLEAN DEFAULT false,
  notified_150_percent BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, period_start)
);

-- Function to upsert SMS usage
CREATE OR REPLACE FUNCTION upsert_sms_usage(
  p_business_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_field TEXT,
  p_sms_limit INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO sms_usage (business_id, period_start, period_end, sms_limit)
  VALUES (p_business_id, p_period_start::DATE, p_period_end::DATE, p_sms_limit)
  ON CONFLICT (business_id, period_start)
  DO UPDATE SET
    sms_sent = CASE WHEN p_field = 'sms_sent' THEN sms_usage.sms_sent + 1 ELSE sms_usage.sms_sent END,
    sms_received = CASE WHEN p_field = 'sms_received' THEN sms_usage.sms_received + 1 ELSE sms_usage.sms_received END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1.7. SMS DELIVERY FAILURES TRACKING
-- Monitor delivery issues for 10DLC compliance
-- =====================================================

CREATE TABLE IF NOT EXISTS sms_delivery_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  message_sid VARCHAR(50),
  error_code VARCHAR(10),
  phone_number VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_failures_business
ON sms_delivery_failures(business_id, created_at DESC);

-- =====================================================
-- 2. CALENDAR SLOT HOLDS
-- Temporary hold mechanism for preventing double-booking (v6.4.2)
-- =====================================================

CREATE TABLE IF NOT EXISTS calendar_slot_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID, -- Optional: link to SMS conversation

  -- Slot details
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,

  -- Hold status
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'confirmed', 'expired', 'released')),

  -- Timestamps
  held_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB
);

-- Partial unique index: only one active hold per slot per business
-- This enables ON CONFLICT handling for race conditions
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_slot_hold
ON calendar_slot_holds(business_id, slot_start)
WHERE status = 'held';

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_slot_holds_expiration
ON calendar_slot_holds(status, expires_at)
WHERE status = 'held';

-- Index for business lookups
CREATE INDEX IF NOT EXISTS idx_slot_holds_business
ON calendar_slot_holds(business_id, slot_start);

-- =====================================================
-- 3. NOTIFICATION QUEUE
-- Queue for scheduled notifications (reminders, confirmations)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  -- What to notify
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'appointment_reminder',
    'booking_confirmation',
    'booking_reminder',
    'follow_up',
    'review_request',
    'custom'
  )),

  -- Who to notify
  recipient_phone TEXT,
  recipient_email TEXT,

  -- Related entities
  job_id UUID REFERENCES jobs(id),
  customer_id UUID REFERENCES customers(id),
  conversation_id UUID,

  -- Content
  subject TEXT,
  body TEXT NOT NULL,
  template_id TEXT,
  template_data JSONB,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'failed',
    'cancelled',
    'skipped'
  )),
  error_message TEXT,
  skip_reason TEXT,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Index for processing pending notifications
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending
ON notification_queue(scheduled_for)
WHERE status = 'pending';

-- Index for business lookups
CREATE INDEX IF NOT EXISTS idx_notification_queue_business
ON notification_queue(business_id, status);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE calendar_slot_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Calendar slot holds policies
CREATE POLICY "Users can view their business slot holds" ON calendar_slot_holds
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can create slot holds for their business" ON calendar_slot_holds
  FOR INSERT WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Users can update their business slot holds" ON calendar_slot_holds
  FOR UPDATE USING (business_id = get_user_business_id());

-- Notification queue policies
CREATE POLICY "Users can view their business notifications" ON notification_queue
  FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can create notifications for their business" ON notification_queue
  FOR INSERT WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Users can update their business notifications" ON notification_queue
  FOR UPDATE USING (business_id = get_user_business_id());

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to expire stale slot holds
CREATE OR REPLACE FUNCTION expire_stale_slot_holds()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE calendar_slot_holds
  SET status = 'expired', released_at = NOW()
  WHERE status = 'held' AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old slot holds (for cron job)
CREATE OR REPLACE FUNCTION cleanup_old_slot_holds(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM calendar_slot_holds
  WHERE status IN ('expired', 'released', 'confirmed')
    AND created_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. PLAN NEVERMISS FEATURES (v5.8 Admin Update)
-- Single source of truth for plan feature matrix
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_nevermiss_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type VARCHAR(50) NOT NULL UNIQUE,  -- Matches plan_type in businesses table
  includes_nevermiss BOOLEAN NOT NULL DEFAULT false,
  sms_included INTEGER NOT NULL DEFAULT 0,
  can_book_calendar BOOLEAN NOT NULL DEFAULT false,
  includes_crm BOOLEAN NOT NULL DEFAULT false,
  includes_calendar BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data matching v5.8 plan matrix
INSERT INTO plan_nevermiss_features (plan_type, includes_nevermiss, sms_included, can_book_calendar, includes_crm, includes_calendar) VALUES
  ('nevermiss', true, 700, false, false, false),
  ('blue_starter', false, 0, false, true, true),  -- NO NeverMiss!
  ('blue_pro', true, 1000, true, true, true),
  ('blue_enterprise', true, 1500, true, true, true),
  ('gold_starter', true, 700, true, true, true),
  ('gold_pro', true, 1000, true, true, true),
  ('gold_enterprise', true, 1500, true, true, true),
  ('web_starter', false, 0, false, false, false),
  ('web_pro', false, 0, false, false, false),
  ('web_enterprise', false, 0, false, false, false),
  ('silver_starter', false, 0, false, false, false),
  ('silver_pro', false, 0, false, false, false),
  ('silver_enterprise', false, 0, false, false, false),
  ('local_seo_starter', false, 0, false, false, false),
  ('local_seo_pro', false, 0, false, false, false)
ON CONFLICT (plan_type) DO NOTHING;

-- =====================================================
-- 7. NEVERMISS ADMIN SETTINGS (v5.8 Admin Update)
-- Per-organization NeverMiss configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,

  -- Phone configuration
  phone_number VARCHAR(20),
  phone_number_sid VARCHAR(50),  -- Twilio SID
  forward_to VARCHAR(20),

  -- Business info (used in AI prompts)
  business_name VARCHAR(255),
  services_offered TEXT[],
  service_area VARCHAR(255),

  -- AI settings
  greeting_message TEXT DEFAULT 'Hey! Sorry I missed your call — I''m with a customer right now. What can I help you with?',
  ai_tone VARCHAR(20) DEFAULT 'friendly' CHECK (ai_tone IN ('professional', 'friendly', 'casual')),
  custom_prompt TEXT,

  -- Hours
  business_hours_start TIME DEFAULT '07:00',
  business_hours_end TIME DEFAULT '19:00',
  business_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',  -- 0=Sun, 6=Sat
  quiet_hours_start TIME DEFAULT '21:00',
  quiet_hours_end TIME DEFAULT '07:00',

  -- Notifications
  notify_sms BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT true,
  notify_push BOOLEAN DEFAULT true,
  emergency_always_notify BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nevermiss_settings_business
ON nevermiss_settings(business_id);

-- =====================================================
-- 8. OFFER CODES (v5.8 Admin Update)
-- Standard offer codes for promotions
-- =====================================================

CREATE TABLE IF NOT EXISTS offer_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Discount configuration
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_trial', 'waive_fee')),
  discount_value DECIMAL(10,2),  -- Percentage (0-100) or fixed amount
  trial_days INTEGER,  -- For free trial offers

  -- Eligibility
  eligible_plan_types TEXT[],  -- Which plans can use this code
  requires_approval BOOLEAN DEFAULT false,

  -- Limits
  max_uses INTEGER,  -- NULL = unlimited
  uses_count INTEGER DEFAULT 0,

  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standard offer codes from v5.8
INSERT INTO offer_codes (code, name, description, discount_type, discount_value, trial_days, eligible_plan_types, requires_approval) VALUES
  ('FIRST50', '50% Off First Month', '50% off first month for new customers', 'percentage', 50, NULL,
   ARRAY['nevermiss', 'blue_starter', 'blue_pro', 'blue_enterprise', 'gold_starter', 'gold_pro', 'gold_enterprise'], false),
  ('FREETRIAL14', '14-Day Free Trial', '14-day free trial before billing starts', 'free_trial', NULL, 14,
   ARRAY['nevermiss', 'blue_starter', 'blue_pro', 'blue_enterprise', 'gold_starter', 'gold_pro', 'gold_enterprise'], false),
  ('ANNUAL25', '25% Off Annual', '25% off when paying annually (built into annual pricing)', 'percentage', 25, NULL,
   ARRAY['nevermiss', 'blue_starter', 'blue_pro', 'blue_enterprise', 'gold_starter', 'gold_pro', 'gold_enterprise'], false),
  ('VIP20', 'VIP 20% Off', '20% off for VIP customers - requires approval', 'percentage', 20, NULL,
   ARRAY['nevermiss', 'blue_starter', 'blue_pro', 'blue_enterprise', 'gold_starter', 'gold_pro', 'gold_enterprise'], true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 9. TOUCHPOINT TRACKING (v5.8 Relationship Management)
-- Track customer relationship touchpoints
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  agent_id UUID,  -- References admin users table

  -- Touchpoint type
  touchpoint_type VARCHAR(30) NOT NULL CHECK (touchpoint_type IN (
    'onboarding_call',
    'month_3_checkin',
    'month_6_review',
    'month_9_growth',
    'month_11_renewal',
    'support_call',
    'upsell_call',
    'satisfaction_survey',
    'email_outreach',
    'other'
  )),

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'rescheduled')),

  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Content
  notes TEXT,
  outcome VARCHAR(50),  -- 'satisfied', 'needs_attention', 'upsell_opportunity', 'churn_risk'
  next_action TEXT,

  -- Commission impact
  triggers_bonus BOOLEAN DEFAULT false,
  bonus_amount DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_touchpoints_business
ON customer_touchpoints(business_id, touchpoint_type);

CREATE INDEX IF NOT EXISTS idx_touchpoints_scheduled
ON customer_touchpoints(scheduled_for)
WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_touchpoints_agent
ON customer_touchpoints(agent_id, status);

-- =====================================================
-- 10. RATE LOCK TRACKING (v5.8)
-- Track 15% rate lock at Month 6
-- =====================================================

-- Add rate lock columns to businesses if not exists
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rate_locked_at_15 BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rate_lock_date TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMPTZ;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these after migration to verify success
-- =====================================================

-- Verify sms_messages columns
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'sms_messages'
--   AND column_name IN ('from_number', 'to_number', 'delivered_at', 'status_updated_at');

-- Verify calendar_slot_holds table
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'calendar_slot_holds';

-- Verify partial unique index
-- SELECT indexname FROM pg_indexes WHERE indexname = 'uniq_active_slot_hold';

-- Verify notification_queue table
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'notification_queue';

-- Verify plan_nevermiss_features
-- SELECT * FROM plan_nevermiss_features;

-- Verify offer_codes
-- SELECT * FROM offer_codes;
