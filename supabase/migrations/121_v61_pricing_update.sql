-- =====================================================
-- TradesCaptain CRM v6.1 Pricing Update
-- Gold Bundles, Setup Fees, New Commission Structure
-- =====================================================

-- Add bundle tracking columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS bundle_id VARCHAR(50);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS setup_fee_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS setup_fee_amount DECIMAL(10,2) DEFAULT 0;

-- Add setup fee tracking to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS setup_fee_status VARCHAR(20) DEFAULT 'not_applicable';
-- Possible values: 'not_applicable', 'pending', 'paid', 'waived'

-- Create subscription_locations table for extra locations
CREATE TABLE IF NOT EXISTS subscription_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('web', 'seo')),
  location_name VARCHAR(255),
  location_address TEXT,
  setup_fee_amount DECIMAL(10,2) DEFAULT 0,
  monthly_fee_amount DECIMAL(10,2) NOT NULL,
  setup_paid BOOLEAN DEFAULT FALSE,
  setup_paid_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'pending')),
  stripe_subscription_item_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_locations_business
  ON subscription_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_locations_subscription
  ON subscription_locations(subscription_id);

-- Update commissions table with v6.1 structure
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS setup_fee_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS is_crm_product BOOLEAN DEFAULT FALSE;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS upfront_rate DECIMAL(5,4) DEFAULT 0.40;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS qualification_days INTEGER DEFAULT 30;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP;

-- Create performance_bonuses table for monthly/yearly bonuses
CREATE TABLE IF NOT EXISTS agent_performance_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  bonus_type VARCHAR(20) NOT NULL CHECK (bonus_type IN ('monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  qualified_sales_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  bonus_rate DECIMAL(5,4) DEFAULT 0.05,
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'paid', 'not_qualified')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for agent bonus lookups
CREATE INDEX IF NOT EXISTS idx_performance_bonuses_agent
  ON agent_performance_bonuses(agent_id);
CREATE INDEX IF NOT EXISTS idx_performance_bonuses_period
  ON agent_performance_bonuses(period_start, period_end);

-- Create commission configuration table
CREATE TABLE IF NOT EXISTS commission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(50) NOT NULL UNIQUE,
  config_value VARCHAR(255) NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert v6.1 commission configuration
INSERT INTO commission_config (config_key, config_value, description) VALUES
  ('crm_upfront_rate', '0.50', 'Upfront commission rate for CRM products (50%)'),
  ('other_upfront_rate', '0.40', 'Upfront commission rate for non-CRM products (40%)'),
  ('recurring_rate', '0.15', 'Recurring commission rate for all products (15%)'),
  ('upfront_qualification_days', '30', 'Days before upfront commission qualifies'),
  ('recurring_qualification_days', '60', 'Days before recurring commission qualifies'),
  ('monthly_bonus_rate', '0.05', 'Monthly performance bonus rate (5%)'),
  ('monthly_bonus_min_sales', '10', 'Minimum qualified sales for monthly bonus'),
  ('yearly_bonus_rate', '0.05', 'Yearly performance bonus rate (5%)'),
  ('yearly_cutoff_month', '10', 'Yearly bonus cutoff month (October)'),
  ('yearly_cutoff_day', '15', 'Yearly bonus cutoff day'),
  ('yearly_payout_month', '11', 'Yearly bonus payout month (November)'),
  ('yearly_payout_day', '1', 'Yearly bonus payout day'),
  ('payout_day', '15', 'Commission payout day of month')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Function to check if a plan is a CRM product (gets 50% upfront)
CREATE OR REPLACE FUNCTION is_crm_product(plan_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN plan_id LIKE 'crm_%' OR plan_id LIKE 'blue_%';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get upfront commission rate for a plan
CREATE OR REPLACE FUNCTION get_upfront_rate(plan_id VARCHAR)
RETURNS DECIMAL AS $$
BEGIN
  IF is_crm_product(plan_id) THEN
    RETURN 0.50;
  ELSE
    RETURN 0.40;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate upfront commission
CREATE OR REPLACE FUNCTION calculate_upfront_commission(
  setup_fee DECIMAL,
  first_month DECIMAL,
  plan_id VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
  rate DECIMAL;
BEGIN
  rate := get_upfront_rate(plan_id);
  RETURN ROUND((setup_fee + first_month) * rate, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate monthly bonus eligibility
CREATE OR REPLACE FUNCTION calculate_monthly_bonus(
  agent_uuid UUID,
  period_month DATE
)
RETURNS TABLE (
  qualified BOOLEAN,
  sales_count INTEGER,
  total_revenue DECIMAL,
  bonus_amount DECIMAL
) AS $$
DECLARE
  min_sales INTEGER;
  bonus_rate DECIMAL;
BEGIN
  SELECT config_value::INTEGER INTO min_sales
    FROM commission_config WHERE config_key = 'monthly_bonus_min_sales';
  SELECT config_value::DECIMAL INTO bonus_rate
    FROM commission_config WHERE config_key = 'monthly_bonus_rate';

  RETURN QUERY
  SELECT
    COUNT(*) >= min_sales AS qualified,
    COUNT(*)::INTEGER AS sales_count,
    COALESCE(SUM(amount), 0) AS total_revenue,
    CASE
      WHEN COUNT(*) >= min_sales THEN ROUND(COALESCE(SUM(amount), 0) * bonus_rate, 2)
      ELSE 0
    END AS bonus_amount
  FROM commissions
  WHERE agent_id = agent_uuid
    AND status = 'qualified'
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', period_month);
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_locations_updated_at
  BEFORE UPDATE ON subscription_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_bonuses_updated_at
  BEFORE UPDATE ON agent_performance_bonuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for subscription_locations
ALTER TABLE subscription_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their locations"
  ON subscription_locations FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all locations"
  ON subscription_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for agent_performance_bonuses
ALTER TABLE agent_performance_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own bonuses"
  ON agent_performance_bonuses FOR SELECT
  USING (agent_id IN (
    SELECT id FROM agents WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all bonuses"
  ON agent_performance_bonuses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Comments for documentation
COMMENT ON TABLE subscription_locations IS 'v6.1: Tracks extra web/SEO locations for enterprise plans';
COMMENT ON TABLE agent_performance_bonuses IS 'v6.1: Monthly and yearly performance bonus tracking';
COMMENT ON TABLE commission_config IS 'v6.1: Configurable commission rates and qualification periods';
COMMENT ON COLUMN subscriptions.bundle_id IS 'v6.1: Gold bundle plan ID if this is a bundle subscription';
COMMENT ON COLUMN subscriptions.is_bundle IS 'v6.1: True if this subscription is a Gold bundle';
COMMENT ON COLUMN commissions.qualification_days IS 'v6.1: Days until this commission qualifies (30 upfront, 60 recurring)';
