-- =====================================================
-- GROWTH FEATURES SCHEMA
-- Migration: 006_growth_features.sql
-- Features: Memberships, Referrals, Promotions, Lead Scoring, CLV
-- =====================================================

-- =============================================
-- MEMBERSHIP / SERVICE PLANS
-- =============================================

-- Plan definitions
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  billing_interval TEXT NOT NULL, -- 'monthly', 'quarterly', 'annual'

  -- Benefits
  benefits JSONB, -- Array of benefit strings
  discount_percentage DECIMAL(5,2) DEFAULT 0, -- % off services
  priority_scheduling BOOLEAN DEFAULT false,
  free_inspections INTEGER DEFAULT 0, -- Per year
  free_emergency_calls INTEGER DEFAULT 0, -- Per year

  -- Settings
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Stripe
  stripe_product_id TEXT,
  stripe_price_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_plans_business ON membership_plans(business_id, is_active);

-- Customer memberships
CREATE TABLE IF NOT EXISTS customer_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'expired'

  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Usage tracking
  inspections_used INTEGER DEFAULT 0,
  emergency_calls_used INTEGER DEFAULT 0,

  -- Stripe
  stripe_subscription_id TEXT,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_customer ON customer_memberships(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_business ON customer_memberships(business_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_renewal ON customer_memberships(current_period_end)
  WHERE status = 'active';

-- Membership payment history
CREATE TABLE IF NOT EXISTS membership_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES customer_memberships(id) ON DELETE CASCADE,

  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL, -- 'succeeded', 'failed', 'refunded'

  -- Stripe
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_payments_membership ON membership_payments(membership_id);

-- =============================================
-- REFERRAL PROGRAM
-- =============================================

-- Referral program settings
CREATE TABLE IF NOT EXISTS referral_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,

  is_enabled BOOLEAN DEFAULT true,

  -- Rewards
  referrer_reward_type TEXT DEFAULT 'credit', -- 'credit', 'cash', 'discount', 'gift_card'
  referrer_reward_amount DECIMAL(10,2) DEFAULT 50,
  referee_reward_type TEXT DEFAULT 'discount', -- Reward for new customer
  referee_reward_amount DECIMAL(10,2) DEFAULT 25,

  -- Requirements
  minimum_job_value DECIMAL(10,2) DEFAULT 0, -- Minimum job value to qualify
  require_job_completion BOOLEAN DEFAULT true,

  -- Limits
  max_referrals_per_customer INTEGER, -- NULL = unlimited
  reward_expiry_days INTEGER DEFAULT 365,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral codes
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  code TEXT NOT NULL, -- e.g., "JOHN50"

  -- Stats
  times_used INTEGER DEFAULT 0,
  total_value_generated DECIMAL(10,2) DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, code)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(business_id, code, is_active);
CREATE INDEX IF NOT EXISTS idx_referral_codes_customer ON referral_codes(customer_id);

-- Referral tracking
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Who referred
  referrer_customer_id UUID NOT NULL REFERENCES customers(id),
  referral_code_id UUID REFERENCES referral_codes(id),

  -- Who was referred
  referee_customer_id UUID REFERENCES customers(id),
  referee_name TEXT,
  referee_email TEXT,
  referee_phone TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'converted', 'rewarded', 'expired', 'invalid'

  -- Conversion
  converted_at TIMESTAMPTZ,
  converted_job_id UUID REFERENCES jobs(id),
  job_value DECIMAL(10,2),

  -- Rewards
  referrer_reward_amount DECIMAL(10,2),
  referrer_reward_status TEXT, -- 'pending', 'issued', 'redeemed', 'expired'
  referrer_reward_issued_at TIMESTAMPTZ,

  referee_reward_amount DECIMAL(10,2),
  referee_reward_status TEXT,

  -- Source
  source TEXT, -- 'link', 'code', 'manual'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_customer_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_business ON referrals(business_id, status, created_at DESC);

-- Customer credits/rewards balance
CREATE TABLE IF NOT EXISTS customer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Balance
  balance DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_id, business_id)
);

-- Credit transactions
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  amount DECIMAL(10,2) NOT NULL, -- Positive = credit, negative = debit
  balance_after DECIMAL(10,2) NOT NULL,

  transaction_type TEXT NOT NULL, -- 'referral_reward', 'manual', 'redemption', 'expiry'
  description TEXT,

  -- Related entities
  referral_id UUID REFERENCES referrals(id),
  invoice_id UUID REFERENCES invoices(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer ON credit_transactions(customer_id, created_at DESC);

-- =============================================
-- PROMOTIONS & COUPONS
-- =============================================

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Code
  code TEXT NOT NULL,

  -- Discount type
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed', 'free_service'
  discount_value DECIMAL(10,2) NOT NULL,

  -- Limits
  max_uses INTEGER, -- NULL = unlimited
  max_uses_per_customer INTEGER DEFAULT 1,
  times_used INTEGER DEFAULT 0,

  -- Requirements
  minimum_order_value DECIMAL(10,2) DEFAULT 0,
  applicable_services TEXT[], -- Job types, NULL = all
  new_customers_only BOOLEAN DEFAULT false,

  -- Validity
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, code)
);

CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(business_id, code, is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(business_id, is_active, starts_at, expires_at);

-- Promotion usage tracking
CREATE TABLE IF NOT EXISTS promotion_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),

  -- Application
  invoice_id UUID REFERENCES invoices(id),
  job_id UUID REFERENCES jobs(id),

  discount_amount DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_uses_promotion ON promotion_uses(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_uses_customer ON promotion_uses(customer_id, promotion_id);

-- =============================================
-- LEAD SCORING
-- =============================================

-- Lead scoring rules
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Condition
  condition_type TEXT NOT NULL,
  -- 'source', 'service_type', 'budget', 'property_type', 'urgency',
  -- 'engagement', 'location', 'time_to_respond', 'custom_field'

  condition_operator TEXT NOT NULL, -- 'equals', 'contains', 'greater_than', 'less_than'
  condition_value TEXT NOT NULL,

  -- Score adjustment
  score_adjustment INTEGER NOT NULL, -- Can be positive or negative

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_business ON lead_scoring_rules(business_id, is_active);

-- Add score to leads table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'score') THEN
    ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'score_breakdown') THEN
    ALTER TABLE leads ADD COLUMN score_breakdown JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_scored_at') THEN
    ALTER TABLE leads ADD COLUMN last_scored_at TIMESTAMPTZ;
  END IF;
END $$;

-- Lead engagement tracking
CREATE TABLE IF NOT EXISTS lead_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  engagement_type TEXT NOT NULL,
  -- 'email_opened', 'email_clicked', 'sms_replied', 'quote_viewed',
  -- 'website_visit', 'call_answered', 'form_submitted'

  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_engagement_lead ON lead_engagement(lead_id, created_at DESC);

-- =============================================
-- CUSTOMER LIFETIME VALUE
-- =============================================

-- Add CLV fields to customers (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'lifetime_value') THEN
    ALTER TABLE customers ADD COLUMN lifetime_value DECIMAL(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'predicted_clv') THEN
    ALTER TABLE customers ADD COLUMN predicted_clv DECIMAL(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'clv_segment') THEN
    ALTER TABLE customers ADD COLUMN clv_segment TEXT; -- 'high', 'medium', 'low', 'at_risk'
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'first_job_date') THEN
    ALTER TABLE customers ADD COLUMN first_job_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_job_date') THEN
    ALTER TABLE customers ADD COLUMN last_job_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_jobs') THEN
    ALTER TABLE customers ADD COLUMN total_jobs INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'average_job_value') THEN
    ALTER TABLE customers ADD COLUMN average_job_value DECIMAL(10,2);
  END IF;
END $$;

-- Add stripe_customer_id to customers if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE customers ADD COLUMN stripe_customer_id TEXT;
  END IF;
END $$;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_engagement ENABLE ROW LEVEL SECURITY;

-- Business users policies
CREATE POLICY "Business users manage membership plans" ON membership_plans
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage customer memberships" ON customer_memberships
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users view membership payments" ON membership_payments
  FOR ALL USING (membership_id IN (
    SELECT id FROM customer_memberships WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Business users manage referral settings" ON referral_settings
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage referral codes" ON referral_codes
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage referrals" ON referrals
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage customer credits" ON customer_credits
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users view credit transactions" ON credit_transactions
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users manage promotions" ON promotions
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users view promotion uses" ON promotion_uses
  FOR ALL USING (promotion_id IN (
    SELECT id FROM promotions WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  ));

CREATE POLICY "Business users manage lead scoring rules" ON lead_scoring_rules
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Business users view lead engagement" ON lead_engagement
  FOR ALL USING (lead_id IN (
    SELECT id FROM leads WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  ));

-- Service role full access
CREATE POLICY "Service role full access membership_plans" ON membership_plans
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access customer_memberships" ON customer_memberships
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access membership_payments" ON membership_payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access referral_settings" ON referral_settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access referral_codes" ON referral_codes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access referrals" ON referrals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access customer_credits" ON customer_credits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access credit_transactions" ON credit_transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access promotions" ON promotions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access promotion_uses" ON promotion_uses
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access lead_scoring_rules" ON lead_scoring_rules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access lead_engagement" ON lead_engagement
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_growth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_growth_updated_at();

CREATE TRIGGER trigger_customer_memberships_updated_at
  BEFORE UPDATE ON customer_memberships
  FOR EACH ROW EXECUTE FUNCTION update_growth_updated_at();

CREATE TRIGGER trigger_referral_settings_updated_at
  BEFORE UPDATE ON referral_settings
  FOR EACH ROW EXECUTE FUNCTION update_growth_updated_at();

CREATE TRIGGER trigger_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_growth_updated_at();

CREATE TRIGGER trigger_customer_credits_updated_at
  BEFORE UPDATE ON customer_credits
  FOR EACH ROW EXECUTE FUNCTION update_growth_updated_at();

CREATE TRIGGER trigger_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION update_growth_updated_at();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to increment promotion uses
CREATE OR REPLACE FUNCTION increment_promotion_uses(p_promotion_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE promotions
  SET times_used = times_used + 1
  WHERE id = p_promotion_id;
END;
$$ LANGUAGE plpgsql;
