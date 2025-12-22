-- =====================================================
-- SECURITY & AUTHENTICATION SCHEMA
-- Migration: 003_security_authentication.sql
-- Features: 2FA, PIN, Sessions, Audit Logging
-- =====================================================

-- =============================================
-- TWO-FACTOR AUTHENTICATION
-- =============================================

-- User 2FA settings
CREATE TABLE IF NOT EXISTS user_two_factor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 2FA enabled status
  is_enabled BOOLEAN DEFAULT false,

  -- Preferred method when multiple are set up
  preferred_method TEXT, -- 'totp', 'sms', 'email'

  -- TOTP (Google Authenticator / Authy)
  totp_secret TEXT, -- Encrypted
  totp_verified BOOLEAN DEFAULT false,
  totp_enabled_at TIMESTAMPTZ,

  -- SMS
  sms_enabled BOOLEAN DEFAULT false,
  sms_phone TEXT, -- Phone number for SMS codes
  sms_verified BOOLEAN DEFAULT false,
  sms_enabled_at TIMESTAMPTZ,

  -- Email
  email_enabled BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  email_enabled_at TIMESTAMPTZ,

  -- Backup codes (hashed)
  backup_codes JSONB, -- Array of { hash, used_at }
  backup_codes_generated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 2FA verification attempts (for rate limiting)
CREATE TABLE IF NOT EXISTS two_factor_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  method TEXT NOT NULL, -- 'totp', 'sms', 'email', 'backup'
  code_hash TEXT, -- Hash of the code sent (for SMS/email)

  success BOOLEAN,
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- When the code expires
);

CREATE INDEX IF NOT EXISTS idx_2fa_attempts_user ON two_factor_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_2fa_attempts_cleanup ON two_factor_attempts(expires_at) WHERE success IS NULL;

-- =============================================
-- 4-DIGIT PIN (Quick Access)
-- =============================================

CREATE TABLE IF NOT EXISTS user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  pin_hash TEXT NOT NULL, -- bcrypt hash of 4-digit PIN

  -- When PIN can be used
  is_enabled BOOLEAN DEFAULT false,

  -- Auto-lock settings
  auto_lock_minutes INTEGER DEFAULT 5, -- Lock screen after X minutes
  require_pin_for TEXT[] DEFAULT ARRAY['unlock'], -- 'unlock', 'sensitive_actions', 'payments'

  -- Security
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ, -- Temporary lockout after failed attempts
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- =============================================
-- SESSION MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session identification
  session_token_hash TEXT NOT NULL UNIQUE, -- Hash of the session token

  -- Device info
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  device_name TEXT, -- 'Chrome on Windows', 'Safari on iPhone'
  browser TEXT,
  os TEXT,

  -- Location (from IP)
  ip_address TEXT,
  city TEXT,
  country TEXT,

  -- Status
  is_current BOOLEAN DEFAULT false, -- Is this the current session?
  is_active BOOLEAN DEFAULT true,

  -- 2FA status for this session
  two_factor_verified BOOLEAN DEFAULT false,
  two_factor_verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- What caused session end
  ended_reason TEXT -- 'logout', 'expired', 'revoked', 'password_change', 'security'
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_cleanup ON user_sessions(expires_at) WHERE is_active = true;

-- =============================================
-- SECURITY AUDIT LOG
-- =============================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  -- What
  event_type TEXT NOT NULL,
  -- Types: 'login_success', 'login_failed', 'logout', 'password_change',
  -- 'password_reset_request', 'password_reset_complete', '2fa_enabled',
  -- '2fa_disabled', '2fa_success', '2fa_failed', 'pin_set', 'pin_failed',
  -- 'session_revoked', 'suspicious_activity', 'account_locked', 'account_unlocked',
  -- 'email_change', 'phone_change', 'permission_change', 'data_export'

  -- Details
  description TEXT,
  metadata JSONB, -- Additional context

  -- Where
  ip_address TEXT,
  user_agent TEXT,
  location TEXT, -- City, Country

  -- Risk assessment
  risk_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_business ON security_events(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_risk ON security_events(risk_level, created_at DESC) WHERE risk_level IN ('high', 'critical');

-- =============================================
-- PASSWORD POLICIES
-- =============================================

-- Add columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Password history (prevent reuse)
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id, created_at DESC);

-- =============================================
-- TRUSTED DEVICES
-- =============================================

CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  device_fingerprint TEXT NOT NULL, -- Hash of device characteristics
  device_name TEXT,
  device_type TEXT,

  -- Skip 2FA on trusted devices
  trust_expires_at TIMESTAMPTZ,

  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE user_two_factor ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own 2FA settings" ON user_two_factor
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own 2FA settings" ON user_two_factor
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own 2FA settings" ON user_two_factor
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own PIN settings" ON user_pins
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own PIN" ON user_pins
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own sessions" ON user_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own security events" ON security_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own trusted devices" ON trusted_devices
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own trusted devices" ON trusted_devices
  FOR ALL USING (user_id = auth.uid());

-- Admins can view team security events
CREATE POLICY "Admins can view business security events" ON security_events
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Service role can manage all (for server-side operations)
CREATE POLICY "Service role full access 2FA" ON user_two_factor
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access pins" ON user_pins
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access sessions" ON user_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access security events" ON security_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access trusted devices" ON trusted_devices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access 2FA attempts" ON two_factor_attempts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access password history" ON password_history
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- CLEANUP FUNCTIONS
-- =============================================

-- Function to clean up expired 2FA attempts
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM two_factor_attempts
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE user_sessions
  SET is_active = false, ended_reason = 'expired'
  WHERE is_active = true
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at on user_two_factor
CREATE OR REPLACE FUNCTION update_two_factor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_two_factor_updated_at
  BEFORE UPDATE ON user_two_factor
  FOR EACH ROW
  EXECUTE FUNCTION update_two_factor_updated_at();

-- Update updated_at on user_pins
CREATE TRIGGER trigger_update_pins_updated_at
  BEFORE UPDATE ON user_pins
  FOR EACH ROW
  EXECUTE FUNCTION update_two_factor_updated_at();
