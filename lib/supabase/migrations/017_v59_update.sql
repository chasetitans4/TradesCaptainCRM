-- =====================================================
-- TRADESCAPTAIN CRM V5.9 UPDATE MIGRATION
-- Includes: Payout scheduling, pricing updates
-- =====================================================

-- =====================================================
-- 1. PAYOUT SCHEDULING COLUMNS
-- =====================================================

-- Add scheduled payout date column to commissions
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS scheduled_payout_date DATE;

-- Add trigger payment date to track when the payment that triggered the commission occurred
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS trigger_payment_date TIMESTAMPTZ;

-- Create index for efficient payout batch processing
CREATE INDEX IF NOT EXISTS idx_commissions_scheduled_payout
  ON commissions(scheduled_payout_date, status)
  WHERE status IN ('pending', 'eligible', 'approved');

-- Create index for payout date queries
CREATE INDEX IF NOT EXISTS idx_commissions_payout_date_agent
  ON commissions(scheduled_payout_date, agent_id)
  WHERE scheduled_payout_date IS NOT NULL;

-- =====================================================
-- 2. PAYOUT BATCHES TABLE
-- For tracking processed payout runs
-- =====================================================

CREATE TABLE IF NOT EXISTS commission_payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_commissions INTEGER DEFAULT 0,
  total_amount_cents INTEGER DEFAULT 0,
  commissions_processed INTEGER DEFAULT 0,
  commissions_failed INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES admin_users(id),
  notes TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for payout batch lookups
CREATE INDEX IF NOT EXISTS idx_payout_batches_date
  ON commission_payout_batches(payout_date, status);

-- =====================================================
-- 3. UPDATE PLAN PRICING (V5.9)
-- Prices in cents
-- =====================================================

-- Leads Captain: $29 → $39
UPDATE plan_commission_lookup SET
  monthly_price_cents = 3900,
  upfront_cents = 1950,
  rate_10_cents = 390,
  rate_15_cents = 585,
  max_commission_cents = ROUND(1950 + (390 * 3) + (585 * 9) + 19000),
  updated_at = NOW()
WHERE plan_type = 'leads_captain';

-- Web Starter: $149 → $199
UPDATE plan_commission_lookup SET
  monthly_price_cents = 19900,
  upfront_cents = 9950,
  rate_10_cents = 1990,
  rate_15_cents = 2985,
  max_commission_cents = ROUND(9950 + (1990 * 3) + (2985 * 9) + 19000),
  updated_at = NOW()
WHERE plan_type = 'web_starter';

-- Web Pro: $249 → $299
UPDATE plan_commission_lookup SET
  monthly_price_cents = 29900,
  upfront_cents = 14950,
  rate_10_cents = 2990,
  rate_15_cents = 4485,
  max_commission_cents = ROUND(14950 + (2990 * 3) + (4485 * 9) + 19000),
  updated_at = NOW()
WHERE plan_type = 'web_pro';

-- Web Enterprise: $349 → $499
UPDATE plan_commission_lookup SET
  monthly_price_cents = 49900,
  upfront_cents = 24950,
  rate_10_cents = 4990,
  rate_15_cents = 7485,
  max_commission_cents = ROUND(24950 + (4990 * 3) + (7485 * 9) + 19000),
  updated_at = NOW()
WHERE plan_type = 'web_enterprise';

-- Silver Starter: $199 → $249
UPDATE plan_commission_lookup SET
  monthly_price_cents = 24900,
  upfront_cents = 12450,
  rate_10_cents = 2490,
  rate_15_cents = 3735,
  max_commission_cents = ROUND(12450 + (2490 * 3) + (3735 * 9) + 19000),
  updated_at = NOW()
WHERE plan_type = 'silver_starter';

-- Silver Pro: $299 → $349
UPDATE plan_commission_lookup SET
  monthly_price_cents = 34900,
  upfront_cents = 17450,
  rate_10_cents = 3490,
  rate_15_cents = 5235,
  max_commission_cents = ROUND(17450 + (3490 * 3) + (5235 * 9) + 19000),
  updated_at = NOW()
WHERE plan_type = 'silver_pro';

-- Silver Enterprise: $449 → $499
UPDATE plan_commission_lookup SET
  monthly_price_cents = 49900,
  upfront_cents = 24950,
  rate_10_cents = 4990,
  rate_15_cents = 7485,
  max_commission_cents = ROUND(24950 + (4990 * 3) + (7485 * 9) + 19000),
  updated_at = NOW()
WHERE plan_type = 'silver_enterprise';

-- Gold Starter: $249 → $299
UPDATE plan_commission_lookup SET
  monthly_price_cents = 29900,
  upfront_cents = 14950,
  rate_10_cents = 2990,
  rate_15_cents = 4485,
  max_commission_cents = ROUND(14950 + (2990 * 3) + (4485 * 9) + 19000),
  updated_at = NOW()
WHERE plan_type = 'gold_starter';

-- Gold Pro: $399 (NO CHANGE - but ensure correct)
UPDATE plan_commission_lookup SET
  monthly_price_cents = 39900,
  upfront_cents = 19950,
  rate_10_cents = 3990,
  rate_15_cents = 5985,
  max_commission_cents = ROUND(19950 + (3990 * 3) + (5985 * 9) + 19000),
  updated_at = NOW()
WHERE plan_type = 'gold_pro';

-- Gold Enterprise: $549 → $598
UPDATE plan_commission_lookup SET
  monthly_price_cents = 59800,
  upfront_cents = 29900,
  rate_10_cents = 5980,
  rate_15_cents = 8970,
  max_commission_cents = ROUND(29900 + (5980 * 3) + (8970 * 9) + 19000),
  updated_at = NOW()
WHERE plan_type = 'gold_enterprise';

-- =====================================================
-- 4. INSERT NEW PLANS IF MISSING
-- Ensures leads_captain exists in lookup table
-- =====================================================

INSERT INTO plan_commission_lookup (
  plan_type,
  monthly_price_cents,
  upfront_cents,
  rate_10_cents,
  rate_15_cents,
  max_commission_cents,
  created_at,
  updated_at
)
VALUES (
  'leads_captain',
  3900,
  1950,
  390,
  585,
  ROUND(1950 + (390 * 3) + (585 * 9) + 19000),
  NOW(),
  NOW()
)
ON CONFLICT (plan_type) DO UPDATE SET
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  upfront_cents = EXCLUDED.upfront_cents,
  rate_10_cents = EXCLUDED.rate_10_cents,
  rate_15_cents = EXCLUDED.rate_15_cents,
  max_commission_cents = EXCLUDED.max_commission_cents,
  updated_at = NOW();

-- =====================================================
-- 5. UPDATE SYSTEM VERSION
-- =====================================================

INSERT INTO system_settings (key, value, updated_at)
VALUES ('pricing_version', '5.9', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = '5.9',
  updated_at = NOW();

-- =====================================================
-- 6. ADD RLS POLICIES FOR PAYOUT BATCHES
-- =====================================================

ALTER TABLE commission_payout_batches ENABLE ROW LEVEL SECURITY;

-- Admin users can view all payout batches
CREATE POLICY "Admin users can view payout batches"
  ON commission_payout_batches
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.is_active = true
  ));

-- Only finance/admin can insert/update payout batches
CREATE POLICY "Finance can manage payout batches"
  ON commission_payout_batches
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.role IN ('admin', 'finance')
    AND admin_users.is_active = true
  ));

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
