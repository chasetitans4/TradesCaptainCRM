-- =====================================================
-- ADMIN AUDIT LOG TABLE
-- Per Phase 7A of Production Readiness Plan
-- Required for compliance and security tracking
-- =====================================================

-- Create admin_activity_log table if it doesn't exist
-- This table is referenced in lib/admin/index.ts:logAdminActivity
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),
  target_id VARCHAR(255),
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin
  ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action
  ON admin_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created
  ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target
  ON admin_activity_log(target_type, target_id);

-- Enable RLS
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can only read their own activity logs via authenticated role
-- Service role (used by server) bypasses RLS for full access
CREATE POLICY admin_activity_log_read_own ON admin_activity_log
  FOR SELECT
  TO authenticated
  USING (admin_user_id = auth.uid());

-- Allow insert via service role only (server-side logging)
-- No INSERT policy for authenticated = only service role can write

-- Rate limit cache table for webhook abuse prevention
CREATE TABLE IF NOT EXISTS rate_limit_cache (
  key VARCHAR(255) PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_window
  ON rate_limit_cache(window_start);

-- Enable RLS on rate_limit_cache
ALTER TABLE rate_limit_cache ENABLE ROW LEVEL SECURITY;

-- Only service role should access rate limit cache (no policies = service only)

-- Function to clean up old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_cache
  WHERE window_start < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Documentation
COMMENT ON TABLE admin_activity_log IS 'Audit trail for all admin actions - required for compliance per Section 6 of Product Identity';
COMMENT ON COLUMN admin_activity_log.action IS 'Action type: login, impersonated, created_account, updated_account, etc.';
COMMENT ON COLUMN admin_activity_log.target_type IS 'Entity type affected: crm_account, admin_user, submission, etc.';
COMMENT ON COLUMN admin_activity_log.target_id IS 'ID of the affected entity';
COMMENT ON COLUMN admin_activity_log.details IS 'Additional context as JSON (changes made, old values, etc.)';
COMMENT ON TABLE rate_limit_cache IS 'Temporary storage for rate limiting counters per phone/IP';
