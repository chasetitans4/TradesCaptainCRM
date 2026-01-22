-- =====================================================
-- V5.9 CONSOLIDATION MIGRATION
-- Final cleanup to ensure all v5.9 updates are applied
-- Includes: Tier renaming, Local SEO Enterprise, rate lock fields
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TIER RENAMING: Growth → Enterprise
-- =====================================================

-- Update any remaining 'growth' tier references in plans table
UPDATE plans SET
  name = REPLACE(name, 'Growth', 'Enterprise'),
  slug = REPLACE(slug, 'growth', 'enterprise')
WHERE (name LIKE '%Growth%' OR slug LIKE '%growth%')
  AND name NOT LIKE '%Enterprise%';

-- Update tier enum if exists (PostgreSQL enum update)
DO $$
BEGIN
  -- Check if enum exists and has 'growth' value
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'plan_tier' AND e.enumlabel = 'growth'
  ) THEN
    -- Rename the enum value
    ALTER TYPE plan_tier RENAME VALUE 'growth' TO 'enterprise';
  END IF;
EXCEPTION
  WHEN others THEN
    -- Enum doesn't exist or already renamed, skip
    NULL;
END $$;

-- Update tiers table if exists
UPDATE tiers SET
  name = 'Enterprise',
  slug = 'enterprise'
WHERE slug = 'growth' OR name = 'Growth';

-- =====================================================
-- 2. LOCAL SEO ENTERPRISE TIER
-- Add missing tier at $249/mo
-- =====================================================

-- Add to plan_commission_lookup if not exists
INSERT INTO plan_commission_lookup (
  plan_type,
  monthly_price_cents,
  upfront_cents,
  rate_10_cents,
  rate_15_cents,
  max_commission_cents,
  annual_price_cents,
  annual_commission_cents,
  created_at,
  updated_at
)
VALUES (
  'local_seo_enterprise',
  24900,  -- $249/mo
  12450,  -- 50% upfront
  2490,   -- 10% rate
  3735,   -- 15% rate
  ROUND(12450 + (2490 * 3) + (3735 * 9) + 19000),  -- Max commission
  224100, -- Annual = $2,241 (10% discount)
  ROUND(224100 * 0.35), -- 35% annual commission
  NOW(),
  NOW()
)
ON CONFLICT (plan_type) DO UPDATE SET
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  upfront_cents = EXCLUDED.upfront_cents,
  rate_10_cents = EXCLUDED.rate_10_cents,
  rate_15_cents = EXCLUDED.rate_15_cents,
  max_commission_cents = EXCLUDED.max_commission_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  annual_commission_cents = EXCLUDED.annual_commission_cents,
  updated_at = NOW();

-- =====================================================
-- 3. SUBSCRIPTION PAYMENT TRACKING COLUMNS
-- Required for v5.9 commission logic
-- =====================================================

-- Add payment_count if not exists
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_count INTEGER DEFAULT 0;

-- Add rate lock fields for 15% commission at Month 6
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS commission_rate_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS locked_commission_rate DECIMAL(4,2);
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS rate_lock_date TIMESTAMPTZ;

-- Add first/last payment dates for tracking
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS first_payment_date TIMESTAMPTZ;
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;

-- =====================================================
-- 4. COMMISSION PAYOUT SCHEDULING COLUMNS
-- Required for 1st/15th payout schedule
-- =====================================================

-- Add trigger payment date column
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS trigger_payment_date TIMESTAMPTZ;

-- Add scheduled payout date
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS scheduled_payout_date DATE;

-- Add payout status for processing
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS payout_status VARCHAR(20) DEFAULT 'pending';

-- Add paid_at for tracking
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Index for efficient payout queries
CREATE INDEX IF NOT EXISTS idx_commissions_scheduled_payout_status
  ON commissions(scheduled_payout_date, payout_status)
  WHERE scheduled_payout_date IS NOT NULL;

-- =====================================================
-- 5. PAYOUTS TABLE
-- For tracking batch payouts on 1st/15th
-- =====================================================

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  payout_date DATE NOT NULL,
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  commission_count INTEGER NOT NULL DEFAULT 0,
  commission_ids UUID[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES admin_users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on payouts
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Index for payout queries
CREATE INDEX IF NOT EXISTS idx_payouts_date_status
  ON payouts(payout_date, status);

CREATE INDEX IF NOT EXISTS idx_payouts_agent
  ON payouts(agent_id, payout_date DESC);

-- Policy: Agents can see their own payouts
CREATE POLICY IF NOT EXISTS payouts_agent_read ON payouts
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- Policy: Admins can manage all payouts
CREATE POLICY IF NOT EXISTS payouts_admin_all ON payouts
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.role IN ('admin', 'finance')
    AND admin_users.status = 'active'
  ));

-- =====================================================
-- 6. UPDATE SYSTEM VERSION
-- =====================================================

INSERT INTO system_settings (key, value, updated_at)
VALUES
  ('pricing_version', '5.9', NOW()),
  ('v59_migration_complete', 'true', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- 7. RETENTION TRACKING ENHANCEMENTS
-- =====================================================

-- Add rate lock tracking to retention_tracking
ALTER TABLE retention_tracking
  ADD COLUMN IF NOT EXISTS rate_locked_at_15 BOOLEAN DEFAULT FALSE;
ALTER TABLE retention_tracking
  ADD COLUMN IF NOT EXISTS rate_lock_date TIMESTAMPTZ;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMIT;

-- Documentation
COMMENT ON TABLE payouts IS 'v5.9: Batch payouts processed on 1st and 15th of each month';
COMMENT ON COLUMN commissions.scheduled_payout_date IS 'v5.9: Date when commission is scheduled to be paid (1st or 15th)';
COMMENT ON COLUMN commissions.trigger_payment_date IS 'v5.9: Date of customer payment that triggered this commission';
COMMENT ON COLUMN subscriptions.commission_rate_locked IS 'v5.9: Whether the 15% rate is locked in (after Month 6)';
