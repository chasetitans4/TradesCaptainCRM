-- =====================================================
-- TRADESCAPTAIN ADMIN PORTAL SCHEMA
-- Manages accounts, agents, commissions, leads, billing
-- =====================================================

-- =====================================================
-- ADMIN USERS (Sales agents and admin staff)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'agent',
  -- Roles: 'super_admin', 'admin', 'agent', 'support', 'finance'

  status TEXT DEFAULT 'active',
  -- Status: 'active', 'inactive', 'suspended'

  -- For agents
  hire_date DATE,
  commission_rate DECIMAL(5,4) DEFAULT 0.10,

  -- Auth
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- =====================================================
-- CRM ACCOUNTS (TradesCaptain CRM customers)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to existing businesses table
  business_id UUID REFERENCES businesses(id),

  -- Business info (denormalized for admin views)
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Plan info
  plan_type TEXT NOT NULL,
  -- 'blue_starter', 'blue_pro', 'blue_enterprise',
  -- 'blue_starter_teams', 'blue_pro_teams', 'blue_enterprise_teams',
  -- 'gold_starter', 'gold_pro', 'gold_enterprise',
  -- 'gold_starter_teams', 'gold_pro_teams', 'gold_enterprise_teams',
  -- 'gold_custom'

  plan_tier TEXT NOT NULL DEFAULT 'individual',
  -- 'individual', 'teams'

  billing_interval TEXT NOT NULL DEFAULT 'month',
  -- 'month', 'year'

  monthly_amount DECIMAL(10,2) NOT NULL,
  user_limit INTEGER DEFAULT 1,

  -- Plan versioning
  plan_version TEXT DEFAULT '2024-12',

  -- Status
  status TEXT DEFAULT 'active',
  -- 'trial', 'active', 'past_due', 'cancelled', 'suspended'

  -- Trial tracking
  is_trial BOOLEAN DEFAULT FALSE,
  trial_ends_at TIMESTAMPTZ,

  -- Promo tracking
  promo_type TEXT,
  -- 'self_serve_trial', 'free_with_web', NULL
  promo_ends_at TIMESTAMPTZ,
  web_customer_id UUID,
  coupon_id UUID,

  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Attribution
  agent_id UUID REFERENCES admin_users(id),
  lead_id UUID,
  signup_source TEXT,
  -- 'self_serve', 'agent', 'referral'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_accounts_email ON crm_accounts(email);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_status ON crm_accounts(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_accounts_agent ON crm_accounts(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_stripe ON crm_accounts(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_business ON crm_accounts(business_id);

-- =====================================================
-- WEB CUSTOMERS (Website-only customers)
-- =====================================================
CREATE TABLE IF NOT EXISTS web_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business info
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Plan info
  plan_type TEXT NOT NULL,
  -- 'web_starter', 'web_pro', 'web_enterprise', 'web_full_custom'

  billing_interval TEXT NOT NULL DEFAULT 'month',
  monthly_amount DECIMAL(10,2) NOT NULL,

  plan_version TEXT DEFAULT '2024-12',

  -- For Full Custom
  custom_quote_amount DECIMAL(10,2),
  custom_quote_notes TEXT,

  -- Status
  status TEXT DEFAULT 'active',
  -- 'active', 'past_due', 'cancelled', 'suspended'

  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Attribution
  agent_id UUID REFERENCES admin_users(id),
  lead_id UUID,

  -- CRM promo
  crm_coupon_issued BOOLEAN DEFAULT FALSE,
  crm_coupon_id UUID,

  -- Extra locations
  extra_locations INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,

  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_web_customers_email ON web_customers(email);
CREATE INDEX IF NOT EXISTS idx_web_customers_status ON web_customers(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_web_customers_agent ON web_customers(agent_id);

-- Add foreign key for web_customer_id in crm_accounts
ALTER TABLE crm_accounts
  ADD CONSTRAINT fk_crm_accounts_web_customer
  FOREIGN KEY (web_customer_id) REFERENCES web_customers(id);

-- =====================================================
-- CRM COUPONS (Free CRM with Web plan)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  -- Format: WEBPRO-SMITHP-2024-X7K2

  -- Web plan link
  web_customer_id UUID REFERENCES web_customers(id) NOT NULL,
  web_plan_type TEXT NOT NULL,

  -- Coupon details
  crm_plan TEXT DEFAULT 'blue_starter',
  free_months INTEGER DEFAULT 12,

  -- Status
  status TEXT DEFAULT 'active',
  -- 'active', 'redeemed', 'expired', 'revoked'

  redeemed_at TIMESTAMPTZ,
  redeemed_by_account_id UUID REFERENCES crm_accounts(id),

  expires_at TIMESTAMPTZ,

  -- Tracking
  created_by_agent_id UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_coupons_code ON crm_coupons(code);
CREATE INDEX IF NOT EXISTS idx_crm_coupons_status ON crm_coupons(status);
CREATE INDEX IF NOT EXISTS idx_crm_coupons_web_customer ON crm_coupons(web_customer_id);

-- Add foreign key for coupon_id in crm_accounts
ALTER TABLE crm_accounts
  ADD CONSTRAINT fk_crm_accounts_coupon
  FOREIGN KEY (coupon_id) REFERENCES crm_coupons(id);

-- =====================================================
-- LEADS
-- =====================================================
CREATE TABLE IF NOT EXISTS tc_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Assignment
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES admin_users(id),

  -- Contact info
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Business info
  trade_type TEXT,
  employee_count TEXT,
  current_website TEXT,
  current_crm TEXT,

  -- Lead info
  source TEXT DEFAULT 'manual',
  -- 'manual', 'batch_upload', 'website_form', 'referral', 'transfer'
  source_details TEXT,

  status TEXT DEFAULT 'new',
  -- 'new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost', 'unqualified', 'dormant'

  -- Interest
  interested_in TEXT[],
  -- ['crm', 'website', 'bundle']
  preferred_plan TEXT,
  estimated_value DECIMAL(10,2),

  -- Tracking
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  contact_count INTEGER DEFAULT 0,

  -- Conversion
  converted_at TIMESTAMPTZ,
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),

  -- Notes
  notes TEXT,

  -- Batch upload tracking
  batch_upload_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Add lead_id foreign keys
ALTER TABLE crm_accounts
  ADD CONSTRAINT fk_crm_accounts_lead
  FOREIGN KEY (lead_id) REFERENCES tc_leads(id);

ALTER TABLE web_customers
  ADD CONSTRAINT fk_web_customers_lead
  FOREIGN KEY (lead_id) REFERENCES tc_leads(id);

-- ROW LEVEL SECURITY: Agents can only see their own leads
ALTER TABLE tc_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY tc_leads_agent_policy ON tc_leads
  FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      agent_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin', 'support', 'finance')
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_tc_leads_agent ON tc_leads(agent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tc_leads_status ON tc_leads(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tc_leads_created ON tc_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_tc_leads_batch ON tc_leads(batch_upload_id);

-- =====================================================
-- LEAD ACTIVITIES
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES tc_leads(id) NOT NULL,
  agent_id UUID REFERENCES admin_users(id) NOT NULL,

  activity_type TEXT NOT NULL,
  -- 'created', 'called', 'emailed', 'texted', 'met', 'proposal_sent',
  -- 'status_changed', 'note_added', 'reassigned', 'converted'

  description TEXT,

  -- For status changes
  old_status TEXT,
  new_status TEXT,

  -- For reassignments
  old_agent_id UUID REFERENCES admin_users(id),
  new_agent_id UUID REFERENCES admin_users(id),
  reassigned_by UUID REFERENCES admin_users(id),
  reassignment_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_activities_policy ON lead_activities
  FOR ALL
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'support', 'finance')
    )
  );

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);

-- =====================================================
-- LEAD REASSIGNMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES tc_leads(id) NOT NULL,

  from_agent_id UUID REFERENCES admin_users(id),
  to_agent_id UUID REFERENCES admin_users(id) NOT NULL,
  reassigned_by UUID REFERENCES admin_users(id) NOT NULL,

  reason TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reassignments_lead ON lead_reassignments(lead_id);

-- =====================================================
-- LEAD BATCH UPLOADS
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_batch_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  uploaded_by UUID REFERENCES admin_users(id) NOT NULL,

  original_filename TEXT NOT NULL,
  file_size INTEGER,

  assigned_to_agent_id UUID REFERENCES admin_users(id) NOT NULL,

  total_rows INTEGER,
  successful_imports INTEGER DEFAULT 0,
  failed_imports INTEGER DEFAULT 0,
  duplicate_skipped INTEGER DEFAULT 0,

  errors JSONB,

  status TEXT DEFAULT 'processing',
  -- 'processing', 'completed', 'completed_with_errors', 'failed'

  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for batch_upload_id
ALTER TABLE tc_leads
  ADD CONSTRAINT fk_tc_leads_batch
  FOREIGN KEY (batch_upload_id) REFERENCES lead_batch_uploads(id);

CREATE INDEX IF NOT EXISTS idx_batch_uploads_agent ON lead_batch_uploads(assigned_to_agent_id);

-- =====================================================
-- PAYMENT TRACKING (for commission eligibility)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  stripe_subscription_id TEXT NOT NULL UNIQUE,

  agent_id UUID REFERENCES admin_users(id),
  plan_type TEXT,

  successful_payments INTEGER DEFAULT 0,

  -- Commission eligibility
  upfront_eligible BOOLEAN DEFAULT FALSE,
  upfront_paid BOOLEAN DEFAULT FALSE,
  recurring_eligible BOOLEAN DEFAULT FALSE,
  recurring_end_payment INTEGER,

  -- Timestamps
  first_payment_at TIMESTAMPTZ,
  second_payment_at TIMESTAMPTZ,
  third_payment_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tracking_agent ON payment_tracking(agent_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_subscription ON payment_tracking(stripe_subscription_id);

-- =====================================================
-- COMMISSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,

  -- Source
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  stripe_subscription_id TEXT,

  -- Sale details
  sale_type TEXT NOT NULL,
  -- 'blue', 'web', 'gold', 'addon', 'custom'

  plan_type TEXT NOT NULL,
  plan_tier TEXT,

  billing_interval TEXT NOT NULL,
  -- 'month', 'year', 'custom'

  sale_amount DECIMAL(10,2) NOT NULL,

  -- Commission details
  commission_type TEXT NOT NULL,
  -- 'upfront', 'recurring', 'annual_onetime', 'custom_onetime', 'retention', 'performance_bonus'

  commission_rate DECIMAL(5,4),
  commission_amount DECIMAL(10,2) NOT NULL,

  -- For recurring/retention
  payment_number INTEGER,
  retention_milestone TEXT,

  -- Status
  status TEXT DEFAULT 'pending',
  -- 'pending', 'eligible', 'approved', 'paid', 'forfeited'

  eligible_at TIMESTAMPTZ,

  -- Approval
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES admin_users(id),

  -- Payment
  paid_at TIMESTAMPTZ,
  paid_via TEXT,
  payment_reference TEXT,

  -- Forfeiture
  forfeited_at TIMESTAMPTZ,
  forfeiture_reason TEXT,

  -- Timestamps
  sale_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_agent ON commissions(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_type ON commissions(commission_type);
CREATE INDEX IF NOT EXISTS idx_commissions_eligible ON commissions(status, eligible_at);

ALTER TABLE crm_accounts ADD COLUMN IF NOT EXISTS company_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE web_customers ADD COLUMN IF NOT EXISTS company_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE commissions ADD COLUMN IF NOT EXISTS company_sale BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS sales_attribution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  attributed_to TEXT NOT NULL,
  agent_id UUID REFERENCES admin_users(id),
  created_by UUID REFERENCES admin_users(id) NOT NULL,
  sale_amount DECIMAL(10,2),
  plan_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attribution_agent ON sales_attribution_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_attribution_created_by ON sales_attribution_log(created_by);

-- =====================================================
-- COMMISSION RULES (Single Source of Truth)
-- =====================================================
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_type TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  billing_interval TEXT NOT NULL,

  -- Monthly plan commission
  upfront_amount DECIMAL(10,2),
  upfront_delay_payments INTEGER DEFAULT 2,

  recurring_rate DECIMAL(5,4) DEFAULT 0.10,
  recurring_start_payment INTEGER DEFAULT 3,
  recurring_end_payment INTEGER DEFAULT 14,

  -- Annual plan commission
  annual_rate DECIMAL(5,4) DEFAULT 0.35,
  annual_renewal_commission BOOLEAN DEFAULT FALSE,

  -- Custom quote commission
  custom_rate DECIMAL(5,4) DEFAULT 0.35,

  -- Retention bonuses
  retention_enabled BOOLEAN DEFAULT TRUE,
  month_3_call_bonus DECIMAL(10,2) DEFAULT 15,
  month_4_bonus DECIMAL(10,2) DEFAULT 25,
  month_6_bonus DECIMAL(10,2) DEFAULT 50,
  month_12_bonus DECIMAL(10,2) DEFAULT 100,

  is_active BOOLEAN DEFAULT TRUE,

  version TEXT DEFAULT '2024-12',
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(plan_type, billing_interval, version)
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_lookup ON commission_rules(plan_type, billing_interval, is_active);

-- =====================================================
-- SEED COMMISSION RULES
-- =====================================================
INSERT INTO commission_rules (plan_type, plan_tier, billing_interval, upfront_amount, retention_enabled) VALUES
-- Blue Individuals
('blue_starter', 'individual', 'month', 20, TRUE),
('blue_pro', 'individual', 'month', 50, TRUE),
('blue_enterprise', 'individual', 'month', 100, TRUE),
('blue_starter', 'individual', 'year', NULL, FALSE),
('blue_pro', 'individual', 'year', NULL, FALSE),
('blue_enterprise', 'individual', 'year', NULL, FALSE),
-- Blue Teams
('blue_starter_teams', 'teams', 'month', 75, TRUE),
('blue_pro_teams', 'teams', 'month', 100, TRUE),
('blue_enterprise_teams', 'teams', 'month', 200, TRUE),
('blue_starter_teams', 'teams', 'year', NULL, FALSE),
('blue_pro_teams', 'teams', 'year', NULL, FALSE),
('blue_enterprise_teams', 'teams', 'year', NULL, FALSE),
-- Web
('web_starter', 'individual', 'month', 50, TRUE),
('web_pro', 'individual', 'month', 100, TRUE),
('web_enterprise', 'individual', 'month', 150, TRUE),
('web_starter', 'individual', 'year', NULL, FALSE),
('web_pro', 'individual', 'year', NULL, FALSE),
('web_enterprise', 'individual', 'year', NULL, FALSE),
('web_full_custom', 'custom', 'custom', NULL, FALSE),
-- Gold Individuals
('gold_starter', 'individual', 'month', 100, TRUE),
('gold_pro', 'individual', 'month', 200, TRUE),
('gold_enterprise', 'individual', 'month', 300, TRUE),
('gold_starter', 'individual', 'year', NULL, FALSE),
('gold_pro', 'individual', 'year', NULL, FALSE),
('gold_enterprise', 'individual', 'year', NULL, FALSE),
-- Gold Teams
('gold_starter_teams', 'teams', 'month', 150, TRUE),
('gold_pro_teams', 'teams', 'month', 225, TRUE),
('gold_enterprise_teams', 'teams', 'month', 375, TRUE),
('gold_starter_teams', 'teams', 'year', NULL, FALSE),
('gold_pro_teams', 'teams', 'year', NULL, FALSE),
('gold_enterprise_teams', 'teams', 'year', NULL, FALSE),
('gold_custom', 'custom', 'custom', NULL, FALSE),
-- Add-on
('extra_location', 'addon', 'month', 75, FALSE),
('extra_location', 'addon', 'year', NULL, FALSE)
ON CONFLICT (plan_type, billing_interval, version) DO NOTHING;

-- =====================================================
-- RETENTION TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS retention_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,

  -- Milestones
  month_3_call_completed BOOLEAN DEFAULT FALSE,
  month_3_call_date TIMESTAMPTZ,
  month_3_call_notes TEXT,
  month_3_audit_sent BOOLEAN DEFAULT FALSE,
  month_3_bonus_paid BOOLEAN DEFAULT FALSE,

  month_4_retained BOOLEAN DEFAULT FALSE,
  month_4_payment_date TIMESTAMPTZ,
  month_4_bonus_paid BOOLEAN DEFAULT FALSE,

  month_6_retained BOOLEAN DEFAULT FALSE,
  month_6_payment_date TIMESTAMPTZ,
  month_6_bonus_paid BOOLEAN DEFAULT FALSE,

  month_12_retained BOOLEAN DEFAULT FALSE,
  month_12_payment_date TIMESTAMPTZ,
  month_12_bonus_paid BOOLEAN DEFAULT FALSE,

  total_retention_bonus DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(crm_account_id),
  UNIQUE(web_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_retention_agent ON retention_tracking(agent_id);
CREATE INDEX IF NOT EXISTS idx_retention_crm ON retention_tracking(crm_account_id);

-- =====================================================
-- ADMIN ACTIVITY LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  admin_user_id UUID REFERENCES admin_users(id) NOT NULL,
  action TEXT NOT NULL,

  resource_type TEXT,
  resource_id UUID,

  details JSONB,

  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_admin ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_resource ON admin_activity_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON admin_activity_log(created_at);

-- =====================================================
-- ADMIN INVOICES (tracking, actual invoices in Stripe)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  web_customer_id UUID REFERENCES web_customers(id),
  crm_account_id UUID REFERENCES crm_accounts(id),

  stripe_invoice_id TEXT UNIQUE,
  stripe_invoice_number TEXT,
  stripe_invoice_url TEXT,
  stripe_invoice_pdf TEXT,

  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  -- 'draft', 'open', 'paid', 'void', 'uncollectible'

  billing_interval TEXT,

  crm_coupon_included BOOLEAN DEFAULT FALSE,
  crm_coupon_code TEXT,

  agent_id UUID REFERENCES admin_users(id),

  due_date DATE,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_invoices_stripe ON admin_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_admin_invoices_status ON admin_invoices(status);

-- =====================================================
-- PROCESSED WEBHOOK EVENTS (Idempotency)
-- =====================================================
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  stripe_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe ON processed_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event ON processed_webhook_events(event_id);
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- AGENT GOALS
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  period_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  deal_goal INTEGER,
  revenue_goal DECIMAL(10,2),
  retention_goal DECIMAL(5,2),
  response_time_goal INTEGER,

  deal_actual INTEGER DEFAULT 0,
  revenue_actual DECIMAL(10,2) DEFAULT 0,
  retention_actual DECIMAL(5,2),
  response_time_actual INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_id, period_type, period_start)
);

-- =====================================================
-- DAILY METRICS SNAPSHOTS
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,

  mrr DECIMAL(10,2),
  arr DECIMAL(10,2),

  total_crm_accounts INTEGER,
  total_web_customers INTEGER,
  total_gold_customers INTEGER,
  active_trials INTEGER,

  new_customers INTEGER,
  churned_customers INTEGER,
  upgrades INTEGER,
  downgrades INTEGER,

  total_leads INTEGER,
  new_leads INTEGER,
  converted_leads INTEGER,

  commissions_pending DECIMAL(10,2),
  commissions_eligible DECIMAL(10,2),
  commissions_paid DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COHORT TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_month DATE NOT NULL UNIQUE,

  starting_count INTEGER,
  month_1_count INTEGER,
  month_2_count INTEGER,
  month_3_count INTEGER,
  month_6_count INTEGER,
  month_12_count INTEGER,
  current_count INTEGER,

  total_revenue DECIMAL(10,2),
  avg_ltv DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AGENT DAILY PERFORMANCE
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_daily_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  date DATE NOT NULL,

  total_leads INTEGER,
  new_leads INTEGER,
  contacted_leads INTEGER,

  deals_closed INTEGER,
  revenue_generated DECIMAL(10,2),
  avg_deal_size DECIMAL(10,2),

  close_rate DECIMAL(5,2),
  avg_response_time_minutes INTEGER,

  active_customers INTEGER,
  churned_customers INTEGER,
  retention_rate DECIMAL(5,2),

  commission_earned DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_id, date)
);

CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON agent_daily_performance(date);
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent ON agent_daily_performance(agent_id);

-- =====================================================
-- PLAN PRICING TABLE (Single Source of Truth)
-- =====================================================
CREATE TABLE IF NOT EXISTS plan_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_type TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_tier TEXT NOT NULL, -- 'individual', 'teams', 'addon', 'custom'
  category TEXT NOT NULL, -- 'crm', 'web', 'gold', 'addon'

  monthly_price DECIMAL(10,2),
  annual_price DECIMAL(10,2),

  user_limit INTEGER DEFAULT 1,

  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(plan_type)
);

-- Seed plan pricing
INSERT INTO plan_pricing (plan_type, plan_name, plan_tier, category, monthly_price, annual_price, user_limit) VALUES
-- Blue Plans - Individuals
('blue_starter', 'Blue Starter', 'individual', 'crm', 49, 441, 1),
('blue_pro', 'Blue Pro', 'individual', 'crm', 99, 891, 1),
('blue_enterprise', 'Blue Enterprise', 'individual', 'crm', 199, 1791, 1),
-- Blue Plans - Teams
('blue_starter_teams', 'Blue Starter Teams', 'teams', 'crm', 149, 1341, 5),
('blue_pro_teams', 'Blue Pro Teams', 'teams', 'crm', 199, 1791, 10),
('blue_enterprise_teams', 'Blue Enterprise Teams', 'teams', 'crm', 399, 3591, 20),
-- Web Plans
('web_starter', 'Web Starter', 'individual', 'web', 149, 1341, 1),
('web_pro', 'Web Pro', 'individual', 'web', 249, 2241, 1),
('web_enterprise', 'Web Enterprise', 'individual', 'web', 349, 3141, 1),
('web_full_custom', 'Web Full Custom', 'custom', 'web', NULL, NULL, 1),
-- Gold Plans - Individuals
('gold_starter', 'Gold Starter', 'individual', 'gold', 199, 1791, 1),
('gold_pro', 'Gold Pro', 'individual', 'gold', 349, 3141, 1),
('gold_enterprise', 'Gold Enterprise', 'individual', 'gold', 499, 4491, 1),
-- Gold Plans - Teams
('gold_starter_teams', 'Gold Starter Teams', 'teams', 'gold', 299, 2691, 5),
('gold_pro_teams', 'Gold Pro Teams', 'teams', 'gold', 449, 4041, 10),
('gold_enterprise_teams', 'Gold Enterprise Teams', 'teams', 'gold', 749, 6741, 20),
('gold_custom', 'Gold Custom', 'custom', 'gold', NULL, NULL, 1),
-- Add-on
('extra_location', 'Extra Location', 'addon', 'addon', 199, 1791, 0)
ON CONFLICT (plan_type) DO NOTHING;

-- =====================================================
-- ADMIN SESSIONS (for JWT token management)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) NOT NULL,

  token_hash TEXT NOT NULL,
  refresh_token_hash TEXT,

  ip_address TEXT,
  user_agent TEXT,

  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,

  revoked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);
