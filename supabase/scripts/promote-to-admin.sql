-- =====================================================
-- PROMOTE USER TO ADMIN WITHIN A BUSINESS
-- This makes them admin of their business (not internal admin)
-- =====================================================
--
-- USAGE:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Replace 'user@example.com' below with the user's email
-- 3. Run the script
-- 4. Check output for the updated user
--
-- ROLES:
-- - owner: Full business access (cannot be changed with this script)
-- - admin: Full access except billing/ownership transfer
-- - technician: Field worker access only
--
-- =====================================================

-- Replace 'user@example.com' with the user's email
UPDATE users
SET
  role = 'admin',
  status = 'active',
  updated_at = NOW()
WHERE email = 'user@example.com'  -- <-- CHANGE THIS EMAIL
  AND role = 'technician';  -- Safety: only promote technicians, don't touch owners

-- Verify the change
SELECT
  id,
  email,
  name,
  role,
  status,
  business_id,
  updated_at
FROM users
WHERE email = 'user@example.com';

-- =====================================================
-- ALTERNATIVE: Promote by user ID (if you have it)
-- =====================================================
-- UPDATE users
-- SET
--   role = 'admin',
--   status = 'active',
--   updated_at = NOW()
-- WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'  -- <-- CHANGE THIS UUID
--   AND role = 'technician';
