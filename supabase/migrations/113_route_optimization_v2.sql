-- =====================================================
-- ROUTE OPTIMIZATION V2 - MILEAGE TRACKING & ARRIVAL PINGS
-- Migration: 113_route_optimization_v2.sql
-- Date: January 2025
-- Features:
--   - Arrival pings for technicians ("I'm Here" button)
--   - Mileage tracking for tax/audit purposes
--   - Daily route summaries with aggregated data
--   - Arrival SMS notification setting
-- =====================================================

-- 1. Add arrival SMS notification setting to feature_settings
ALTER TABLE feature_settings
ADD COLUMN IF NOT EXISTS send_arrival_sms BOOLEAN DEFAULT false;

COMMENT ON COLUMN feature_settings.send_arrival_sms IS 'Send SMS to customer when technician arrives (pings "I''m Here")';

-- 2. Create arrival_pings table for tracking "I'm Here" events
CREATE TABLE IF NOT EXISTS arrival_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Location at arrival
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  address TEXT, -- Reverse geocoded or from job

  -- Timing
  arrived_at TIMESTAMPTZ DEFAULT NOW(),

  -- SMS tracking
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMPTZ,
  sms_message_id TEXT, -- Twilio message SID

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arrival_pings_business_date
ON arrival_pings(business_id, arrived_at);

CREATE INDEX IF NOT EXISTS idx_arrival_pings_user_date
ON arrival_pings(user_id, arrived_at);

CREATE INDEX IF NOT EXISTS idx_arrival_pings_job
ON arrival_pings(job_id);

-- 3. Create mileage_logs table for tracking driving distances
CREATE TABLE IF NOT EXISTS mileage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Trip details
  log_date DATE NOT NULL,
  from_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  to_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  -- Locations
  from_latitude DECIMAL(10,8),
  from_longitude DECIMAL(11,8),
  from_address TEXT,
  to_latitude DECIMAL(10,8),
  to_longitude DECIMAL(11,8),
  to_address TEXT,

  -- Distance and time (from Mapbox or calculated)
  distance_miles DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER,

  -- Source of calculation
  calculation_source TEXT DEFAULT 'mapbox', -- 'mapbox', 'haversine', 'manual'

  -- For audit purposes
  purpose TEXT DEFAULT 'job_travel', -- 'job_travel', 'start_of_day', 'end_of_day', 'between_jobs'
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mileage_logs_business_date
ON mileage_logs(business_id, log_date);

CREATE INDEX IF NOT EXISTS idx_mileage_logs_user_date
ON mileage_logs(user_id, log_date);

-- 4. Create daily_route_summaries table (denormalized for fast queries)
-- This is populated/updated when technicians complete their day
CREATE TABLE IF NOT EXISTS daily_route_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,

  -- Aggregated metrics
  total_miles DECIMAL(10,2) DEFAULT 0,
  total_drive_minutes INTEGER DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  arrival_pings_count INTEGER DEFAULT 0,

  -- Addresses visited (JSONB for lightweight storage)
  -- Format: [{ "address": "123 Main St", "job_id": "uuid", "arrived_at": "timestamp" }]
  stops_visited JSONB DEFAULT '[]'::JSONB,

  -- First and last stop for reference
  first_stop_time TIMESTAMPTZ,
  last_stop_time TIMESTAMPTZ,
  first_stop_address TEXT,
  last_stop_address TEXT,

  -- Status
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'reviewed'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_route_summaries_business_date
ON daily_route_summaries(business_id, summary_date);

CREATE INDEX IF NOT EXISTS idx_daily_route_summaries_user_date
ON daily_route_summaries(user_id, summary_date);

-- 5. Add geocoding cache table for addresses (reduces Mapbox API calls)
CREATE TABLE IF NOT EXISTS geocode_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Normalized address as key
  address_hash TEXT NOT NULL UNIQUE,
  original_address TEXT NOT NULL,

  -- Geocode results
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  formatted_address TEXT,
  place_id TEXT, -- Mapbox place ID

  -- Cache management
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days',
  hit_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_geocode_cache_hash
ON geocode_cache(address_hash);

CREATE INDEX IF NOT EXISTS idx_geocode_cache_expires
ON geocode_cache(expires_at);

-- 6. Enable RLS on new tables
ALTER TABLE arrival_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_route_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for arrival_pings
CREATE POLICY "Business members can view arrival pings" ON arrival_pings
  FOR SELECT USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Technicians can create own arrival pings" ON arrival_pings
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    business_id = (SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Service role manages arrival pings" ON arrival_pings
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for mileage_logs
CREATE POLICY "Business members can view mileage logs" ON mileage_logs
  FOR SELECT USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Technicians can create own mileage logs" ON mileage_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    business_id = (SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Service role manages mileage logs" ON mileage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for daily_route_summaries
CREATE POLICY "Business members can view route summaries" ON daily_route_summaries
  FOR SELECT USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Service role manages route summaries" ON daily_route_summaries
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for geocode_cache (public read for efficiency)
CREATE POLICY "Anyone can read geocode cache" ON geocode_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role manages geocode cache" ON geocode_cache
  FOR ALL USING (auth.role() = 'service_role');

-- 7. Function to update daily route summary when arrival ping is created
CREATE OR REPLACE FUNCTION update_daily_route_summary_on_arrival()
RETURNS TRIGGER AS $$
DECLARE
  v_summary_date DATE;
  v_job_address TEXT;
BEGIN
  v_summary_date := DATE(NEW.arrived_at);

  -- Get job address
  SELECT COALESCE(address, city || ', ' || state) INTO v_job_address
  FROM jobs WHERE id = NEW.job_id;

  -- Upsert daily route summary
  INSERT INTO daily_route_summaries (
    business_id, user_id, summary_date,
    arrival_pings_count, stops_visited,
    first_stop_time, first_stop_address,
    last_stop_time, last_stop_address
  )
  VALUES (
    NEW.business_id, NEW.user_id, v_summary_date,
    1,
    jsonb_build_array(jsonb_build_object(
      'address', COALESCE(NEW.address, v_job_address),
      'job_id', NEW.job_id,
      'arrived_at', NEW.arrived_at
    )),
    NEW.arrived_at, COALESCE(NEW.address, v_job_address),
    NEW.arrived_at, COALESCE(NEW.address, v_job_address)
  )
  ON CONFLICT (user_id, summary_date) DO UPDATE SET
    arrival_pings_count = daily_route_summaries.arrival_pings_count + 1,
    stops_visited = daily_route_summaries.stops_visited || jsonb_build_array(jsonb_build_object(
      'address', COALESCE(NEW.address, v_job_address),
      'job_id', NEW.job_id,
      'arrived_at', NEW.arrived_at
    )),
    last_stop_time = NEW.arrived_at,
    last_stop_address = COALESCE(NEW.address, v_job_address),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_route_summary_on_arrival ON arrival_pings;
CREATE TRIGGER trg_update_route_summary_on_arrival
AFTER INSERT ON arrival_pings
FOR EACH ROW EXECUTE FUNCTION update_daily_route_summary_on_arrival();

-- 8. Function to update daily route summary mileage
CREATE OR REPLACE FUNCTION update_daily_route_summary_mileage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or create daily summary with new mileage
  INSERT INTO daily_route_summaries (
    business_id, user_id, summary_date,
    total_miles, total_drive_minutes
  )
  VALUES (
    NEW.business_id, NEW.user_id, NEW.log_date,
    NEW.distance_miles, COALESCE(NEW.duration_minutes, 0)
  )
  ON CONFLICT (user_id, summary_date) DO UPDATE SET
    total_miles = daily_route_summaries.total_miles + NEW.distance_miles,
    total_drive_minutes = daily_route_summaries.total_drive_minutes + COALESCE(NEW.duration_minutes, 0),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_route_summary_mileage ON mileage_logs;
CREATE TRIGGER trg_update_route_summary_mileage
AFTER INSERT ON mileage_logs
FOR EACH ROW EXECUTE FUNCTION update_daily_route_summary_mileage();

-- 9. Function to get daily summary for a date range (efficient query)
CREATE OR REPLACE FUNCTION get_daily_route_summaries_for_business(
  p_business_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  summary_date DATE,
  total_miles DECIMAL(10,2),
  total_drive_minutes INTEGER,
  jobs_completed INTEGER,
  arrival_pings_count INTEGER,
  first_stop_time TIMESTAMPTZ,
  last_stop_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    drs.user_id,
    u.name as user_name,
    drs.summary_date,
    drs.total_miles,
    drs.total_drive_minutes,
    drs.jobs_completed,
    drs.arrival_pings_count,
    drs.first_stop_time,
    drs.last_stop_time
  FROM daily_route_summaries drs
  JOIN users u ON u.id = drs.user_id
  WHERE drs.business_id = p_business_id
    AND drs.summary_date BETWEEN p_start_date AND p_end_date
  ORDER BY drs.summary_date DESC, u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Cleanup function for expired geocode cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_geocode_cache()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM geocode_cache
  WHERE expires_at < NOW()
  RETURNING * INTO v_deleted;

  RETURN COALESCE(v_deleted, 0);
END;
$$ LANGUAGE plpgsql;

-- 11. Add comments for documentation
COMMENT ON TABLE arrival_pings IS 'Tracks when technicians ping "I''m Here" at job locations';
COMMENT ON TABLE mileage_logs IS 'Tracks driving mileage between jobs for tax/audit purposes';
COMMENT ON TABLE daily_route_summaries IS 'Denormalized daily summaries for efficient route reporting';
COMMENT ON TABLE geocode_cache IS 'Cache for Mapbox geocoding results to reduce API calls';
