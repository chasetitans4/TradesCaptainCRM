-- =====================================================
-- DISPATCH & OPERATIONS SCHEMA
-- Migration: 005_dispatch_operations.sql
-- Features: Skills, Job Costing, Dispatch, Route Optimization
-- =====================================================

-- =============================================
-- TECHNICIAN SKILLS & CERTIFICATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS skill_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'trade', 'equipment', 'certification', 'specialty'

  -- Requirements
  requires_certification BOOLEAN DEFAULT false,
  certification_expiry_days INTEGER, -- How long cert is valid

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, name)
);

CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,

  -- Proficiency
  proficiency_level INTEGER DEFAULT 3, -- 1-5 scale

  -- Certification
  certified_at TIMESTAMPTZ,
  certification_expires_at TIMESTAMPTZ,
  certification_number TEXT,

  -- Status
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill_id);

-- Job skill requirements
CREATE TABLE IF NOT EXISTS job_type_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  job_type TEXT NOT NULL, -- e.g., 'HVAC Repair', 'Water Heater Install'
  skill_id UUID NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,

  is_required BOOLEAN DEFAULT true, -- Required vs preferred
  minimum_proficiency INTEGER DEFAULT 3,

  UNIQUE(business_id, job_type, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_job_type_skills_business ON job_type_skills(business_id, job_type);

-- =============================================
-- JOB COSTING
-- =============================================

-- Labor costs per job
CREATE TABLE IF NOT EXISTS job_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  -- Time tracking
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER DEFAULT 0,

  -- Calculated
  total_minutes INTEGER,

  -- Rates
  hourly_rate DECIMAL(10,2), -- Tech's rate at time of job
  overtime_rate DECIMAL(10,2),
  is_overtime BOOLEAN DEFAULT false,

  -- Costs
  labor_cost DECIMAL(10,2), -- Calculated: hours * rate

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_labor_job ON job_labor(job_id);
CREATE INDEX IF NOT EXISTS idx_job_labor_user ON job_labor(user_id, clock_in);

-- Material/parts costs per job
CREATE TABLE IF NOT EXISTS job_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Item details
  name TEXT NOT NULL,
  description TEXT,
  part_number TEXT,

  -- Quantity and pricing
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10,2) NOT NULL, -- What we paid
  unit_price DECIMAL(10,2), -- What we charge customer

  -- Totals
  total_cost DECIMAL(10,2), -- quantity * unit_cost
  total_price DECIMAL(10,2), -- quantity * unit_price

  -- Source
  source TEXT, -- 'inventory', 'supplier', 'customer_provided'
  supplier TEXT,

  -- Inventory link
  inventory_item_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_materials_job ON job_materials(job_id);

-- Job cost summary (denormalized for fast queries)
CREATE TABLE IF NOT EXISTS job_cost_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE UNIQUE,

  -- Revenue
  quoted_amount DECIMAL(10,2),
  invoiced_amount DECIMAL(10,2),
  collected_amount DECIMAL(10,2),

  -- Costs
  labor_cost DECIMAL(10,2) DEFAULT 0,
  material_cost DECIMAL(10,2) DEFAULT 0,
  subcontractor_cost DECIMAL(10,2) DEFAULT 0,
  other_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,

  -- Profit
  gross_profit DECIMAL(10,2),
  profit_margin DECIMAL(5,2), -- Percentage

  -- Time
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_cost_summary_job ON job_cost_summary(job_id);

-- =============================================
-- DISPATCH & SCHEDULING
-- =============================================

-- Technician availability/schedules
CREATE TABLE IF NOT EXISTS technician_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Schedule type
  schedule_type TEXT NOT NULL, -- 'regular', 'time_off', 'on_call'

  -- Regular schedule (weekly)
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  start_time TIME,
  end_time TIME,

  -- One-time events (time off, etc)
  start_date DATE,
  end_date DATE,

  -- Details
  title TEXT,
  notes TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tech_schedules_user ON technician_schedules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tech_schedules_date ON technician_schedules(start_date, end_date)
  WHERE schedule_type != 'regular';

-- Technician current location (for routing)
CREATE TABLE IF NOT EXISTS technician_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Address (reverse geocoded)
  address TEXT,
  city TEXT,

  -- Status
  status TEXT DEFAULT 'available', -- 'available', 'en_route', 'on_job', 'break', 'offline'
  current_job_id UUID REFERENCES jobs(id),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tech_locations_status ON technician_locations(status);

-- Dispatch history/audit
CREATE TABLE IF NOT EXISTS dispatch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  action TEXT NOT NULL, -- 'assigned', 'reassigned', 'unassigned', 'started', 'completed'

  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),

  -- Context
  reason TEXT,
  dispatched_by UUID REFERENCES users(id),

  -- Scheduling
  scheduled_date DATE,
  scheduled_time TIME,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_history_job ON dispatch_history(job_id, created_at DESC);

-- =============================================
-- ROUTE OPTIMIZATION
-- =============================================

-- Cached distances between locations
CREATE TABLE IF NOT EXISTS location_distances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  from_lat DECIMAL(10,8) NOT NULL,
  from_lng DECIMAL(11,8) NOT NULL,
  to_lat DECIMAL(10,8) NOT NULL,
  to_lng DECIMAL(11,8) NOT NULL,

  -- Results
  distance_meters INTEGER,
  duration_seconds INTEGER,

  -- Cache
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS idx_location_distances_coords ON location_distances(from_lat, from_lng, to_lat, to_lng);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE skill_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_type_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_cost_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_distances ENABLE ROW LEVEL SECURITY;

-- Business users can manage their data
CREATE POLICY "Business users manage skills" ON skill_definitions
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can view own skills" ON user_skills
  FOR SELECT USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM users WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Business admins manage user skills" ON user_skills
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Business users manage job type skills" ON job_type_skills
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage job labor" ON job_labor
  FOR ALL USING (job_id IN (
    SELECT id FROM jobs WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Business users manage job materials" ON job_materials
  FOR ALL USING (job_id IN (
    SELECT id FROM jobs WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Business users view job costs" ON job_cost_summary
  FOR ALL USING (job_id IN (
    SELECT id FROM jobs WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Users manage own schedule" ON technician_schedules
  FOR ALL USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM users WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Business users view tech locations" ON technician_locations
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Business users view dispatch history" ON dispatch_history
  FOR ALL USING (job_id IN (
    SELECT id FROM jobs WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Anyone can read cached distances" ON location_distances
  FOR SELECT USING (true);

CREATE POLICY "Business users create cached distances" ON location_distances
  FOR INSERT WITH CHECK (true);

-- Service role full access
CREATE POLICY "Service role full access skill_definitions" ON skill_definitions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access user_skills" ON user_skills
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access job_type_skills" ON job_type_skills
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access job_labor" ON job_labor
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access job_materials" ON job_materials
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access job_cost_summary" ON job_cost_summary
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access technician_schedules" ON technician_schedules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access technician_locations" ON technician_locations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access dispatch_history" ON dispatch_history
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dispatch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_skills_updated_at
  BEFORE UPDATE ON user_skills
  FOR EACH ROW EXECUTE FUNCTION update_dispatch_updated_at();

CREATE TRIGGER trigger_job_labor_updated_at
  BEFORE UPDATE ON job_labor
  FOR EACH ROW EXECUTE FUNCTION update_dispatch_updated_at();

CREATE TRIGGER trigger_job_cost_summary_updated_at
  BEFORE UPDATE ON job_cost_summary
  FOR EACH ROW EXECUTE FUNCTION update_dispatch_updated_at();

CREATE TRIGGER trigger_technician_locations_updated_at
  BEFORE UPDATE ON technician_locations
  FOR EACH ROW EXECUTE FUNCTION update_dispatch_updated_at();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to calculate labor cost
CREATE OR REPLACE FUNCTION calculate_labor_cost()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
    NEW.total_minutes := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60 - COALESCE(NEW.break_minutes, 0);
    NEW.labor_cost := (NEW.total_minutes / 60.0) * COALESCE(NEW.hourly_rate, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_labor_cost
  BEFORE INSERT OR UPDATE ON job_labor
  FOR EACH ROW EXECUTE FUNCTION calculate_labor_cost();

-- Function to calculate material costs
CREATE OR REPLACE FUNCTION calculate_material_costs()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_cost := NEW.quantity * NEW.unit_cost;
  IF NEW.unit_price IS NOT NULL THEN
    NEW.total_price := NEW.quantity * NEW.unit_price;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_material_costs
  BEFORE INSERT OR UPDATE ON job_materials
  FOR EACH ROW EXECUTE FUNCTION calculate_material_costs();

-- Function to get technician availability for a date
CREATE OR REPLACE FUNCTION get_technician_availability(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE(available BOOLEAN, start_time TIME, end_time TIME, reason TEXT) AS $$
DECLARE
  v_day_of_week INTEGER;
  v_time_off RECORD;
  v_regular RECORD;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);

  -- Check for time off
  SELECT * INTO v_time_off
  FROM technician_schedules
  WHERE user_id = p_user_id
    AND schedule_type = 'time_off'
    AND is_active = true
    AND p_date BETWEEN start_date AND end_date;

  IF FOUND THEN
    RETURN QUERY SELECT false, NULL::TIME, NULL::TIME, v_time_off.title;
    RETURN;
  END IF;

  -- Get regular schedule
  SELECT * INTO v_regular
  FROM technician_schedules
  WHERE user_id = p_user_id
    AND schedule_type = 'regular'
    AND day_of_week = v_day_of_week
    AND is_active = true;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_regular.start_time, v_regular.end_time, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT false, NULL::TIME, NULL::TIME, 'Not scheduled'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;
