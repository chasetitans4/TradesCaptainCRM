-- =====================================================
-- ADMIN TABLE ROW LEVEL SECURITY
-- Per Phase 7D of Production Readiness Plan
-- Protects sensitive admin data from unauthorized access
-- =====================================================

-- Enable RLS on admin_users if not already enabled
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent migration)
DROP POLICY IF EXISTS admin_users_read_self ON admin_users;
DROP POLICY IF EXISTS admin_users_select_all ON admin_users;

-- Admins can only read their own record via authenticated role
-- Service role bypasses RLS for admin operations
CREATE POLICY admin_users_read_self ON admin_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Note: No INSERT/UPDATE/DELETE policies for authenticated role
-- All mutations go through service role (server-side APIs)

-- Revoke direct column access to sensitive fields from authenticated users
-- This prevents even SELECT of these columns via authenticated role
DO $$
BEGIN
  -- Only revoke if the role exists (safe for different environments)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE SELECT (password_hash) ON admin_users FROM authenticated;
    REVOKE SELECT (two_factor_secret) ON admin_users FROM authenticated;
  END IF;
END $$;

-- Create a safe view for admin user info (no sensitive fields)
CREATE OR REPLACE VIEW admin_users_safe AS
SELECT
  id,
  email,
  name,
  role,
  status,
  is_active,
  last_login_at,
  created_at
FROM admin_users;

-- Grant access to the safe view
GRANT SELECT ON admin_users_safe TO authenticated;

-- Enable RLS on founders_program table
ALTER TABLE founders_program ENABLE ROW LEVEL SECURITY;

-- Everyone can read founders program status (it's public info)
CREATE POLICY founders_program_read_all ON founders_program
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can modify founders_program
-- No INSERT/UPDATE/DELETE policies = service role only

-- Enable RLS on agent_submissions
ALTER TABLE agent_submissions ENABLE ROW LEVEL SECURITY;

-- Agents can only see their own submissions
CREATE POLICY agent_submissions_own ON agent_submissions
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- Only service role can create/modify submissions

-- Enable RLS on crm_accounts for admin portal
-- Note: CRM accounts have their own RLS in the main schema
-- This is additional protection for admin portal access
DROP POLICY IF EXISTS crm_accounts_admin_read ON crm_accounts;

-- Admin users can read all accounts (they have admin role)
-- This policy checks that the user is an active admin
CREATE POLICY crm_accounts_admin_read ON crm_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Documentation
COMMENT ON VIEW admin_users_safe IS 'Read-only view of admin users without sensitive fields (password_hash, two_factor_secret)';
COMMENT ON POLICY admin_users_read_self ON admin_users IS 'Admins can only read their own full record; use admin_users_safe view for listing other admins';
