-- =====================================================
-- SCHEMA CLEANUP & RECONCILIATION
-- Migration: 117_schema_cleanup.sql
-- Purpose: Ensure database schema matches the latest code base expectations
--          specifically for jobs, referrals, and maintenance reminders.
-- =====================================================

DO $$ 
BEGIN 
  -- 1. Jobs Table: assigned_to -> assigned_user_id
  -- The code expects 'assigned_user_id'. If 'assigned_to' exists and 'assigned_user_id' does not, rename it.
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'assigned_to') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'assigned_user_id') THEN
    
    ALTER TABLE jobs RENAME COLUMN assigned_to TO assigned_user_id;
    
    -- Try to rename the foreign key if it exists with the old name
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'jobs_assigned_to_fkey') THEN
        ALTER TABLE jobs RENAME CONSTRAINT jobs_assigned_to_fkey TO jobs_assigned_user_id_fkey;
    END IF;
  END IF;

  -- 2. Referral Programs: terms_conditions -> terms_and_conditions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'terms_conditions') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'terms_and_conditions') THEN
    
    ALTER TABLE referral_programs RENAME COLUMN terms_conditions TO terms_and_conditions;
  END IF;

  -- 3. Referral Programs: referrer_reward_value -> referrer_reward_amount
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'referrer_reward_value') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'referrer_reward_amount') THEN
    
    ALTER TABLE referral_programs RENAME COLUMN referrer_reward_value TO referrer_reward_amount;
  END IF;

  -- 4. Maintenance Reminders: next_due_date -> due_date
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_reminders' AND column_name = 'next_due_date') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_reminders' AND column_name = 'due_date') THEN
    
    ALTER TABLE maintenance_reminders RENAME COLUMN next_due_date TO due_date;
  END IF;

  -- 5. Ensure arrival_pings exists (Idempotent check)
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'arrival_pings') THEN
    CREATE TABLE arrival_pings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      latitude DECIMAL(10,8) NOT NULL,
      longitude DECIMAL(11,8) NOT NULL,
      address TEXT,
      arrived_at TIMESTAMPTZ DEFAULT NOW(),
      sms_sent BOOLEAN DEFAULT false,
      sms_sent_at TIMESTAMPTZ,
      sms_message_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_arrival_pings_business_date ON arrival_pings(business_id, arrived_at);
    CREATE INDEX idx_arrival_pings_user_date ON arrival_pings(user_id, arrived_at);
    CREATE INDEX idx_arrival_pings_job ON arrival_pings(job_id);
  END IF;

  -- 6. Ensure feature_settings exists (Idempotent check)
  -- Note: We assume it might exist, but if not, we create a basic version.
  -- Ideally, feature_settings should have been created by initial migrations.
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_settings') THEN
      CREATE TABLE feature_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
        
        -- Core
        timesheets_enabled BOOLEAN DEFAULT true,
        expense_tracking_enabled BOOLEAN DEFAULT true,
        reviews_enabled BOOLEAN DEFAULT true,
        
        -- Route Optimization
        route_optimization_enabled BOOLEAN DEFAULT true,
        send_arrival_sms BOOLEAN DEFAULT false,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
  ELSE
      -- Ensure columns exist if table exists
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_settings' AND column_name = 'send_arrival_sms') THEN
          ALTER TABLE feature_settings ADD COLUMN send_arrival_sms BOOLEAN DEFAULT false;
      END IF;
  END IF;

END $$;
