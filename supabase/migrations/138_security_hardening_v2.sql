-- =====================================================
-- 138: SECURITY HARDENING v2
-- Fixes from static security audit:
-- 1. Revoke cross-tenant RPC from authenticated users
-- 2. Fix storage policy drop names (typo in migration 137)
-- 3. Remove sensitive columns from profiles view, revoke anon
-- =====================================================

-- =====================================================
-- 1. CRITICAL: generate_recurring_jobs() cross-tenant RPC
--    This SECURITY DEFINER function loops ALL active templates
--    across all businesses. Only service_role (cron) should call it.
-- =====================================================

REVOKE EXECUTE ON FUNCTION generate_recurring_jobs() FROM authenticated;

-- =====================================================
-- 2. HIGH: Storage policy drop-name typo
--    Migration 118 created policies named:
--      "Authenticated users can upload to <bucket>"
--      "Authenticated users can view <bucket>"
--    Migration 137 tried to drop them with WRONG names
--    (missing "to"). These broad policies are still active.
--    Drop them using the correct names.
-- =====================================================

-- voice-notes
DROP POLICY IF EXISTS "Authenticated users can upload to voice-notes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view voice-notes" ON storage.objects;

-- receipts
DROP POLICY IF EXISTS "Authenticated users can upload to receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view receipts" ON storage.objects;

-- signatures
DROP POLICY IF EXISTS "Authenticated users can upload to signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view signatures" ON storage.objects;

-- The tenant-scoped replacement policies from migration 137 are already in place.

-- =====================================================
-- 3. HIGH: profiles view exposes invite_token and
--    auth_user_id to anon role.
--    Recreate without sensitive columns and revoke anon.
-- =====================================================

DROP VIEW IF EXISTS profiles;

CREATE VIEW profiles AS
SELECT
  id,
  created_at,
  updated_at,
  email,
  name,
  name AS full_name,
  phone,
  avatar_url,
  business_id,
  role,
  status,
  invited_by,
  invited_at,
  accepted_at,
  notification_settings
FROM users;

-- Grant to authenticated and service_role only — no anon access
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO service_role;

COMMENT ON VIEW profiles IS 'View over users table for backwards compatibility. Sensitive columns (invite_token, auth_user_id) excluded. No anonymous access.';
