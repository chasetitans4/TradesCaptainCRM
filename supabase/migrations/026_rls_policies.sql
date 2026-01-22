-- =====================================================
-- TRADESCAPTAIN MINIMAL RLS POLICIES
-- Agent Data Isolation for Multi-Tenant Security
-- =====================================================
--
-- Purpose: Prevent Agent A from seeing Agent B's data
-- Scope: Critical agent-facing tables only
-- Future: Team hierarchies, client portal, multi-location
--
-- =====================================================

-- =====================================================
-- PART 1: ADMIN PORTAL TABLES - Agent Isolation
-- =====================================================

-- Enable RLS on agent-facing tables
ALTER TABLE tc_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_tracking ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TC_LEADS: Agent sees only their assigned leads
-- =====================================================
DROP POLICY IF EXISTS "Agents see own leads" ON tc_leads;
CREATE POLICY "Agents see own leads" ON tc_leads
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      agent_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin', 'support', 'finance')
      )
    )
  );

DROP POLICY IF EXISTS "Agents manage own leads" ON tc_leads;
CREATE POLICY "Agents manage own leads" ON tc_leads
  FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      agent_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
      )
    )
  );

-- =====================================================
-- CRM_ACCOUNTS: Agent sees only their attributed accounts
-- =====================================================
DROP POLICY IF EXISTS "Agents see own CRM accounts" ON crm_accounts;
CREATE POLICY "Agents see own CRM accounts" ON crm_accounts
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      agent_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin', 'support', 'finance')
      )
    )
  );

DROP POLICY IF EXISTS "Agents manage own CRM accounts" ON crm_accounts;
CREATE POLICY "Agents manage own CRM accounts" ON crm_accounts
  FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      agent_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
      )
    )
  );

-- =====================================================
-- WEB_CUSTOMERS: Agent sees only their attributed customers
-- =====================================================
DROP POLICY IF EXISTS "Agents see own web customers" ON web_customers;
CREATE POLICY "Agents see own web customers" ON web_customers
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      agent_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin', 'support', 'finance')
      )
    )
  );

DROP POLICY IF EXISTS "Agents manage own web customers" ON web_customers;
CREATE POLICY "Agents manage own web customers" ON web_customers
  FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      agent_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
      )
    )
  );

-- =====================================================
-- COMMISSIONS: Agent sees only their own commissions
-- =====================================================
DROP POLICY IF EXISTS "Agents see own commissions" ON commissions;
CREATE POLICY "Agents see own commissions" ON commissions
  FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'finance')
    )
  );

DROP POLICY IF EXISTS "Admin manage commissions" ON commissions;
CREATE POLICY "Admin manage commissions" ON commissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'finance')
    )
  );

-- =====================================================
-- LEAD_ACTIVITIES: Agent sees activities for their leads
-- =====================================================
DROP POLICY IF EXISTS "Agents see own lead activities" ON lead_activities;
CREATE POLICY "Agents see own lead activities" ON lead_activities
  FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'support', 'finance')
    )
  );

DROP POLICY IF EXISTS "Agents manage own lead activities" ON lead_activities;
CREATE POLICY "Agents manage own lead activities" ON lead_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- RETENTION_TRACKING: Agent sees their retention data
-- =====================================================
DROP POLICY IF EXISTS "Agents see own retention" ON retention_tracking;
CREATE POLICY "Agents see own retention" ON retention_tracking
  FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'finance')
    )
  );

DROP POLICY IF EXISTS "Admin manage retention" ON retention_tracking;
CREATE POLICY "Admin manage retention" ON retention_tracking
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- PAYMENT_TRACKING: Agent sees their payment tracking
-- =====================================================
DROP POLICY IF EXISTS "Agents see own payment tracking" ON payment_tracking;
CREATE POLICY "Agents see own payment tracking" ON payment_tracking
  FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'finance')
    )
  );

DROP POLICY IF EXISTS "Admin manage payment tracking" ON payment_tracking;
CREATE POLICY "Admin manage payment tracking" ON payment_tracking
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- PART 2: ADMIN-ONLY TABLES
-- =====================================================

-- Admin users table - Admin/Super Admin access only
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users view" ON admin_users;
CREATE POLICY "Admin users view" ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own record
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Super admin manage users" ON admin_users;
CREATE POLICY "Super admin manage users" ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Admin activity log - Admin only
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin view activity log" ON admin_activity_log;
CREATE POLICY "Admin view activity log" ON admin_activity_log
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own activity
    admin_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "System insert activity log" ON admin_activity_log;
CREATE POLICY "System insert activity log" ON admin_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin sessions - Users see their own
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own sessions" ON admin_sessions;
CREATE POLICY "Users see own sessions" ON admin_sessions
  FOR SELECT
  TO authenticated
  USING (admin_user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own sessions" ON admin_sessions;
CREATE POLICY "Users manage own sessions" ON admin_sessions
  FOR ALL
  TO authenticated
  USING (
    admin_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- =====================================================
-- PART 3: ADMIN PORTAL LOOKUP/CONFIG TABLES
-- =====================================================

-- Commission rules - All authenticated can read
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All read commission rules" ON commission_rules;
CREATE POLICY "All read commission rules" ON commission_rules
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin manage commission rules" ON commission_rules;
CREATE POLICY "Admin manage commission rules" ON commission_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Plan pricing - All authenticated can read
ALTER TABLE plan_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All read plan pricing" ON plan_pricing;
CREATE POLICY "All read plan pricing" ON plan_pricing
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin manage plan pricing" ON plan_pricing;
CREATE POLICY "Admin manage plan pricing" ON plan_pricing
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Agent goals - Agent sees their own
ALTER TABLE agent_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents see own goals" ON agent_goals;
CREATE POLICY "Agents see own goals" ON agent_goals
  FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admin manage goals" ON agent_goals;
CREATE POLICY "Admin manage goals" ON agent_goals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Agent daily performance - Agent sees their own
ALTER TABLE agent_daily_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents see own performance" ON agent_daily_performance;
CREATE POLICY "Agents see own performance" ON agent_daily_performance
  FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Daily metrics - Admin only
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin see daily metrics" ON daily_metrics;
CREATE POLICY "Admin see daily metrics" ON daily_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'finance')
    )
  );

-- Cohorts - Admin only
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin see cohorts" ON cohorts;
CREATE POLICY "Admin see cohorts" ON cohorts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'finance')
    )
  );

-- =====================================================
-- PART 4: WEBHOOK IDEMPOTENCY (System Tables)
-- =====================================================

-- Processed webhook events - System use only
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System manage webhook events" ON processed_webhook_events;
CREATE POLICY "System manage webhook events" ON processed_webhook_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- PART 5: SERVICE ROLE BYPASS
-- These policies allow server-side operations
-- =====================================================

-- Service role full access for backend operations
CREATE POLICY "Service role tc_leads" ON tc_leads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role crm_accounts" ON crm_accounts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role web_customers" ON web_customers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role commissions" ON commissions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role payment_tracking" ON payment_tracking
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role retention_tracking" ON retention_tracking
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role processed_webhook_events" ON processed_webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- NOTES FOR FUTURE RLS EXPANSION
-- =====================================================
--
-- When to add more RLS:
-- 1. 5+ agents - Add team/manager hierarchy
-- 2. Client portal - Add customer self-service access
-- 3. Multi-location - Add location-based isolation
-- 4. Sensitive payment data - Add finance-only policies
--
