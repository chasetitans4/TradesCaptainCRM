-- =====================================================
-- PHASE 1-3 VERIFICATION AND FIXES
-- 1. Fixes missing columns in jobs table (title, scheduled_time)
-- 2. Adds Notification Channel columns to businesses
-- 3. Ensures schema compatibility for Enterprise features
-- =====================================================

-- 1. Fix Jobs Table Schema
-- The new UI and Recurring Jobs logic require 'title' and 'scheduled_time'
DO $$ 
BEGIN
  -- Add 'title' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'title') THEN
    ALTER TABLE jobs ADD COLUMN title TEXT;
    -- Backfill from service_type
    UPDATE jobs SET title = service_type WHERE title IS NULL;
  END IF;

  -- Add 'scheduled_time' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'scheduled_time') THEN
    ALTER TABLE jobs ADD COLUMN scheduled_time TEXT;
    -- Backfill from scheduled_time_start
    UPDATE jobs SET scheduled_time = TO_CHAR(scheduled_time_start, 'HH24:MI') WHERE scheduled_time IS NULL AND scheduled_time_start IS NOT NULL;
  END IF;
END $$;

-- 2. Add Notification Channel Settings to Businesses
-- Required for Phase 1 "Notification Channels" feature
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'slack_webhook_url') THEN
    ALTER TABLE businesses ADD COLUMN slack_webhook_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'whatsapp_enabled') THEN
    ALTER TABLE businesses ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 3. Ensure 'users' table has Slack ID if needed (optional but good for future)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'slack_user_id') THEN
    ALTER TABLE users ADD COLUMN slack_user_id TEXT;
  END IF;
END $$;

-- 4. Verify/Re-apply Enterprise Features (Safe Mode)
-- We won't re-create tables if they exist, but we ensure columns are there.

-- Ensure business_locations exists (from 114)
CREATE TABLE IF NOT EXISTS business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_headquarters BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  operating_hours JSONB DEFAULT '{}',
  service_area_radius_miles INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure jobs has location_id
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'location_id') THEN
    ALTER TABLE jobs ADD COLUMN location_id UUID REFERENCES business_locations(id);
  END IF;
END $$;

-- 5. Re-define the generate_recurring_jobs function to ensure it works with the new columns
CREATE OR REPLACE FUNCTION generate_recurring_jobs()
RETURNS INTEGER AS $$
DECLARE
  template RECORD;
  job_count INTEGER := 0;
  next_date DATE;
BEGIN
  FOR template IN
    SELECT * FROM recurring_job_templates
    WHERE is_active = true
    AND auto_generate = true
    AND (next_generation_date IS NULL OR next_generation_date <= CURRENT_DATE)
  LOOP
    -- Calculate next job date based on frequency
    next_date := COALESCE(template.last_generated_date, CURRENT_DATE);

    CASE template.frequency
      WHEN 'daily' THEN
        next_date := next_date + (template.interval_count || ' days')::INTERVAL;
      WHEN 'weekly' THEN
        next_date := next_date + (template.interval_count * 7 || ' days')::INTERVAL;
      WHEN 'biweekly' THEN
        next_date := next_date + (template.interval_count * 14 || ' days')::INTERVAL;
      WHEN 'monthly' THEN
        next_date := next_date + (template.interval_count || ' months')::INTERVAL;
      WHEN 'quarterly' THEN
        next_date := next_date + (template.interval_count * 3 || ' months')::INTERVAL;
      WHEN 'semiannually' THEN
        next_date := next_date + (template.interval_count * 6 || ' months')::INTERVAL;
      WHEN 'annually' THEN
        next_date := next_date + (template.interval_count || ' years')::INTERVAL;
    END CASE;

    -- Generate jobs up to generate_days_ahead
    WHILE next_date <= CURRENT_DATE + template.generate_days_ahead LOOP
      -- Insert job
      -- NOTE: This now uses the verified 'title' and 'scheduled_time' columns
      INSERT INTO jobs (
        business_id, customer_id, title, description,
        scheduled_date, scheduled_time, estimated_duration,
        price, assigned_to, status, recurring_template_id, is_recurring
      ) VALUES (
        template.business_id, template.customer_id, template.title, template.description,
        next_date, template.preferred_time::TEXT, template.estimated_duration_minutes,
        template.price, template.assigned_to, 'scheduled', template.id, true
      );

      job_count := job_count + 1;

      -- Calculate next date
      CASE template.frequency
        WHEN 'daily' THEN
          next_date := next_date + (template.interval_count || ' days')::INTERVAL;
        WHEN 'weekly' THEN
          next_date := next_date + (template.interval_count * 7 || ' days')::INTERVAL;
        WHEN 'biweekly' THEN
          next_date := next_date + (template.interval_count * 14 || ' days')::INTERVAL;
        WHEN 'monthly' THEN
          next_date := next_date + (template.interval_count || ' months')::INTERVAL;
        WHEN 'quarterly' THEN
          next_date := next_date + (template.interval_count * 3 || ' months')::INTERVAL;
        WHEN 'semiannually' THEN
          next_date := next_date + (template.interval_count * 6 || ' months')::INTERVAL;
        WHEN 'annually' THEN
          next_date := next_date + (template.interval_count || ' years')::INTERVAL;
      END CASE;
    END LOOP;

    -- Update template tracking
    UPDATE recurring_job_templates
    SET
      last_generated_date = CURRENT_DATE,
      next_generation_date = next_date,
      total_jobs_created = total_jobs_created + job_count,
      updated_at = NOW()
    WHERE id = template.id;
  END LOOP;

  RETURN job_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions (just in case)
GRANT EXECUTE ON FUNCTION generate_recurring_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_recurring_jobs() TO service_role;
