-- =====================================================
-- MIGRATION 129: REPUTATION ENGINE v1.0 CONSOLIDATION
--
-- Aligns existing reputation_manager tables with v1.0 spec
-- Adds bundling logic, platform links table, trigger functions
--
-- Key Principle: "Reputation Engine is bundled, not standalone."
-- Active ONLY when: has_leads_captain = true OR website_status = 'LIVE'
--
-- NON-NEGOTIABLE:
--   - Never modify Proof of Work data
--   - One request per job (enforced by unique index)
--   - No third-party review APIs
--   - No incentives for reviews
-- =====================================================

-- =====================================================
-- 1. ENSURE BUSINESS BUNDLING COLUMNS EXIST
-- Reputation Engine requires one of these to be active
-- =====================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS has_leads_captain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS website_status VARCHAR(20) DEFAULT 'INACTIVE'
    CHECK (website_status IN ('INACTIVE', 'PENDING', 'LIVE', 'SUSPENDED'));

COMMENT ON COLUMN businesses.has_leads_captain IS 'Whether Leads Captain is active for this business';
COMMENT ON COLUMN businesses.website_status IS 'Status of Trades Captain website for this business';

-- =====================================================
-- 2. REPUTATION PLATFORM LINKS (Simplified per spec)
-- Simple storage of review platform URLs
-- =====================================================

CREATE TABLE IF NOT EXISTS reputation_platform_links (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  google_url TEXT,
  facebook_url TEXT,
  yelp_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE reputation_platform_links IS 'Review platform URLs per business - no API integrations, just stored URLs';

-- =====================================================
-- 3. ADD MISSING COLUMNS TO REPUTATION_REQUESTS
-- Align with v1.0 spec
-- =====================================================

-- Add public_token if using different column name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reputation_requests'
    AND column_name = 'access_token'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reputation_requests'
    AND column_name = 'public_token'
  ) THEN
    ALTER TABLE reputation_requests RENAME COLUMN access_token TO public_token;
  END IF;
END $$;

-- Add channel column if missing (v1.0 spec uses 'channel' not 'delivery_channel')
ALTER TABLE reputation_requests
  ADD COLUMN IF NOT EXISTS channel VARCHAR(10) DEFAULT 'SMS'
    CHECK (channel IN ('SMS', 'EMAIL'));

-- Sync channel from delivery_channel if exists
UPDATE reputation_requests
SET channel = CASE
  WHEN delivery_channel = 'BOTH' THEN 'SMS'
  ELSE delivery_channel
END
WHERE channel IS NULL AND delivery_channel IS NOT NULL;

-- =====================================================
-- 4. ADD MISSING COLUMNS TO REPUTATION_FEEDBACK
-- Align with v1.0 spec
-- =====================================================

-- Add escalated column
ALTER TABLE reputation_feedback
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT FALSE;

-- Rename sentiment_score to rating for spec alignment
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reputation_feedback'
    AND column_name = 'sentiment_score'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reputation_feedback'
    AND column_name = 'rating'
  ) THEN
    ALTER TABLE reputation_feedback RENAME COLUMN sentiment_score TO rating;
  END IF;
END $$;

-- Add rating column if completely missing
ALTER TABLE reputation_feedback
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5);

-- Rename sentiment_category to sentiment
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reputation_feedback'
    AND column_name = 'sentiment_category'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reputation_feedback'
    AND column_name = 'sentiment'
  ) THEN
    ALTER TABLE reputation_feedback RENAME COLUMN sentiment_category TO sentiment;
  END IF;
END $$;

-- Add comment column (maps to feedback_text)
ALTER TABLE reputation_feedback
  ADD COLUMN IF NOT EXISTS comment TEXT;

-- Sync comment from feedback_text
UPDATE reputation_feedback
SET comment = feedback_text
WHERE comment IS NULL AND feedback_text IS NOT NULL;

-- =====================================================
-- 5. SIMPLIFY REPUTATION_SETTINGS
-- Add columns per v1.0 spec (business owner settings only)
-- =====================================================

ALTER TABLE reputation_settings
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS daily_limit_override INTEGER CHECK (daily_limit_override <= 100);

COMMENT ON COLUMN reputation_settings.daily_limit_override IS 'Internal admin only - max 100/day hard ceiling';
COMMENT ON COLUMN reputation_settings.reminder_enabled IS 'Single reminder for positive ratings (off by default)';

-- =====================================================
-- 6. FUNCTION: Check if Reputation Engine is Active
-- Returns true if business has Leads Captain OR Live website
-- =====================================================

CREATE OR REPLACE FUNCTION is_reputation_engine_active(p_business_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_leads_captain BOOLEAN;
  v_website_status VARCHAR(20);
  v_is_enabled BOOLEAN;
BEGIN
  -- Get business bundling status
  SELECT has_leads_captain, website_status
  INTO v_has_leads_captain, v_website_status
  FROM businesses
  WHERE id = p_business_id;

  -- Check if globally disabled in settings
  SELECT COALESCE(enabled, TRUE)
  INTO v_is_enabled
  FROM reputation_settings
  WHERE business_id = p_business_id;

  -- Active if: (has Leads Captain OR website is LIVE) AND not disabled
  RETURN COALESCE(v_is_enabled, TRUE)
    AND (COALESCE(v_has_leads_captain, FALSE) = TRUE
         OR COALESCE(v_website_status, 'INACTIVE') = 'LIVE');
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_reputation_engine_active IS 'Check if Reputation Engine is active for a business (bundled with Leads Captain or Website)';

-- =====================================================
-- 7. FUNCTION: Calculate Send Time
-- Per v1.0 spec timing rules
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_reputation_send_time(
  p_completed_at TIMESTAMPTZ,
  p_business_timezone TEXT DEFAULT 'America/New_York'
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_local_time TIME;
  v_local_date DATE;
  v_day_of_week INTEGER;
  v_send_time TIMESTAMPTZ;
BEGIN
  -- Convert to business local time
  v_local_time := (p_completed_at AT TIME ZONE p_business_timezone)::TIME;
  v_local_date := (p_completed_at AT TIME ZONE p_business_timezone)::DATE;
  v_day_of_week := EXTRACT(ISODOW FROM p_completed_at AT TIME ZONE p_business_timezone);

  -- Scenario 1: Job completed 8am-6pm weekday → 2 hours after completion
  IF v_local_time >= '08:00:00' AND v_local_time <= '18:00:00'
     AND v_day_of_week BETWEEN 1 AND 5 THEN
    v_send_time := p_completed_at + INTERVAL '2 hours';

  -- Scenario 2: Job completed after 6pm → Next day at 9am local
  ELSIF v_local_time > '18:00:00' THEN
    v_send_time := (v_local_date + INTERVAL '1 day' + INTERVAL '9 hours')
                   AT TIME ZONE p_business_timezone;

  -- Scenario 3: Weekend completion → Next business day at 9am
  ELSIF v_day_of_week IN (6, 7) THEN
    -- Saturday (6) → Monday 9am, Sunday (7) → Monday 9am
    v_send_time := (v_local_date + INTERVAL '1 day' * (8 - v_day_of_week) + INTERVAL '9 hours')
                   AT TIME ZONE p_business_timezone;

  -- Scenario 4: Before 8am → Same day at 9am
  ELSE
    v_send_time := (v_local_date + INTERVAL '9 hours') AT TIME ZONE p_business_timezone;
  END IF;

  RETURN v_send_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_reputation_send_time IS 'Calculate optimal send time per v1.0 spec timing rules';

-- =====================================================
-- 8. FUNCTION: Check Daily Limit
-- Returns remaining capacity for the day
-- =====================================================

CREATE OR REPLACE FUNCTION get_reputation_daily_remaining(
  p_business_id UUID,
  p_check_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_plan_limit INTEGER;
  v_override_limit INTEGER;
  v_sent_today INTEGER;
  v_max_limit INTEGER;
BEGIN
  -- Get plan-based limit (from subscription or default)
  -- Starter = 5, Pro = 20, Enterprise = unlimited (9999)
  SELECT CASE
    WHEN s.plan_id LIKE '%enterprise%' THEN 9999
    WHEN s.plan_id LIKE '%pro%' THEN 20
    ELSE 5
  END
  INTO v_plan_limit
  FROM subscriptions s
  WHERE s.business_id = p_business_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Default to Starter if no subscription
  v_plan_limit := COALESCE(v_plan_limit, 5);

  -- Check for admin override
  SELECT daily_limit_override
  INTO v_override_limit
  FROM reputation_settings
  WHERE business_id = p_business_id;

  -- Use override if set (but capped at 100)
  v_max_limit := LEAST(COALESCE(v_override_limit, v_plan_limit), 100);

  -- Count requests sent today
  SELECT COUNT(*)
  INTO v_sent_today
  FROM reputation_requests
  WHERE business_id = p_business_id
    AND status IN ('SENT', 'QUEUED', 'PENDING')
    AND created_at::DATE = p_check_date;

  RETURN GREATEST(v_max_limit - v_sent_today, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_reputation_daily_remaining IS 'Get remaining reputation request capacity for today';

-- =====================================================
-- 9. FUNCTION: Create Reputation Request
-- Called when job is completed (by application code)
-- =====================================================

CREATE OR REPLACE FUNCTION create_reputation_request(
  p_job_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_business_id UUID;
  v_customer_id UUID;
  v_pow_id UUID;
  v_customer_phone TEXT;
  v_has_consent BOOLEAN;
  v_send_time TIMESTAMPTZ;
  v_request_id UUID;
BEGIN
  -- Get job details
  SELECT
    j.business_id,
    j.customer_id,
    j.proof_of_work_id
  INTO v_business_id, v_customer_id, v_pow_id
  FROM jobs j
  WHERE j.id = p_job_id;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;

  -- Check if Reputation Engine is active
  IF NOT is_reputation_engine_active(v_business_id) THEN
    RETURN NULL; -- Dormant, do nothing
  END IF;

  -- Check for existing request (one per job)
  IF EXISTS (SELECT 1 FROM reputation_requests WHERE job_id = p_job_id) THEN
    RETURN NULL; -- Already exists
  END IF;

  -- Check daily limit
  IF get_reputation_daily_remaining(v_business_id) <= 0 THEN
    -- Queue for next day instead of dropping
    v_send_time := calculate_reputation_send_time(
      CURRENT_TIMESTAMP + INTERVAL '1 day',
      COALESCE((SELECT timezone FROM businesses WHERE id = v_business_id), 'America/New_York')
    );
  ELSE
    -- Normal send time
    v_send_time := calculate_reputation_send_time(
      CURRENT_TIMESTAMP,
      COALESCE((SELECT timezone FROM businesses WHERE id = v_business_id), 'America/New_York')
    );
  END IF;

  -- Get customer details
  SELECT phone, sms_consent
  INTO v_customer_phone, v_has_consent
  FROM customers
  WHERE id = v_customer_id;

  -- Skip if no valid phone or no consent
  IF v_customer_phone IS NULL OR v_customer_phone = '' THEN
    RETURN NULL;
  END IF;

  -- Create the request
  INSERT INTO reputation_requests (
    business_id,
    job_id,
    customer_id,
    proof_of_work_id,
    channel,
    status,
    scheduled_at,
    expires_at,
    tcpa_consent_method,
    tcpa_consent_at
  ) VALUES (
    v_business_id,
    p_job_id,
    v_customer_id,
    v_pow_id,
    'SMS',
    CASE WHEN v_has_consent THEN 'QUEUED' ELSE 'PENDING' END,
    v_send_time,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    'transactional',
    CASE WHEN v_has_consent THEN CURRENT_TIMESTAMP ELSE NULL END
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_reputation_request IS 'Create a reputation request for a completed job (checks all conditions)';

-- =====================================================
-- 10. FUNCTION: Determine Sentiment from Rating
-- Per v1.0 spec: 4-5=positive, 3=neutral, 1-2=negative
-- =====================================================

CREATE OR REPLACE FUNCTION determine_sentiment(p_rating INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
  IF p_rating >= 4 THEN
    RETURN 'positive';
  ELSIF p_rating = 3 THEN
    RETURN 'neutral';
  ELSE
    RETURN 'negative';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION determine_sentiment IS 'Determine sentiment from rating: 4-5=positive, 3=neutral, 1-2=negative';

-- =====================================================
-- 11. FUNCTION: Process Feedback Submission
-- Handles routing based on sentiment
-- =====================================================

CREATE OR REPLACE FUNCTION submit_reputation_feedback(
  p_request_token VARCHAR(32),
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_business_id UUID;
  v_customer_id UUID;
  v_sentiment VARCHAR(10);
  v_escalated BOOLEAN;
  v_is_public BOOLEAN;
  v_feedback_id UUID;
BEGIN
  -- Get request by token
  SELECT id, business_id, customer_id
  INTO v_request_id, v_business_id, v_customer_id
  FROM reputation_requests
  WHERE public_token = p_request_token
    AND status NOT IN ('COMPLETED', 'EXPIRED', 'CANCELED');

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired feedback token';
  END IF;

  -- Check expiry
  IF EXISTS (
    SELECT 1 FROM reputation_requests
    WHERE id = v_request_id AND expires_at < CURRENT_TIMESTAMP
  ) THEN
    UPDATE reputation_requests SET status = 'EXPIRED' WHERE id = v_request_id;
    RAISE EXCEPTION 'This feedback link has expired';
  END IF;

  -- Determine sentiment
  v_sentiment := determine_sentiment(p_rating);

  -- Set escalation and public flags
  v_escalated := (p_rating <= 2);
  v_is_public := FALSE; -- Only true if user clicks review link

  -- Insert feedback
  INSERT INTO reputation_feedback (
    request_id,
    business_id,
    customer_id,
    rating,
    comment,
    sentiment,
    escalated,
    is_public,
    recovery_needed
  ) VALUES (
    v_request_id,
    v_business_id,
    v_customer_id,
    p_rating,
    p_comment,
    v_sentiment,
    v_escalated,
    v_is_public,
    v_escalated -- recovery_needed = escalated for negative
  )
  RETURNING id INTO v_feedback_id;

  -- Update request status
  UPDATE reputation_requests
  SET
    status = CASE
      WHEN v_sentiment = 'positive' THEN 'feedback_received'
      WHEN v_sentiment = 'negative' THEN 'recovery_started'
      ELSE 'completed'
    END,
    responded_at = CURRENT_TIMESTAMP
  WHERE id = v_request_id;

  RETURN v_feedback_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION submit_reputation_feedback IS 'Process customer feedback submission with routing logic';

-- =====================================================
-- 12. FUNCTION: Check Reminder Eligibility
-- Per v1.0 spec: Only for 4-5 rating, is_public=false,
-- reminder_enabled=true, reminder_sent_at IS NULL
-- =====================================================

CREATE OR REPLACE FUNCTION get_eligible_reminders(p_business_id UUID DEFAULT NULL)
RETURNS TABLE (
  request_id UUID,
  business_id UUID,
  customer_id UUID,
  google_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rr.id AS request_id,
    rr.business_id,
    rr.customer_id,
    rpl.google_url
  FROM reputation_requests rr
  JOIN reputation_feedback rf ON rf.request_id = rr.id
  JOIN reputation_settings rs ON rs.business_id = rr.business_id
  LEFT JOIN reputation_platform_links rpl ON rpl.business_id = rr.business_id
  WHERE
    -- Apply business filter if provided
    (p_business_id IS NULL OR rr.business_id = p_business_id)
    -- Rating 4 or 5
    AND rf.rating >= 4
    -- Customer did NOT click review link
    AND rf.is_public = FALSE
    -- Reminders enabled
    AND rs.reminder_enabled = TRUE
    -- No reminder sent yet
    AND rr.reminder_sent_at IS NULL
    -- Feedback submitted at least 48 hours ago
    AND rf.created_at <= CURRENT_TIMESTAMP - INTERVAL '48 hours'
    -- Request not expired
    AND rr.expires_at > CURRENT_TIMESTAMP
    -- Has Google URL configured
    AND rpl.google_url IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_eligible_reminders IS 'Get reputation requests eligible for reminder (48h after positive feedback)';

-- =====================================================
-- 13. INDEXES FOR NEW QUERIES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reputation_platform_links_business
  ON reputation_platform_links(business_id);

CREATE INDEX IF NOT EXISTS idx_reputation_requests_scheduled
  ON reputation_requests(scheduled_at)
  WHERE status = 'QUEUED';

CREATE INDEX IF NOT EXISTS idx_reputation_requests_reminder_eligible
  ON reputation_requests(business_id, reminder_sent_at)
  WHERE reminder_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reputation_feedback_rating
  ON reputation_feedback(rating);

-- =====================================================
-- 14. RLS FOR NEW TABLE
-- =====================================================

ALTER TABLE reputation_platform_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business users manage platform links" ON reputation_platform_links
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Service role bypass platform_links" ON reputation_platform_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- 15. TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER trigger_reputation_platform_links_updated_at
  BEFORE UPDATE ON reputation_platform_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 16. SMS TEMPLATE CONSTANTS (Reference only)
-- Templates are handled by application code
-- =====================================================

COMMENT ON TABLE reputation_requests IS '
SMS Templates (handled in application code):

WITH Proof of Work:
Hi {{customer_name}} — thanks again for choosing {{business_name}}.
Here is a record of the work we completed: {{proof_of_work_url}}
If you have a moment, we would appreciate your feedback. {{feedback_url}}

WITHOUT Proof of Work:
Hi {{customer_name}} — thanks for working with {{business_name}}.
If you have a moment, we would love your feedback on the job we completed. {{feedback_url}}

REMINDER (48h after positive feedback):
Hi {{customer_name}} — thanks again for the kind rating!
If you have a moment, a quick Google review would mean a lot: {{google_url}}
No pressure — we appreciate you either way.
';

-- =====================================================
-- MIGRATION COMPLETE
--
-- Added:
-- - reputation_platform_links table
-- - Business bundling columns (has_leads_captain, website_status)
-- - is_reputation_engine_active() function
-- - calculate_reputation_send_time() function
-- - get_reputation_daily_remaining() function
-- - create_reputation_request() function
-- - determine_sentiment() function
-- - submit_reputation_feedback() function
-- - get_eligible_reminders() function
--
-- Aligned with v1.0 spec:
-- - Bundling logic (Leads Captain OR Website required)
-- - Send timing rules
-- - Daily limits by plan
-- - Sentiment routing
-- - Reminder eligibility
-- =====================================================
