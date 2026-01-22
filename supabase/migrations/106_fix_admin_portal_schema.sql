-- ==============================================================================
-- FIX ADMIN PORTAL SCHEMA (COMMISSIONS & LEADS)
-- ==============================================================================
-- This script ensures all tables required by the Admin Portal exist.
-- Covers: Commissions, Leads, CRM Accounts, Web Customers, Rules
-- ==============================================================================

BEGIN;

-- 1. CRM ACCOUNTS (Dependency for Commissions)
CREATE TABLE IF NOT EXISTS crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  plan_type TEXT,
  plan_tier TEXT DEFAULT 'individual',
  billing_interval TEXT DEFAULT 'month',
  status TEXT DEFAULT 'active',
  agent_id UUID, -- References admin_users(id)
  stripe_subscription_id TEXT,
  company_sale BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WEB CUSTOMERS (Dependency for Commissions)
CREATE TABLE IF NOT EXISTS web_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  plan_type TEXT,
  status TEXT DEFAULT 'active',
  agent_id UUID, -- References admin_users(id)
  stripe_subscription_id TEXT,
  company_sale BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COMMISSIONS (Fixes "Failed to fetch commissions" error)
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL, -- References admin_users(id)
  
  -- Source
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  stripe_subscription_id TEXT,
  
  -- Sale details
  sale_type TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  plan_tier TEXT,
  billing_interval TEXT NOT NULL,
  sale_amount DECIMAL(10,2) NOT NULL,
  
  -- Commission details
  commission_type TEXT NOT NULL,
  commission_rate DECIMAL(5,4),
  commission_amount DECIMAL(10,2) NOT NULL,
  
  -- Recurring/Retention
  payment_number INTEGER,
  retention_milestone TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending',
  
  -- Dates
  sale_date TIMESTAMPTZ NOT NULL,
  eligible_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID, -- References admin_users(id)
  paid_at TIMESTAMPTZ,
  paid_via TEXT,
  payment_reference TEXT,
  
  -- Forfeiture
  forfeited_at TIMESTAMPTZ,
  forfeiture_reason TEXT,
  
  -- Metadata
  notes TEXT,
  company_sale BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at);

-- 4. TC LEADS (Fixes "N+1 Query" logic and Leads Page)
CREATE TABLE IF NOT EXISTS tc_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Assignment
  agent_id UUID NOT NULL, -- References admin_users(id)
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID, -- References admin_users(id)
  
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
  source_details TEXT,
  status TEXT DEFAULT 'new',
  
  -- Interest
  interested_in TEXT[],
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
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tc_leads_agent ON tc_leads(agent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tc_leads_status ON tc_leads(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tc_leads_created ON tc_leads(created_at);

-- 5. LEAD ACTIVITIES (Dependency for Lead details)
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES tc_leads(id) NOT NULL,
  agent_id UUID NOT NULL, -- References admin_users(id)
  
  activity_type TEXT NOT NULL,
  description TEXT,
  
  old_status TEXT,
  new_status TEXT,
  
  old_agent_id UUID,
  new_agent_id UUID,
  reassigned_by UUID,
  reassignment_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);

-- 6. COMMISSION RULES (Single Source of Truth)
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  
  upfront_amount DECIMAL(10,2),
  upfront_delay_payments INTEGER DEFAULT 2,
  
  recurring_rate DECIMAL(5,4) DEFAULT 0.10,
  recurring_start_payment INTEGER DEFAULT 3,
  recurring_end_payment INTEGER DEFAULT 14,
  
  annual_rate DECIMAL(5,4) DEFAULT 0.35,
  annual_renewal_commission BOOLEAN DEFAULT FALSE,
  
  custom_rate DECIMAL(5,4) DEFAULT 0.35,
  
  retention_enabled BOOLEAN DEFAULT TRUE,
  month_3_call_bonus DECIMAL(10,2) DEFAULT 15,
  month_4_bonus DECIMAL(10,2) DEFAULT 25,
  month_6_bonus DECIMAL(10,2) DEFAULT 50,
  month_12_bonus DECIMAL(10,2) DEFAULT 100,
  
  is_active BOOLEAN DEFAULT TRUE,
  version TEXT DEFAULT '2026-01',
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(plan_type, billing_interval, version)
);

-- 7. ENABLE RLS
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tc_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

-- 8. CREATE POLICIES (Idempotent)
DO $$ 
BEGIN
  -- Commissions Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'commissions' AND policyname = 'Agents see own commissions') THEN
    CREATE POLICY "Agents see own commissions" ON commissions FOR SELECT TO authenticated
    USING (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'finance')));
  END IF;

  -- Leads Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tc_leads' AND policyname = 'Agents see own leads') THEN
    CREATE POLICY "Agents see own leads" ON tc_leads FOR SELECT TO authenticated
    USING (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'manager')));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tc_leads' AND policyname = 'Agents manage own leads') THEN
    CREATE POLICY "Agents manage own leads" ON tc_leads FOR ALL TO authenticated
    USING (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'manager')));
  END IF;

  -- Rules Policies (Read Only for Agents)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'commission_rules' AND policyname = 'Authenticated read rules') THEN
    CREATE POLICY "Authenticated read rules" ON commission_rules FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

COMMIT;
