-- =====================================================
-- PLAN DETAILS PANEL MIGRATION
-- Migration: 008_plan_details_panel.sql
-- Version: 5.8.1
-- Features: Plan features, upgrade paths, sales tools
-- =====================================================

-- =====================================================
-- 1. PLAN FEATURES TABLE
-- Stores feature details for each plan type
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type VARCHAR(50) NOT NULL,  -- Matches plan_type in businesses/crm_accounts
  feature_name VARCHAR(100) NOT NULL,
  feature_description TEXT,
  feature_category VARCHAR(50) NOT NULL,  -- 'core', 'sms', 'website', 'seo', 'support', 'calendar', 'crm'
  is_included BOOLEAN NOT NULL DEFAULT false,
  display_value VARCHAR(100),  -- e.g., "1,000/mo" for SMS, "10 pages" for website
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(plan_type, feature_name)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan_type ON plan_features(plan_type);
CREATE INDEX IF NOT EXISTS idx_plan_features_category ON plan_features(plan_type, feature_category);

-- =====================================================
-- 2. PLAN UPGRADE PATHS TABLE
-- Defines valid upgrade paths between plans
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_upgrade_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_plan_type VARCHAR(50) NOT NULL,
  to_plan_type VARCHAR(50) NOT NULL,
  price_difference_cents INTEGER NOT NULL,
  is_recommended BOOLEAN DEFAULT false,
  benefits_summary TEXT,
  talking_point TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(from_plan_type, to_plan_type)
);

CREATE INDEX IF NOT EXISTS idx_upgrade_paths_from ON plan_upgrade_paths(from_plan_type);

-- =====================================================
-- 3. PLAN PRICING TABLE (compatibility with existing schema)
-- Master pricing for all plans (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL UNIQUE,
  plan_name TEXT NOT NULL,
  plan_tier TEXT NOT NULL,  -- 'individual', 'teams', 'addon', 'custom'
  category TEXT NOT NULL,   -- 'crm', 'web', 'gold', 'addon'
  monthly_price DECIMAL(10,2),
  annual_price DECIMAL(10,2),
  user_limit INTEGER DEFAULT 1,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_pricing_category ON plan_pricing(category, is_active);

-- =====================================================
-- 4. SEED PLAN PRICING DATA (skipped; pricing seeded in base schema)
-- If additional pricing entries are needed, insert with the existing columns:
-- INSERT INTO plan_pricing (plan_type, plan_name, plan_tier, category, monthly_price, annual_price, user_limit)
-- VALUES (... ) ON CONFLICT (plan_type) DO NOTHING;

-- =====================================================
-- 5. SEED PLAN FEATURES DATA
-- =====================================================

-- NeverMiss Features
INSERT INTO plan_features (plan_type, feature_name, feature_description, feature_category, is_included, display_value, display_order) VALUES
  ('nevermiss', 'NeverMiss AI SMS', 'AI-powered missed call text-back', 'sms', true, '700/mo', 1),
  ('nevermiss', 'AI Conversations', 'Intelligent lead qualification', 'sms', true, 'Unlimited', 2),
  ('nevermiss', 'Missed Call Detection', 'Automatic missed call detection', 'core', true, '✓', 3),
  ('nevermiss', 'Lead Capture', 'Automatic lead capture from SMS', 'core', true, '✓', 4),
  ('nevermiss', 'Mobile Notifications', 'Real-time alerts on your phone', 'core', true, '✓', 5),
  ('nevermiss', 'Full CRM & Database', 'Customer relationship management', 'crm', false, '✗', 6),
  ('nevermiss', 'Calendar & Scheduling', 'Online booking and scheduling', 'calendar', false, '✗', 7),
  ('nevermiss', 'Quotes & Invoicing', 'Create and send quotes/invoices', 'crm', false, '✗', 8),
  ('nevermiss', 'Professional Website', 'Custom designed website', 'website', false, '✗', 9),
  ('nevermiss', 'Local SEO', 'Citation building and SEO', 'seo', false, '✗', 10)
ON CONFLICT (plan_type, feature_name) DO NOTHING;

-- Blue Starter Features
INSERT INTO plan_features (plan_type, feature_name, feature_description, feature_category, is_included, display_value, display_order) VALUES
  ('blue_starter', 'Full CRM & Database', 'Store all customer information', 'crm', true, '✓', 1),
  ('blue_starter', 'Calendar & Scheduling', 'Book and manage jobs', 'calendar', true, '✓', 2),
  ('blue_starter', 'Job Tracking', 'Track job status and work orders', 'crm', true, '✓', 3),
  ('blue_starter', 'Quotes & Invoicing', 'Create quotes, send invoices', 'crm', true, '✓', 4),
  ('blue_starter', 'Mobile App Access', 'Access from anywhere', 'core', true, '✓', 5),
  ('blue_starter', 'Email & Phone Support', 'Standard support', 'support', true, '✓', 6),
  ('blue_starter', 'NeverMiss AI SMS', 'AI missed call text-back', 'sms', false, '✗', 7),
  ('blue_starter', 'Professional Website', 'Custom designed website', 'website', false, '✗', 8),
  ('blue_starter', 'Local SEO', 'Citation building', 'seo', false, '✗', 9),
  ('blue_starter', 'Priority Support', 'Skip the queue', 'support', false, '✗', 10)
ON CONFLICT (plan_type, feature_name) DO NOTHING;

-- Blue Pro Features
INSERT INTO plan_features (plan_type, feature_name, feature_description, feature_category, is_included, display_value, display_order) VALUES
  ('blue_pro', 'Full CRM & Database', 'Store all customer information', 'crm', true, '✓', 1),
  ('blue_pro', 'Calendar & Scheduling', 'Book and manage jobs', 'calendar', true, '✓', 2),
  ('blue_pro', 'Job Tracking', 'Track job status and work orders', 'crm', true, '✓', 3),
  ('blue_pro', 'Quotes & Invoicing', 'Create quotes, send invoices', 'crm', true, '✓', 4),
  ('blue_pro', 'NeverMiss AI SMS', 'AI missed call text-back', 'sms', true, '1,000/mo', 5),
  ('blue_pro', 'Calendar Booking via SMS', 'Book appointments via text', 'calendar', true, '✓', 6),
  ('blue_pro', 'Mobile App Access', 'Access from anywhere', 'core', true, '✓', 7),
  ('blue_pro', 'Email & Phone Support', 'Standard support', 'support', true, '✓', 8),
  ('blue_pro', 'Professional Website', 'Custom designed website', 'website', false, '✗', 9),
  ('blue_pro', 'Local SEO', 'Citation building', 'seo', false, '✗', 10),
  ('blue_pro', 'Priority Support', 'Skip the queue', 'support', false, '✗', 11)
ON CONFLICT (plan_type, feature_name) DO NOTHING;

-- Blue Enterprise Features
INSERT INTO plan_features (plan_type, feature_name, feature_description, feature_category, is_included, display_value, display_order) VALUES
  ('blue_enterprise', 'Full CRM & Database', 'Store all customer information', 'crm', true, '✓', 1),
  ('blue_enterprise', 'Calendar & Scheduling', 'Book and manage jobs', 'calendar', true, '✓', 2),
  ('blue_enterprise', 'Job Tracking', 'Track job status and work orders', 'crm', true, '✓', 3),
  ('blue_enterprise', 'Quotes & Invoicing', 'Create quotes, send invoices', 'crm', true, '✓', 4),
  ('blue_enterprise', 'NeverMiss AI SMS', 'AI missed call text-back', 'sms', true, '1,500/mo', 5),
  ('blue_enterprise', 'Calendar Booking via SMS', 'Book appointments via text', 'calendar', true, '✓', 6),
  ('blue_enterprise', 'Mobile App Access', 'Access from anywhere', 'core', true, '✓', 7),
  ('blue_enterprise', 'Priority Support', 'Skip the queue', 'support', true, '✓', 8),
  ('blue_enterprise', 'Dedicated Manager', 'Personal account manager', 'support', true, '✓', 9),
  ('blue_enterprise', 'Professional Website', 'Custom designed website', 'website', false, '✗', 10),
  ('blue_enterprise', 'Local SEO', 'Citation building', 'seo', false, '✗', 11)
ON CONFLICT (plan_type, feature_name) DO NOTHING;

-- Gold Starter Features
INSERT INTO plan_features (plan_type, feature_name, feature_description, feature_category, is_included, display_value, display_order) VALUES
  ('gold_starter', 'Full CRM & Database', 'Store all customer information', 'crm', true, '✓', 1),
  ('gold_starter', 'Calendar & Scheduling', 'Book and manage jobs', 'calendar', true, '✓', 2),
  ('gold_starter', 'Job Tracking', 'Track job status and work orders', 'crm', true, '✓', 3),
  ('gold_starter', 'Quotes & Invoicing', 'Create quotes, send invoices', 'crm', true, '✓', 4),
  ('gold_starter', 'NeverMiss AI SMS', 'AI missed call text-back', 'sms', true, '700/mo', 5),
  ('gold_starter', 'Calendar Booking via SMS', 'Book appointments via text', 'calendar', true, '✓', 6),
  ('gold_starter', 'Professional Website', 'Custom designed website', 'website', true, '5 pages', 7),
  ('gold_starter', 'Local SEO', 'Citation building', 'seo', true, '15 citations', 8),
  ('gold_starter', 'GBP Management', 'Google Business Profile', 'seo', true, '✓', 9),
  ('gold_starter', 'Mobile App Access', 'Access from anywhere', 'core', true, '✓', 10),
  ('gold_starter', 'Email & Phone Support', 'Standard support', 'support', true, '✓', 11),
  ('gold_starter', 'Priority Support', 'Skip the queue', 'support', false, '✗', 12)
ON CONFLICT (plan_type, feature_name) DO NOTHING;

-- Gold Pro Features
INSERT INTO plan_features (plan_type, feature_name, feature_description, feature_category, is_included, display_value, display_order) VALUES
  ('gold_pro', 'Full CRM & Database', 'Store all customer information', 'crm', true, '✓', 1),
  ('gold_pro', 'Calendar & Scheduling', 'Book and manage jobs', 'calendar', true, '✓', 2),
  ('gold_pro', 'Job Tracking', 'Track job status and work orders', 'crm', true, '✓', 3),
  ('gold_pro', 'Quotes & Invoicing', 'Create quotes, send invoices', 'crm', true, '✓', 4),
  ('gold_pro', 'NeverMiss AI SMS', 'AI missed call text-back', 'sms', true, '1,000/mo', 5),
  ('gold_pro', 'Calendar Booking via SMS', 'Book appointments via text', 'calendar', true, '✓', 6),
  ('gold_pro', 'Professional Website', 'Custom designed website', 'website', true, '10 pages', 7),
  ('gold_pro', 'Local SEO', 'Citation building', 'seo', true, '25 citations', 8),
  ('gold_pro', 'GBP Management', 'Google Business Profile', 'seo', true, '✓', 9),
  ('gold_pro', 'Monthly SEO Reports', 'Performance reporting', 'seo', true, '✓', 10),
  ('gold_pro', 'Mobile App Access', 'Access from anywhere', 'core', true, '✓', 11),
  ('gold_pro', 'Email & Phone Support', 'Standard support', 'support', true, '✓', 12),
  ('gold_pro', 'Priority Support', 'Skip the queue', 'support', false, '✗', 13)
ON CONFLICT (plan_type, feature_name) DO NOTHING;

-- Gold Enterprise Features
INSERT INTO plan_features (plan_type, feature_name, feature_description, feature_category, is_included, display_value, display_order) VALUES
  ('gold_enterprise', 'Full CRM & Database', 'Store all customer information', 'crm', true, '✓', 1),
  ('gold_enterprise', 'Calendar & Scheduling', 'Book and manage jobs', 'calendar', true, '✓', 2),
  ('gold_enterprise', 'Job Tracking', 'Track job status and work orders', 'crm', true, '✓', 3),
  ('gold_enterprise', 'Quotes & Invoicing', 'Create quotes, send invoices', 'crm', true, '✓', 4),
  ('gold_enterprise', 'NeverMiss AI SMS', 'AI missed call text-back', 'sms', true, '1,500/mo', 5),
  ('gold_enterprise', 'Calendar Booking via SMS', 'Book appointments via text', 'calendar', true, '✓', 6),
  ('gold_enterprise', 'Professional Website', 'Custom designed website', 'website', true, '15 pages', 7),
  ('gold_enterprise', 'Local SEO', 'Citation building', 'seo', true, '40 citations', 8),
  ('gold_enterprise', 'GBP Management', 'Google Business Profile', 'seo', true, '✓', 9),
  ('gold_enterprise', 'Monthly SEO Reports', 'Performance reporting', 'seo', true, '✓', 10),
  ('gold_enterprise', 'Mobile App Access', 'Access from anywhere', 'core', true, '✓', 11),
  ('gold_enterprise', 'Priority Support', 'Skip the queue', 'support', true, '✓', 12),
  ('gold_enterprise', 'Dedicated Manager', 'Personal account manager', 'support', true, '✓', 13)
ON CONFLICT (plan_type, feature_name) DO NOTHING;

-- =====================================================
-- 6. SEED UPGRADE PATHS
-- =====================================================

INSERT INTO plan_upgrade_paths (from_plan_type, to_plan_type, price_difference_cents, is_recommended, benefits_summary, talking_point, display_order) VALUES
  -- From NeverMiss
  ('nevermiss', 'blue_starter', 2000, false, 'Add CRM & Calendar (no AI SMS)', 'Get organized with our full CRM, but you''ll lose AI SMS. Consider Blue Pro instead for the best of both.', 1),
  ('nevermiss', 'blue_pro', 7000, true, 'Add CRM, Calendar + Keep AI SMS', 'For $70 more, get the full CRM with calendar AND keep your AI SMS. Best upgrade path.', 2),
  ('nevermiss', 'gold_starter', 22000, false, 'Complete solution: CRM + Website + SEO + AI SMS', 'Go all-in with website, SEO, CRM, and AI SMS. Everything you need in one package.', 3),

  -- From Blue Starter (no AI SMS)
  ('blue_starter', 'blue_pro', 5000, true, 'Add NeverMiss AI SMS (1,000/mo)', 'For $50 more, add AI SMS that captures leads when you miss calls. Game changer for busy contractors.', 1),
  ('blue_starter', 'blue_enterprise', 15000, false, 'Add AI SMS + Priority Support', 'Get 1,500 SMS/mo plus priority support and dedicated account manager.', 2),
  ('blue_starter', 'gold_starter', 20000, false, 'Add Website + SEO + AI SMS', 'Complete solution with professional website and local SEO.', 3),

  -- From Blue Pro
  ('blue_pro', 'blue_enterprise', 10000, false, 'Priority Support + 500 more SMS', 'Get priority support, dedicated manager, and 1,500 SMS/mo.', 1),
  ('blue_pro', 'gold_pro', 30000, true, 'Add Professional Website + Local SEO', 'For $300 more, get a professional website AND local SEO. Usually $500+ separately.', 2),
  ('blue_pro', 'gold_enterprise', 45000, false, 'Complete enterprise solution', 'Everything in Gold Pro plus priority support and dedicated manager.', 3),

  -- From Blue Enterprise
  ('blue_enterprise', 'gold_enterprise', 35000, true, 'Add Website + SEO', 'Complete your business toolkit with professional website and local SEO.', 1),

  -- From Gold Starter
  ('gold_starter', 'gold_pro', 15000, true, 'More pages, citations, +300 SMS', 'Upgrade to 10 pages, 25 citations, and 1,000 SMS/mo. Better for growing businesses.', 1),
  ('gold_starter', 'gold_enterprise', 30000, false, 'Full enterprise package', 'Maximum features with 15 pages, 40 citations, 1,500 SMS, and priority support.', 2),

  -- From Gold Pro
  ('gold_pro', 'gold_enterprise', 15000, true, 'Priority Support + More everything', 'Get priority support, dedicated manager, plus more pages, citations, and SMS.', 1)
ON CONFLICT (from_plan_type, to_plan_type) DO NOTHING;

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_upgrade_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_pricing ENABLE ROW LEVEL SECURITY;

-- Plan features are readable by everyone (public data)
CREATE POLICY "Plan features are publicly readable" ON plan_features
  FOR SELECT USING (true);

-- Plan upgrade paths are publicly readable
CREATE POLICY "Plan upgrade paths are publicly readable" ON plan_upgrade_paths
  FOR SELECT USING (true);

-- Plan pricing is publicly readable
CREATE POLICY "Plan pricing is publicly readable" ON plan_pricing
  FOR SELECT USING (true);

-- Only service role can modify
CREATE POLICY "Service role manages plan_features" ON plan_features
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages plan_upgrade_paths" ON plan_upgrade_paths
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages plan_pricing" ON plan_pricing
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify plan_features
-- SELECT plan_type, feature_name, is_included, display_value FROM plan_features ORDER BY plan_type, display_order;

-- Verify plan_upgrade_paths
-- SELECT from_plan_type, to_plan_type, price_difference_cents, is_recommended FROM plan_upgrade_paths ORDER BY from_plan_type, display_order;

-- Verify plan_pricing
-- SELECT plan_type, plan_name, plan_tier, category, monthly_price FROM plan_pricing ORDER BY plan_type;
