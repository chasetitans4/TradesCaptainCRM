-- =====================================================
-- COMPLETE SCHEMA SYNCHRONIZATION & REPAIR
-- Purpose: Fix known schema discrepancies and reload API cache
-- =====================================================

-- 1. Force API Schema Cache Reload (Fixes PGRST205 errors)
NOTIFY pgrst, 'reload config';

-- 2. Jobs Table: Ensure assigned_user_id exists
DO $$ 
BEGIN 
  -- If 'assigned_to' exists but 'assigned_user_id' does not, rename it
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'assigned_to') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'assigned_user_id') THEN
    
    ALTER TABLE jobs RENAME COLUMN assigned_to TO assigned_user_id;
    
    -- Rename FK if exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'jobs_assigned_to_fkey') THEN
        ALTER TABLE jobs RENAME CONSTRAINT jobs_assigned_to_fkey TO jobs_assigned_user_id_fkey;
    END IF;
  
  -- If neither exists, add assigned_user_id
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'assigned_user_id') THEN
    ALTER TABLE jobs ADD COLUMN assigned_user_id UUID REFERENCES users(id);
  END IF;
END $$;

-- 3. Referral Programs: Fix Column Names
DO $$ 
BEGIN 
  -- Fix terms_conditions -> terms_and_conditions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'terms_conditions') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'terms_and_conditions') THEN
    
    ALTER TABLE referral_programs RENAME COLUMN terms_conditions TO terms_and_conditions;
  END IF;

  -- Fix referrer_reward_value -> referrer_reward_amount
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'referrer_reward_value') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'referrer_reward_amount') THEN
    
    ALTER TABLE referral_programs RENAME COLUMN referrer_reward_value TO referrer_reward_amount;
  END IF;
END $$;

-- 4. Maintenance Reminders: Fix Column Names
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_reminders' AND column_name = 'next_due_date') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_reminders' AND column_name = 'due_date') THEN
    
    ALTER TABLE maintenance_reminders RENAME COLUMN next_due_date TO due_date;
  END IF;
END $$;

-- 5. Customer Referrals: Ensure referral_code column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_referrals' AND column_name = 'referral_code') THEN
        ALTER TABLE customer_referrals ADD COLUMN referral_code TEXT;
    END IF;
END $$;

-- 6. Ensure Critical Tables Exist (Idempotent Checks)
CREATE TABLE IF NOT EXISTS public.arrival_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    request_type TEXT CHECK (request_type IN ('emergency', 'urgent', 'after_hours')),
    description TEXT,
    contact_phone TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Verify Policies (Optional but recommended)
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
