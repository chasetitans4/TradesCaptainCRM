-- =====================================================
-- AI SERVICES CONTROL SYNC (v2)
-- Migration: 111_ai_services_control_sync.sql
-- Purpose: Synchronize database schema with AI Services Control features
-- Fix: Corrected RLS policy to use 'users' table instead of non-existent 'business_users'
-- =====================================================

-- 1. Ensure feature_settings table exists
CREATE TABLE IF NOT EXISTS feature_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    ai_sms_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id)
);

-- 2. Ensure ai_sms_enabled exists on businesses table (Master Toggle)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'ai_sms_enabled'
    ) THEN
        ALTER TABLE businesses ADD COLUMN ai_sms_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Sync feature_settings with businesses table
INSERT INTO feature_settings (business_id, ai_sms_enabled)
SELECT id, COALESCE(ai_sms_enabled, false)
FROM businesses
ON CONFLICT (business_id) 
DO UPDATE SET ai_sms_enabled = EXCLUDED.ai_sms_enabled;

-- 4. Update Plan Features for AI Services Gating
CREATE TABLE IF NOT EXISTS plan_leads_captain_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type VARCHAR(50) NOT NULL UNIQUE,
    includes_leads_captain BOOLEAN DEFAULT false,
    sms_included INTEGER DEFAULT 0,
    can_book_calendar BOOLEAN DEFAULT false,
    includes_crm BOOLEAN DEFAULT false,
    includes_calendar BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blue Starter: NO AI
INSERT INTO plan_leads_captain_features (plan_type, includes_leads_captain, sms_included, can_book_calendar, includes_crm, includes_calendar)
VALUES ('blue_starter', false, 0, false, true, true)
ON CONFLICT (plan_type) 
DO UPDATE SET 
    includes_leads_captain = false,
    sms_included = 0,
    can_book_calendar = false;

-- Blue Pro: YES AI (1000 SMS)
INSERT INTO plan_leads_captain_features (plan_type, includes_leads_captain, sms_included, can_book_calendar, includes_crm, includes_calendar)
VALUES ('blue_pro', true, 1000, true, true, true)
ON CONFLICT (plan_type) 
DO UPDATE SET 
    includes_leads_captain = true,
    sms_included = 1000,
    can_book_calendar = true;

-- Blue Enterprise: YES AI (1500 SMS)
INSERT INTO plan_leads_captain_features (plan_type, includes_leads_captain, sms_included, can_book_calendar, includes_crm, includes_calendar)
VALUES ('blue_enterprise', true, 1500, true, true, true)
ON CONFLICT (plan_type) 
DO UPDATE SET 
    includes_leads_captain = true,
    sms_included = 1500,
    can_book_calendar = true;

-- 5. Ensure Audit Log table exists (if not already)
CREATE TABLE IF NOT EXISTS business_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Grant permissions & RLS
ALTER TABLE feature_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_leads_captain_features ENABLE ROW LEVEL SECURITY;

-- Helper function check (usually exists, but safe to assume standard usage)
-- We use a subquery to avoid dependency on specific helper functions if possible, 
-- OR use the standard `get_user_business_id()` if we trust it exists.
-- Given the schema file, `get_user_business_id()` is reliable.

DROP POLICY IF EXISTS "Business owners can view their feature settings" ON feature_settings;
CREATE POLICY "Business owners can view their feature settings" ON feature_settings
    FOR SELECT USING (
        business_id = (SELECT business_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
    );

DROP POLICY IF EXISTS "Service role manages feature settings" ON feature_settings;
CREATE POLICY "Service role manages feature settings" ON feature_settings
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for plan_leads_captain_features
DROP POLICY IF EXISTS "Plan features are public" ON plan_leads_captain_features;
CREATE POLICY "Plan features are public" ON plan_leads_captain_features
    FOR SELECT USING (true);
