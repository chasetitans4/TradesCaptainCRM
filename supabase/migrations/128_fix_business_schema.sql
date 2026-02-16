
-- =====================================================
-- MIGRATION 128: FIX BUSINESS SCHEMA
-- Add missing is_active column that caused seed failure
-- =====================================================

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN businesses.is_active IS 'Whether the business account is active';

-- Verify other potential missing columns from recent updates
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(50) DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);
