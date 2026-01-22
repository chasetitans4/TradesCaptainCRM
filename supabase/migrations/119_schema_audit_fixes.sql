-- =====================================================
-- SCHEMA AUDIT FIXES
-- Migration: 119_schema_audit_fixes.sql
-- Purpose: Fix missing tables and columns identified in schema audit
-- Date: 2026-01-22
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE PROFILES VIEW
-- The profiles view provides compatibility with code that expects
-- a profiles table. It maps to the users table.
-- =====================================================

-- Drop existing view if it exists to recreate
DROP VIEW IF EXISTS profiles;

CREATE VIEW profiles AS
SELECT
  id,
  email,
  name AS full_name,
  phone,
  avatar_url,
  business_id,
  role,
  notification_settings,
  created_at,
  updated_at
FROM users;

-- Grant permissions on the view
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO service_role;

COMMENT ON VIEW profiles IS 'Compatibility view mapping to users table - provides full_name alias for code expecting profiles table';

-- =====================================================
-- 2. CREATE ACTIVITY_LOG TABLE
-- For general business activity tracking (separate from admin_activity_log)
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- Nullable for system/customer actions

  entity_type TEXT NOT NULL, -- 'job', 'quote', 'invoice', 'customer', etc.
  entity_id UUID NOT NULL,

  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'reschedule_requested', etc.
  description TEXT,
  metadata JSONB, -- For storing extra details like reschedule reason, previous values

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_log_business ON activity_log(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view activity for their business" ON activity_log;
CREATE POLICY "Users can view activity for their business" ON activity_log
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert activity for their business" ON activity_log;
CREATE POLICY "Users can insert activity for their business" ON activity_log
  FOR INSERT WITH CHECK (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Service role full access activity_log" ON activity_log;
CREATE POLICY "Service role full access activity_log" ON activity_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grants
GRANT SELECT, INSERT ON activity_log TO authenticated;
GRANT ALL ON activity_log TO service_role;

COMMENT ON TABLE activity_log IS 'General business activity log for tracking changes to jobs, quotes, invoices, etc.';

-- =====================================================
-- 3. ADD MISSING COLUMNS FROM 011_quick_wins_phase4
-- These columns may have been missed if that migration wasn't applied
-- =====================================================

-- Jobs table: Add metadata column
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Quotes table: Add discount and customer notes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Invoices table: Add discount and customer notes
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Quote items: Add saved_service_id and is_taxable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_services') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items' AND column_name = 'saved_service_id') THEN
      ALTER TABLE quote_items ADD COLUMN saved_service_id UUID REFERENCES saved_services(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT TRUE;

-- Invoice items: Add saved_service_id and is_taxable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_services') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_items' AND column_name = 'saved_service_id') THEN
      ALTER TABLE invoice_items ADD COLUMN saved_service_id UUID REFERENCES saved_services(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT TRUE;

-- =====================================================
-- 4. FIX INVOICE_REFUNDS TABLE
-- Update foreign key and RLS to use users table directly
-- (in case the profiles view doesn't satisfy FK constraints)
-- =====================================================

-- Check if invoice_refunds exists and fix the FK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_refunds') THEN
    -- Drop the problematic FK if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'invoice_refunds_refunded_by_fkey'
      AND table_name = 'invoice_refunds'
    ) THEN
      ALTER TABLE invoice_refunds DROP CONSTRAINT invoice_refunds_refunded_by_fkey;
    END IF;

    -- Re-add FK to reference users instead
    ALTER TABLE invoice_refunds
      ADD CONSTRAINT invoice_refunds_refunded_by_fkey
      FOREIGN KEY (refunded_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update RLS policies for invoice_refunds to use users table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_refunds') THEN
    -- Drop and recreate policies to use users instead of profiles
    DROP POLICY IF EXISTS "Users can view refunds for their business invoices" ON invoice_refunds;
    CREATE POLICY "Users can view refunds for their business invoices"
      ON invoice_refunds FOR SELECT
      USING (
        invoice_id IN (
          SELECT i.id FROM invoices i
          JOIN users u ON u.business_id = i.business_id
          WHERE u.id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can create refunds for their business invoices" ON invoice_refunds;
    CREATE POLICY "Users can create refunds for their business invoices"
      ON invoice_refunds FOR INSERT
      WITH CHECK (
        invoice_id IN (
          SELECT i.id FROM invoices i
          JOIN users u ON u.business_id = i.business_id
          WHERE u.id = auth.uid()
        )
      );
  END IF;
END $$;

-- =====================================================
-- 5. CREATE BUSINESS REVENUE STATS VIEW
-- Helper view for revenue metrics
-- =====================================================

CREATE OR REPLACE VIEW business_revenue_stats AS
SELECT
  business_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as invoice_count,
  SUM(total) as total_invoiced,
  SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as total_collected,
  SUM(CASE WHEN status IN ('sent', 'viewed', 'overdue') THEN amount_due ELSE 0 END) as total_outstanding
FROM invoices
GROUP BY business_id, DATE_TRUNC('month', created_at);

GRANT SELECT ON business_revenue_stats TO authenticated;
GRANT SELECT ON business_revenue_stats TO service_role;

COMMENT ON VIEW business_revenue_stats IS 'Aggregated monthly revenue statistics per business';

-- =====================================================
-- 6. APPLY COLUMN RENAMES (if not already done)
-- These handle known column naming inconsistencies
-- =====================================================

-- Jobs: assigned_to -> assigned_user_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'assigned_to')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'assigned_user_id') THEN

    ALTER TABLE jobs RENAME COLUMN assigned_to TO assigned_user_id;

    -- Rename FK if exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'jobs_assigned_to_fkey') THEN
        ALTER TABLE jobs RENAME CONSTRAINT jobs_assigned_to_fkey TO jobs_assigned_user_id_fkey;
    END IF;
  END IF;
END $$;

-- Referral Programs: terms_conditions -> terms_and_conditions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'terms_conditions')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'terms_and_conditions') THEN

    ALTER TABLE referral_programs RENAME COLUMN terms_conditions TO terms_and_conditions;
  END IF;
END $$;

-- Referral Programs: referrer_reward_value -> referrer_reward_amount
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'referrer_reward_value')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referral_programs' AND column_name = 'referrer_reward_amount') THEN

    ALTER TABLE referral_programs RENAME COLUMN referrer_reward_value TO referrer_reward_amount;
  END IF;
END $$;

-- Maintenance Reminders: next_due_date -> due_date
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_reminders' AND column_name = 'next_due_date')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_reminders' AND column_name = 'due_date') THEN

    ALTER TABLE maintenance_reminders RENAME COLUMN next_due_date TO due_date;
  END IF;
END $$;

-- Customer Referrals: Ensure referral_code column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_referrals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_referrals' AND column_name = 'referral_code') THEN
      ALTER TABLE customer_referrals ADD COLUMN referral_code TEXT;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 7. FORCE SCHEMA CACHE RELOAD
-- =====================================================
NOTIFY pgrst, 'reload config';

COMMIT;
