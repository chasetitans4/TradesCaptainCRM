-- =====================================================
-- FIX MISSING TABLES & COLUMNS
-- Purpose: Create missing tables if they don't exist, and fix column names
-- =====================================================

-- 1. Helper Function (Required for policies)
CREATE OR REPLACE FUNCTION public.get_auth_business_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT business_id 
        FROM public.users 
        WHERE auth_user_id = auth.uid() 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Referral Programs Table (Create if missing)
CREATE TABLE IF NOT EXISTS public.referral_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    referrer_reward_type TEXT NOT NULL CHECK (referrer_reward_type IN ('cash', 'credit', 'discount_percent', 'discount_fixed', 'gift_card', 'free_service')),
    referrer_reward_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    referee_reward_type TEXT CHECK (referee_reward_type IN ('cash', 'credit', 'discount_percent', 'discount_fixed', 'gift_card', 'free_service')),
    referee_reward_amount DECIMAL(10, 2) DEFAULT 0,
    minimum_job_value DECIMAL(10, 2) DEFAULT 0,
    valid_services TEXT[] DEFAULT '{}',
    terms_and_conditions TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    max_referrals_per_customer INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customer Referrals Table (Create if missing)
CREATE TABLE IF NOT EXISTS public.customer_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES referral_programs(id) ON DELETE CASCADE,
    referrer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    referral_code TEXT, -- Made nullable initially to avoid conflicts, can be set NOT NULL later
    referred_name TEXT,
    referred_email TEXT,
    referred_phone TEXT,
    referred_address TEXT,
    referred_customer_id UUID REFERENCES customers(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('code_generated', 'pending', 'contacted', 'quoted', 'completed', 'reward_issued', 'expired', 'invalid')),
    contacted_at TIMESTAMPTZ,
    quoted_at TIMESTAMPTZ,
    completed_job_id UUID REFERENCES jobs(id),
    completed_at TIMESTAMPTZ,
    job_value DECIMAL(10, 2),
    referrer_reward_status TEXT DEFAULT 'pending' CHECK (referrer_reward_status IN ('pending', 'eligible', 'issued', 'redeemed', 'expired')),
    referrer_reward_issued_at TIMESTAMPTZ,
    referrer_reward_redeemed_at TIMESTAMPTZ,
    referrer_reward_notes TEXT,
    referee_reward_status TEXT,
    referee_reward_issued_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_referrals ENABLE ROW LEVEL SECURITY;

-- 5. Fix Columns (Renames) - Only if table existed but had old names
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

  -- Ensure referral_code exists in customer_referrals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_referrals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_referrals' AND column_name = 'referral_code') THEN
        ALTER TABLE customer_referrals ADD COLUMN referral_code TEXT;
    END IF;
  END IF;
END $$;

-- 6. Re-apply Policies (Idempotent)
DROP POLICY IF EXISTS "Business owners can manage referral programs" ON referral_programs;
CREATE POLICY "Business owners can manage referral programs"
ON referral_programs FOR ALL
USING (business_id = public.get_auth_business_id());

DROP POLICY IF EXISTS "Business owners can view referrals" ON customer_referrals;
CREATE POLICY "Business owners can view referrals"
ON customer_referrals FOR ALL
USING (business_id = public.get_auth_business_id());

-- 7. Force Schema Cache Reload
NOTIFY pgrst, 'reload config';
