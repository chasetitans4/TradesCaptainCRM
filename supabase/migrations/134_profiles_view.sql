-- =====================================================
-- PROFILES VIEW
-- Migration 134: Create profiles view over users table
--
-- Purpose: Resolve technical debt where code references
-- 'profiles' table but it doesn't exist. Creates a view
-- that maps to the users table.
--
-- Sales Unblocker Add-On - Technical Debt Resolution
-- =====================================================

-- Drop the view if it exists (for idempotency)
DROP VIEW IF EXISTS profiles;

-- Create profiles view over users table
-- Includes both 'name' and 'full_name' for backwards compatibility
CREATE VIEW profiles AS
SELECT
  id,
  created_at,
  updated_at,
  email,
  auth_user_id,
  name,
  name AS full_name,  -- Alias for code expecting full_name
  phone,
  avatar_url,
  business_id,
  role,
  status,
  invited_by,
  invited_at,
  invite_token,
  accepted_at,
  notification_settings
FROM users;

-- Grant appropriate permissions for Supabase RLS
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON profiles TO service_role;

-- Add comment for documentation
COMMENT ON VIEW profiles IS 'View over users table for backwards compatibility. Code references profiles but the actual data lives in users.';

-- =====================================================
-- Note: This is a view, not a table. Updates should
-- be made to the users table directly. The view is
-- read-only by design.
-- =====================================================
