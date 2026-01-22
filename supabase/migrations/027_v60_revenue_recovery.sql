-- =====================================================
-- TRADESCAPTAIN CRM V6.0 UPDATE MIGRATION
-- Includes: Revenue Recovery, Product Restructure
-- =====================================================

-- =====================================================
-- 1. REVENUE ATTRIBUTIONS TABLE
-- Tracks revenue influenced by automated recovery
-- =====================================================

CREATE TABLE IF NOT EXISTS revenue_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,

  -- Trigger (what started the recovery attempt)
  trigger_type VARCHAR(50) NOT NULL,
  trigger_id UUID NOT NULL,
  trigger_at TIMESTAMPTZ NOT NULL,

  -- Action (what the system did)
  action_type VARCHAR(50) NOT NULL,
  action_id UUID,
  action_at TIMESTAMPTZ NOT NULL,

  -- Outcome (what resulted)
  outcome_type VARCHAR(50),
  outcome_id UUID,
  outcome_at TIMESTAMPTZ,

  -- Attribution
  revenue_amount_cents INTEGER DEFAULT 0,
  confidence VARCHAR(20) DEFAULT 'medium',
  window_hours INTEGER DEFAULT 72,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_trigger_type CHECK (
    trigger_type IN ('missed_call', 'estimate_followup', 'no_show', 'after_hours')
  ),
  CONSTRAINT valid_confidence CHECK (
    confidence IN ('high', 'medium', 'low')
  )
);

-- Indexes for revenue attributions
CREATE INDEX IF NOT EXISTS idx_attributions_org_date
  ON revenue_attributions(organization_id, trigger_at);
CREATE INDEX IF NOT EXISTS idx_attributions_outcome
  ON revenue_attributions(outcome_type, outcome_id);
CREATE INDEX IF NOT EXISTS idx_attributions_trigger_type
  ON revenue_attributions(trigger_type, trigger_at);

-- =====================================================
-- 2. CLIENT RECOVERY SETTINGS TABLE
-- Per-organization recovery configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS client_recovery_settings (
  organization_id UUID PRIMARY KEY,
  recovery_enabled BOOLEAN DEFAULT true,
  recovery_locked BOOLEAN DEFAULT false,
  client_can_disable BOOLEAN DEFAULT true,
  attribution_window_hours INTEGER DEFAULT 72,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. REVENUE ATTRIBUTION SUMMARY VIEW
-- Aggregated stats for dashboards
-- =====================================================

CREATE OR REPLACE VIEW revenue_attribution_summary AS
SELECT
  organization_id,
  DATE_TRUNC('month', trigger_at) as month,
  COUNT(*) as total_attempts,
  COUNT(outcome_id) as successful_recoveries,
  SUM(
    CASE
      WHEN confidence = 'high' THEN revenue_amount_cents
      ELSE revenue_amount_cents * 0.7
    END
  )::INTEGER as influenced_revenue_cents,
  ROUND(
    COUNT(outcome_id)::numeric / NULLIF(COUNT(*), 0) * 100,
    1
  ) as recovery_rate
FROM revenue_attributions
GROUP BY organization_id, DATE_TRUNC('month', trigger_at);

-- =====================================================
-- 4. MARK DISCONTINUED PRODUCTS
-- Keep for existing subscriptions but hide from new sales
-- =====================================================

-- Add discontinued flag if not exists
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_discontinued BOOLEAN DEFAULT false;

-- Mark bundle products as discontinued
UPDATE products
SET
  is_discontinued = true,
  status = COALESCE(status, 'discontinued'),
  updated_at = NOW()
WHERE slug IN (
  'leads-captain',
  'silver-starter', 'silver-pro', 'silver-enterprise',
  'gold-starter', 'gold-pro', 'gold-enterprise'
);

-- =====================================================
-- 5. UPDATE BLUE PRO/ENTERPRISE WITH AI SMS
-- Consolidate Leads Captain features into Blue tiers
-- =====================================================

-- Update Blue Pro to include AI SMS
UPDATE products
SET
  features = COALESCE(features, '{}'::jsonb) ||
    '{"ai_sms_included": true, "sms_limit": 1000}'::jsonb,
  updated_at = NOW()
WHERE slug = 'blue-pro';

-- Update Blue Enterprise to include AI SMS
UPDATE products
SET
  features = COALESCE(features, '{}'::jsonb) ||
    '{"ai_sms_included": true, "sms_limit": 1500}'::jsonb,
  updated_at = NOW()
WHERE slug = 'blue-enterprise';

-- =====================================================
-- 6. RENAME LOCAL SEO TO SEO/AEO
-- =====================================================

-- Update product names and slugs
UPDATE products
SET
  name = REPLACE(name, 'Local SEO', 'SEO/AEO'),
  slug = REPLACE(slug, 'local-seo', 'seo-aeo'),
  updated_at = NOW()
WHERE slug LIKE 'local-seo%';

-- Update commission lookup table
UPDATE plan_commission_lookup
SET
  plan_type = REPLACE(plan_type, 'local_seo', 'seo_aeo'),
  updated_at = NOW()
WHERE plan_type LIKE 'local_seo%';

-- =====================================================
-- 7. ADD EXTRA USER ADD-ON
-- $10/month per additional user
-- =====================================================

INSERT INTO products (
  slug,
  name,
  description,
  price_monthly_cents,
  price_annual_cents,
  product_type,
  is_addon,
  features,
  created_at,
  updated_at
) VALUES (
  'extra-user',
  'Extra User',
  'Additional user seat for Blue CRM plans',
  1000,
  NULL,
  'addon',
  true,
  '{"applies_to": ["blue-starter", "blue-pro", "blue-enterprise"]}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  price_monthly_cents = 1000,
  updated_at = NOW();

-- Add commission lookup for extra user
INSERT INTO plan_commission_lookup (
  plan_type,
  monthly_price_cents,
  upfront_cents,
  rate_10_cents,
  rate_15_cents,
  max_commission_cents,
  created_at,
  updated_at
) VALUES (
  'extra_user',
  1000,
  500,    -- 50% upfront = $5
  100,    -- 10% = $1
  150,    -- 15% = $1.50
  2350,   -- Max commission estimate
  NOW(),
  NOW()
) ON CONFLICT (plan_type) DO UPDATE SET
  monthly_price_cents = 1000,
  upfront_cents = 500,
  rate_10_cents = 100,
  rate_15_cents = 150,
  updated_at = NOW();

-- =====================================================
-- 8. UPDATE SYSTEM VERSION
-- =====================================================

INSERT INTO system_settings (key, value, updated_at)
VALUES ('pricing_version', '6.0', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = '6.0',
  updated_at = NOW();

-- =====================================================
-- 9. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE revenue_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_recovery_settings ENABLE ROW LEVEL SECURITY;

-- Revenue attributions: Users can only see their organization's data
CREATE POLICY "Users can view own org attributions"
  ON revenue_attributions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Revenue attributions: Service role can insert
CREATE POLICY "Service can insert attributions"
  ON revenue_attributions
  FOR INSERT
  WITH CHECK (true);

-- Client recovery settings: Users can view their org settings
CREATE POLICY "Users can view own org recovery settings"
  ON client_recovery_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Client recovery settings: Users can update their org settings (if not locked)
CREATE POLICY "Users can update own org recovery settings"
  ON client_recovery_settings
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    AND recovery_locked = false
  );

-- =====================================================
-- END V6.0 MIGRATION
-- =====================================================
