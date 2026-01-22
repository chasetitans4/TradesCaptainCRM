-- =====================================================
-- COMMISSION TRACKER MIGRATION
-- Version: 5.8.1 - Real-Time Commission Tracking Dashboard
-- =====================================================

-- Agent Commissions Table (individual commission records)
CREATE TABLE IF NOT EXISTS agent_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  customer_id UUID NOT NULL,
  subscription_id UUID,

  -- Commission details
  commission_type VARCHAR(50) NOT NULL,  -- 'upfront', 'recurring', 'bonus_m3', 'bonus_m4', 'bonus_m6', 'bonus_m12', 'annual', 'upgrade_upfront', 'upgrade_recurring'
  amount_cents INTEGER NOT NULL,

  -- Rate tracking
  rate_applied DECIMAL(5,2),  -- 10.00 or 15.00 for recurring
  plan_price_cents INTEGER,
  plan_type VARCHAR(50),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'paid', 'clawed_back', 'paused'

  -- Dates
  earned_date DATE NOT NULL,  -- When commission was earned
  eligible_date DATE,  -- When commission becomes payable (after M2)
  paid_date DATE,  -- When actually paid

  -- Clawback tracking
  clawback_eligible_until DATE,  -- Date clawback protection expires
  clawback_reason TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Goals Table
CREATE TABLE IF NOT EXISTS agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  period_type VARCHAR(20) NOT NULL,  -- 'monthly', 'quarterly', 'annual'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  goal_amount_cents INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Commission Status Table (tracks per-customer commission state)
CREATE TABLE IF NOT EXISTS customer_commission_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE NOT NULL,
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  subscription_id UUID,
  customer_name VARCHAR(255) NOT NULL,

  -- Plan info
  plan_type VARCHAR(50) NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  plan_price_cents INTEGER NOT NULL,
  billing_period VARCHAR(20) DEFAULT 'monthly',

  -- Current status
  current_month INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  rate_locked_at_15 BOOLEAN DEFAULT false,
  rate_lock_date DATE,

  -- Touchpoint tracking
  m3_checkin_completed BOOLEAN DEFAULT false,
  m3_checkin_date DATE,
  m6_review_completed BOOLEAN DEFAULT false,
  m6_review_date DATE,
  m9_growth_completed BOOLEAN DEFAULT false,
  m9_growth_date DATE,
  m11_renewal_completed BOOLEAN DEFAULT false,
  m11_renewal_date DATE,

  -- Pause tracking
  recurring_paused BOOLEAN DEFAULT false,
  paused_reason TEXT,
  paused_since DATE,

  -- Clawback risk
  risk_score INTEGER DEFAULT 0,  -- 0-100
  last_login DATE,
  has_open_support_ticket BOOLEAN DEFAULT false,
  risk_reasons TEXT[],

  -- Totals (cached for performance)
  total_earned_cents INTEGER DEFAULT 0,
  total_pending_cents INTEGER DEFAULT 0,
  total_paid_cents INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commission Payouts Table (tracks actual payments to agents)
CREATE TABLE IF NOT EXISTS commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  payout_date DATE NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  commission_ids UUID[] NOT NULL,  -- Array of agent_commissions.id included
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent ON agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_customer ON agent_commissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_status ON agent_commissions(status);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_earned ON agent_commissions(earned_date);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_type ON agent_commissions(commission_type);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_eligible ON agent_commissions(eligible_date);

CREATE INDEX IF NOT EXISTS idx_agent_goals_agent ON agent_goals(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_goals_period ON agent_goals(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_customer_commission_status_agent ON customer_commission_status(agent_id);
CREATE INDEX IF NOT EXISTS idx_customer_commission_status_month ON customer_commission_status(current_month);
CREATE INDEX IF NOT EXISTS idx_customer_commission_status_risk ON customer_commission_status(risk_score);

CREATE INDEX IF NOT EXISTS idx_commission_payouts_agent ON commission_payouts(agent_id);
CREATE INDEX IF NOT EXISTS idx_commission_payouts_date ON commission_payouts(payout_date);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_commission_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_commissions_timestamp
  BEFORE UPDATE ON agent_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_timestamp();

CREATE TRIGGER update_customer_commission_status_timestamp
  BEFORE UPDATE ON customer_commission_status
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_timestamp();

CREATE TRIGGER update_agent_goals_timestamp
  BEFORE UPDATE ON agent_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_timestamp();

-- RLS Policies
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_commission_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;

-- Agents can only see their own commissions
CREATE POLICY agent_commissions_agent_access ON agent_commissions
  FOR ALL USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY agent_goals_agent_access ON agent_goals
  FOR ALL USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY customer_commission_status_agent_access ON customer_commission_status
  FOR ALL USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY commission_payouts_agent_access ON commission_payouts
  FOR ALL USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Sample data for development
DO $$
DECLARE
  agent_uuid UUID;
BEGIN
  SELECT id INTO agent_uuid FROM admin_users WHERE role = 'agent' LIMIT 1;
  IF agent_uuid IS NOT NULL THEN
    INSERT INTO customer_commission_status (
      customer_id, agent_id, customer_name, plan_type, plan_name, plan_price_cents,
      current_month, start_date, rate_locked_at_15, rate_lock_date,
      m3_checkin_completed, m3_checkin_date, m6_review_completed, m6_review_date,
      risk_score, last_login
    ) VALUES
      (gen_random_uuid(), agent_uuid, 'Premier Plumbing', 'gold_pro', 'Gold Pro', 39900,
       11, '2025-01-28', true, '2025-06-28',
       true, '2025-04-28', true, '2025-06-28',
       5, CURRENT_DATE - INTERVAL '2 days'),
      (gen_random_uuid(), agent_uuid, 'Johnson Plumbing', 'gold_pro', 'Gold Pro', 39900,
       5, '2025-07-15', false, NULL,
       true, '2025-10-15', false, NULL,
       10, CURRENT_DATE - INTERVAL '3 days'),
      (gen_random_uuid(), agent_uuid, 'ABC Contractors', 'silver_pro', 'Silver Pro', 34900,
       3, '2025-09-20', false, NULL,
       false, NULL, false, NULL,
       75, CURRENT_DATE - INTERVAL '16 days'),
      (gen_random_uuid(), agent_uuid, 'Quick Rooter', 'gold_starter', 'Gold Starter', 24900,
       1, '2025-12-01', false, NULL,
       false, NULL, false, NULL,
       0, CURRENT_DATE - INTERVAL '1 day')
    ON CONFLICT (customer_id) DO NOTHING;
  END IF;
END $$;

-- Insert sample commissions for Premier Plumbing
DO $$
DECLARE
  premier_customer_id UUID;
  agent_uuid UUID;
BEGIN
  SELECT customer_id, agent_id INTO premier_customer_id, agent_uuid
  FROM customer_commission_status
  WHERE customer_name = 'Premier Plumbing'
  LIMIT 1;

  IF premier_customer_id IS NOT NULL THEN
    -- Upfront commission (paid after M2)
    INSERT INTO agent_commissions (agent_id, customer_id, commission_type, amount_cents, plan_price_cents, plan_type, status, earned_date, eligible_date, paid_date)
    VALUES (agent_uuid, premier_customer_id, 'upfront', 19950, 39900, 'gold_pro', 'paid', '2025-01-28', '2025-03-28', '2025-03-28');

    -- Month 3 bonus
    INSERT INTO agent_commissions (agent_id, customer_id, commission_type, amount_cents, status, earned_date, paid_date)
    VALUES (agent_uuid, premier_customer_id, 'bonus_m3', 1500, 'paid', '2025-04-28', '2025-04-28');

    -- Month 3-5 recurring at 10%
    INSERT INTO agent_commissions (agent_id, customer_id, commission_type, amount_cents, rate_applied, plan_price_cents, status, earned_date, paid_date)
    VALUES
      (agent_uuid, premier_customer_id, 'recurring', 3990, 10.00, 39900, 'paid', '2025-04-28', '2025-04-28'),
      (agent_uuid, premier_customer_id, 'recurring', 3990, 10.00, 39900, 'paid', '2025-05-28', '2025-05-28'),
      (agent_uuid, premier_customer_id, 'recurring', 3990, 10.00, 39900, 'paid', '2025-06-28', '2025-06-28');

    -- Month 4 bonus
    INSERT INTO agent_commissions (agent_id, customer_id, commission_type, amount_cents, status, earned_date, paid_date)
    VALUES (agent_uuid, premier_customer_id, 'bonus_m4', 2500, 'paid', '2025-05-28', '2025-05-28');

    -- Month 6 bonus
    INSERT INTO agent_commissions (agent_id, customer_id, commission_type, amount_cents, status, earned_date, paid_date)
    VALUES (agent_uuid, premier_customer_id, 'bonus_m6', 5000, 'paid', '2025-07-28', '2025-07-28');

    -- Month 6-10 recurring at 15%
    INSERT INTO agent_commissions (agent_id, customer_id, commission_type, amount_cents, rate_applied, plan_price_cents, status, earned_date, paid_date)
    VALUES
      (agent_uuid, premier_customer_id, 'recurring', 5985, 15.00, 39900, 'paid', '2025-07-28', '2025-07-28'),
      (agent_uuid, premier_customer_id, 'recurring', 5985, 15.00, 39900, 'paid', '2025-08-28', '2025-08-28'),
      (agent_uuid, premier_customer_id, 'recurring', 5985, 15.00, 39900, 'paid', '2025-09-28', '2025-09-28'),
      (agent_uuid, premier_customer_id, 'recurring', 5985, 15.00, 39900, 'paid', '2025-10-28', '2025-10-28'),
      (agent_uuid, premier_customer_id, 'recurring', 5985, 15.00, 39900, 'paid', '2025-11-28', '2025-11-28');

    -- Month 11 recurring (pending)
    INSERT INTO agent_commissions (agent_id, customer_id, commission_type, amount_cents, rate_applied, plan_price_cents, status, earned_date, eligible_date)
    VALUES (agent_uuid, premier_customer_id, 'recurring', 5985, 15.00, 39900, 'pending', '2025-12-28', '2025-12-28');

    -- Month 12 bonus (pending)
    INSERT INTO agent_commissions (agent_id, customer_id, commission_type, amount_cents, status, earned_date, eligible_date)
    VALUES (agent_uuid, premier_customer_id, 'bonus_m12', 10000, 'pending', '2025-12-28', '2025-12-28');
  END IF;
END $$;

-- Insert sample goals
INSERT INTO agent_goals (agent_id, period_type, period_start, period_end, revenue_goal)
SELECT
  id,
  'monthly',
  DATE_TRUNC('month', CURRENT_DATE)::DATE,
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
  10000.00  -- $10,000 monthly goal
FROM admin_users WHERE role = 'agent' LIMIT 1
ON CONFLICT DO NOTHING;

COMMENT ON TABLE agent_commissions IS 'Individual commission records for each earning event';
COMMENT ON TABLE agent_goals IS 'Agent performance goals by period';
COMMENT ON TABLE customer_commission_status IS 'Per-customer commission tracking state';
COMMENT ON TABLE commission_payouts IS 'Actual payment records to agents';
