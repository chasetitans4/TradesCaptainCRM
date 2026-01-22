-- Migration 107: Portal Security Enhancements
-- Adds support for account lockout, email verification, password reset, and audit logging

-- 1. Enhance customer_portal_access table
ALTER TABLE customer_portal_access
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pending_email TEXT,
ADD COLUMN IF NOT EXISTS pending_email_token TEXT,
ADD COLUMN IF NOT EXISTS pending_email_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_portal_access_magic_link_token ON customer_portal_access(magic_link_token);
CREATE INDEX IF NOT EXISTS idx_portal_access_pending_email_token ON customer_portal_access(pending_email_token);
CREATE INDEX IF NOT EXISTS idx_portal_access_password_reset_token ON customer_portal_access(password_reset_token);

-- 2. Create portal_activity_log table
CREATE TABLE IF NOT EXISTS portal_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for activity log
CREATE INDEX IF NOT EXISTS idx_portal_activity_log_customer ON portal_activity_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_activity_log_business ON portal_activity_log(business_id);
CREATE INDEX IF NOT EXISTS idx_portal_activity_log_created_at ON portal_activity_log(created_at);

-- 3. RLS Policies

-- Enable RLS on activity log
ALTER TABLE portal_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Business owners can view activity logs for their customers
DROP POLICY IF EXISTS "Business owners can view their customers' portal activity" ON portal_activity_log;
CREATE POLICY "Business owners can view their customers' portal activity"
ON portal_activity_log FOR SELECT
USING (
    business_id IN (
        SELECT business_id 
        FROM users 
        WHERE auth_user_id = auth.uid()
    )
);

-- Policy: System can insert logs (this usually happens via service role, but for completeness)
-- Note: Most inserts happen via admin client in Next.js, bypassing RLS.

-- 4. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_activity_log TO service_role;
