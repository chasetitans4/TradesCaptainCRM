-- ==============================================================================
-- FIX COMMISSIONS SCHEMA
-- ==============================================================================
-- This script resolves the "Failed to fetch commissions" error by:
-- 1. Ensuring the table is named 'commissions' (renaming 'agent_commissions' if needed)
-- 2. Ensuring parent tables (crm_accounts, web_customers) exist
-- 3. Setting the EXACT foreign key names expected by the application code
-- ==============================================================================

BEGIN;

-- 1. Rename agent_commissions to commissions if it exists and commissions does not
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_commissions') 
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'commissions') THEN
    ALTER TABLE agent_commissions RENAME TO commissions;
  END IF;
END $$;

-- 2. Create commissions table if it doesn't exist (fallback)
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL, -- FK added below
  crm_account_id UUID, -- FK added below
  web_customer_id UUID, -- FK added below
  
  -- Core fields
  commission_type VARCHAR(50) NOT NULL,
  amount_cents INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  
  -- Dates
  earned_date DATE NOT NULL,
  eligible_date DATE,
  paid_date DATE,
  scheduled_payout_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure parent tables exist (minimal definition to satisfy FKs if missing)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT
);

CREATE TABLE IF NOT EXISTS crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS web_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  email TEXT
);

-- 4. Fix Foreign Key Names (CRITICAL)
-- The application code specifically requests: agent:admin_users!commissions_agent_id_fkey
-- We must ensure the constraint is named exactly 'commissions_agent_id_fkey'

-- Safely drop potential old constraints using IF EXISTS
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS agent_commissions_agent_id_fkey;
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_agent_id_fkey;
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_crm_account_id_fkey;
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_web_customer_id_fkey;

-- Re-add the constraints with the REQUIRED names
ALTER TABLE commissions 
  ADD CONSTRAINT commissions_agent_id_fkey 
  FOREIGN KEY (agent_id) 
  REFERENCES admin_users(id);

ALTER TABLE commissions 
  ADD CONSTRAINT commissions_crm_account_id_fkey 
  FOREIGN KEY (crm_account_id) 
  REFERENCES crm_accounts(id);

ALTER TABLE commissions 
  ADD CONSTRAINT commissions_web_customer_id_fkey 
  FOREIGN KEY (web_customer_id) 
  REFERENCES web_customers(id);

-- 5. Add RLS Policies if missing
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all commissions') THEN
    CREATE POLICY "Admins can view all commissions" ON commissions
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE id = auth.uid() 
          AND role IN ('super_admin', 'admin', 'finance', 'manager')
        )
      );
  END IF;
END $$;

COMMIT;
