-- =====================================================
-- PROMOTE ADMIN USER TO SUPER ADMIN
-- =====================================================
--
-- USAGE:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Replace 'admin@tradescaptain.com' with the admin user's email
-- 3. Run the script
-- 4. Verify the output shows the updated role
--
-- WARNING: Super admins have full system access including:
-- - Managing other admin users
-- - Accessing all business data
-- - System configuration
--
-- =====================================================

-- Promote to super_admin
UPDATE admin_users
SET
  role = 'super_admin',
  updated_at = NOW()
WHERE email = 'admin@tradescaptain.com'  -- <-- CHANGE THIS EMAIL
  AND status = 'active'
  AND role IN ('admin', 'agent', 'support', 'finance');  -- Safety: only promote non-super_admins

-- Verify the change
SELECT
  id,
  email,
  full_name,
  role,
  status,
  updated_at
FROM admin_users
WHERE email = 'admin@tradescaptain.com';

-- =====================================================
-- ALTERNATIVE: Demote super_admin back to admin
-- =====================================================
-- UPDATE admin_users
-- SET
--   role = 'admin',
--   updated_at = NOW()
-- WHERE email = 'admin@tradescaptain.com'
--   AND role = 'super_admin';
