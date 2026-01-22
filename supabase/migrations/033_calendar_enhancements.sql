-- Migration: 033_calendar_enhancements.sql
-- Description: Adds job_type to jobs and color to users for calendar enhancements.

-- 1. Add color column to users table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'color') THEN 
        ALTER TABLE users ADD COLUMN color TEXT;
    END IF; 
END $$;

-- 2. Add job_type column to jobs table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'job_type') THEN 
        ALTER TABLE jobs ADD COLUMN job_type TEXT CHECK (job_type IN ('estimate', 'install', 'repair', 'maintenance', 'follow_up', 'service', 'inspection', 'callback', 'other'));
        
        -- Backfill job_type based on service_type
        UPDATE jobs SET job_type = CASE 
            WHEN LOWER(service_type) LIKE '%estimate%' OR LOWER(service_type) LIKE '%quote%' THEN 'estimate'
            WHEN LOWER(service_type) LIKE '%install%' THEN 'install'
            WHEN LOWER(service_type) LIKE '%repair%' OR LOWER(service_type) LIKE '%fix%' THEN 'repair'
            WHEN LOWER(service_type) LIKE '%maintenance%' OR LOWER(service_type) LIKE '%tune%' THEN 'maintenance'
            WHEN LOWER(service_type) LIKE '%follow%' THEN 'follow_up'
            WHEN LOWER(service_type) LIKE '%inspection%' THEN 'inspection'
            WHEN LOWER(service_type) LIKE '%callback%' OR LOWER(service_type) LIKE '%warranty%' THEN 'callback'
            ELSE 'service'
        END;
    END IF; 
END $$;

-- 3. Ensure technician_locations table exists (from 005) and has status column
CREATE TABLE IF NOT EXISTS technician_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address TEXT,
  city TEXT,
  status TEXT DEFAULT 'available', -- 'available', 'en_route', 'on_job', 'break', 'offline'
  current_job_id UUID REFERENCES jobs(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for status if not exists
CREATE INDEX IF NOT EXISTS idx_tech_locations_status ON technician_locations(status);

-- Enable RLS for technician_locations if not already enabled
ALTER TABLE technician_locations ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for technician_locations if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'technician_locations' AND policyname = 'Users can view technician locations') THEN
        CREATE POLICY "Users can view technician locations" ON technician_locations
          FOR SELECT USING (true); -- Allow all authenticated users to view locations (simplified for now)
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'technician_locations' AND policyname = 'Technicians can update own location') THEN
        CREATE POLICY "Technicians can update own location" ON technician_locations
          FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;
