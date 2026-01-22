-- =====================================================
-- COMMISSION CALCULATOR MIGRATION
-- Migration: 009_commission_calculator.sql
-- Version: 5.8.1
-- Features: Commission rates, retention bonuses, offer adjustments
-- =====================================================

-- =====================================================
-- 1. COMMISSION RATES TABLE
-- Stores current and historical commission rates
-- =====================================================

CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type VARCHAR(50) NOT NULL,  -- 'upfront', 'recurring_10', 'recurring_15', 'annual', 'custom_upfront', 'custom_recurring', 'custom_annual'
  rate_percentage DECIMAL(5,2) NOT NULL,
  effective_date DATE NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(rate_type, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_commission_rates_type ON commission_rates(rate_type, is_active);
CREATE INDEX IF NOT EXISTS idx_commission_rates_effective ON commission_rates(effective_date DESC);

-- Seed current rates (v5.8)
INSERT INTO commission_rates (rate_type, rate_percentage, effective_date, notes, is_active) VALUES
  ('upfront', 50.00, '2025-01-01', 'Standard upfront on monthly plans - after Month 2', true),
  ('recurring_10', 10.00, '2025-01-01', 'Months 3-5 recurring rate', true),
  ('recurring_15', 15.00, '2025-01-01', 'Months 6-14 recurring rate (locked in at Month 6)', true),
  ('annual', 35.00, '2025-01-01', 'Annual plan one-time commission', true),
  ('custom_upfront', 50.00, '2025-01-01', 'Custom plan upfront commission', true),
  ('custom_recurring', 10.00, '2025-01-01', 'Custom plan recurring commission', true),
  ('custom_annual', 35.00, '2025-01-01', 'Custom plan annual commission', true)
ON CONFLICT (rate_type, effective_date) DO NOTHING;

-- =====================================================
-- 2. RETENTION BONUSES TABLE
-- Milestone-based retention bonuses
-- =====================================================

CREATE TABLE IF NOT EXISTS retention_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone VARCHAR(50) NOT NULL,  -- 'month_3', 'month_4', 'month_6', 'month_12'
  bonus_amount_cents INTEGER NOT NULL,
  requirement TEXT,
  applies_to VARCHAR(20) DEFAULT 'monthly',  -- 'monthly', 'annual', 'both'
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(milestone, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_retention_bonuses_milestone ON retention_bonuses(milestone, is_active);

-- Seed current bonuses (v5.8)
INSERT INTO retention_bonuses (milestone, bonus_amount_cents, requirement, applies_to, effective_date, is_active) VALUES
  ('month_3', 1500, 'Check-in call logged + satisfaction audit sent', 'monthly', '2025-01-01', true),
  ('month_4', 2500, 'Customer 4th payment processed', 'monthly', '2025-01-01', true),
  ('month_6', 5000, 'Customer still active at Month 6 + rate bumps to 15%', 'monthly', '2025-01-01', true),
  ('month_12', 10000, 'Customer still active at Month 12', 'monthly', '2025-01-01', true)
ON CONFLICT (milestone, effective_date) DO NOTHING;

-- =====================================================
-- 3. OFFER COMMISSION ADJUSTMENTS TABLE
-- How offers affect commission calculations
-- =====================================================

CREATE TABLE IF NOT EXISTS offer_commission_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_code VARCHAR(50) NOT NULL UNIQUE,
  offer_name VARCHAR(100),
  upfront_adjustment_type VARCHAR(20),  -- 'none', 'reduce_base', 'delay'
  upfront_adjustment_value DECIMAL(5,2),  -- Percentage or days
  recurring_adjustment_type VARCHAR(20),  -- 'none', 'reduce_rate', 'reduce_base'
  recurring_adjustment_value DECIMAL(5,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offer_adjustments_code ON offer_commission_adjustments(offer_code, is_active);

-- Seed offer adjustments (v5.8)
INSERT INTO offer_commission_adjustments (offer_code, offer_name, upfront_adjustment_type, upfront_adjustment_value, recurring_adjustment_type, recurring_adjustment_value, notes, is_active) VALUES
  ('FIRST50', '50% Off First Month', 'reduce_base', 50.00, 'none', NULL, 'Upfront based on discounted M1, M2 at full price', true),
  ('FREETRIAL14', '14-Day Free Trial', 'delay', 14, 'none', NULL, 'Upfront delayed 14 days, based on M2+M3', true),
  ('ANNUAL25', '25% Off Annual', 'none', NULL, 'none', NULL, 'Commission on discounted annual price (already reflected in price)', true),
  ('WAIVE99', 'Waive $99 GBP Setup', 'none', NULL, 'none', NULL, 'No commission impact - setup fee waiver only', true),
  ('VIP20', '20% Off Forever', 'reduce_base', 20.00, 'reduce_base', 20.00, 'All commission based on permanently discounted price', true)
ON CONFLICT (offer_code) DO NOTHING;

-- =====================================================
-- 4. PLAN COMMISSION LOOKUP TABLE
-- Pre-calculated commission values for quick reference
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_commission_lookup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type VARCHAR(50) NOT NULL UNIQUE,
  monthly_price_cents INTEGER NOT NULL,
  upfront_cents INTEGER NOT NULL,          -- 50% of monthly
  rate_10_cents INTEGER NOT NULL,          -- 10% of monthly
  rate_15_cents INTEGER NOT NULL,          -- 15% of monthly
  total_recurring_cents INTEGER NOT NULL,  -- (10% x 3) + (15% x 9)
  total_bonuses_cents INTEGER NOT NULL,    -- $190 = 19000 cents
  max_commission_cents INTEGER NOT NULL,   -- upfront + recurring + bonuses
  annual_price_cents INTEGER,
  annual_commission_cents INTEGER,         -- 35% of annual
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_commission_lookup ON plan_commission_lookup(plan_type);

-- Pre-calculated commission values per plan (v5.8.1)
INSERT INTO plan_commission_lookup (
  plan_type, monthly_price_cents, upfront_cents, rate_10_cents, rate_15_cents,
  total_recurring_cents, total_bonuses_cents, max_commission_cents,
  annual_price_cents, annual_commission_cents
) VALUES
  -- NeverMiss Track
  ('nevermiss', 2900, 1450, 290, 435, 4785, 19000, 25235, 26100, 9135),
  ('nevermiss_user', 1900, 950, 190, 285, 3135, 19000, 23085, NULL, NULL),

  -- Blue Track
  ('blue_starter', 4900, 2450, 490, 735, 8115, 19000, 29565, 44100, 15435),
  ('blue_pro', 9900, 4950, 990, 1485, 16335, 19000, 40285, 89100, 31185),
  ('blue_enterprise', 19900, 9950, 1990, 2985, 32835, 19000, 61785, 179100, 62685),

  -- Web Track
  ('web_starter', 14900, 7450, 1490, 2235, 24585, 19000, 51035, 134100, 46935),
  ('web_pro', 24900, 12450, 2490, 3735, 41085, 19000, 72535, 224100, 78435),
  ('web_enterprise', 34900, 17450, 3490, 5235, 57585, 19000, 94035, 314100, 109935),

  -- Silver Track
  ('silver_starter', 19900, 9950, 1990, 2985, 32835, 19000, 61785, 179100, 62685),
  ('silver_pro', 34900, 17450, 3490, 5235, 57585, 19000, 94035, 314100, 109935),
  ('silver_enterprise', 44900, 22450, 4490, 6735, 74085, 19000, 115535, 404100, 141435),

  -- Gold Track
  ('gold_starter', 24900, 12450, 2490, 3735, 41085, 19000, 72535, 224100, 78435),
  ('gold_pro', 39900, 19950, 3990, 5985, 65835, 19000, 104785, 359100, 125685),
  ('gold_enterprise', 54900, 27450, 5490, 8235, 90585, 19000, 137035, 494100, 172935),

  -- Local SEO Track
  ('local_seo_starter', 9900, 4950, 990, 1485, 16335, 19000, 40285, 89100, 31185),
  ('local_seo_pro', 19900, 9950, 1990, 2985, 32835, 19000, 61785, 179100, 62685)
ON CONFLICT (plan_type) DO UPDATE SET
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  upfront_cents = EXCLUDED.upfront_cents,
  rate_10_cents = EXCLUDED.rate_10_cents,
  rate_15_cents = EXCLUDED.rate_15_cents,
  total_recurring_cents = EXCLUDED.total_recurring_cents,
  max_commission_cents = EXCLUDED.max_commission_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  annual_commission_cents = EXCLUDED.annual_commission_cents,
  updated_at = NOW();

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_commission_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_commission_lookup ENABLE ROW LEVEL SECURITY;

-- Commission data is readable by authenticated users
CREATE POLICY "Commission rates are readable by authenticated" ON commission_rates
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Retention bonuses are readable by authenticated" ON retention_bonuses
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Offer adjustments are readable by authenticated" ON offer_commission_adjustments
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Plan commission lookup is readable by authenticated" ON plan_commission_lookup
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Only service role can modify
CREATE POLICY "Service role manages commission_rates" ON commission_rates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages retention_bonuses" ON retention_bonuses
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages offer_commission_adjustments" ON offer_commission_adjustments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages plan_commission_lookup" ON plan_commission_lookup
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 6. HELPER FUNCTION: Get current commission rates
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_commission_rates()
RETURNS TABLE (
  rate_type VARCHAR(50),
  rate_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT cr.rate_type, cr.rate_percentage
  FROM commission_rates cr
  WHERE cr.is_active = true
    AND cr.effective_date <= CURRENT_DATE
  ORDER BY cr.effective_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 7. HELPER FUNCTION: Get retention bonuses
-- =====================================================

CREATE OR REPLACE FUNCTION get_retention_bonuses()
RETURNS TABLE (
  milestone VARCHAR(50),
  bonus_amount_cents INTEGER,
  requirement TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT rb.milestone, rb.bonus_amount_cents, rb.requirement
  FROM retention_bonuses rb
  WHERE rb.is_active = true
    AND rb.effective_date <= CURRENT_DATE
    AND rb.applies_to IN ('monthly', 'both')
  ORDER BY rb.milestone;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify commission rates
-- SELECT * FROM commission_rates WHERE is_active = true;

-- Verify retention bonuses
-- SELECT * FROM retention_bonuses WHERE is_active = true;

-- Verify offer adjustments
-- SELECT * FROM offer_commission_adjustments WHERE is_active = true;

-- Verify plan lookup
-- SELECT plan_type, monthly_price_cents/100 as price, max_commission_cents/100 as max_commission FROM plan_commission_lookup ORDER BY monthly_price_cents;
