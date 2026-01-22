-- =====================================================
-- USEFUL ADMIN QUERIES
-- Reference queries for common administrative tasks
-- =====================================================

-- =====================================================
-- 1. LIST ALL BUSINESS OWNERS WITH ONBOARDING STATUS
-- =====================================================
SELECT
  u.email,
  u.name,
  b.name AS business_name,
  b.onboarding_completed,
  b.walkthrough_completed,
  b.questionnaire_completed,
  b.created_at AS business_created
FROM users u
JOIN businesses b ON u.business_id = b.id
WHERE u.role = 'owner'
ORDER BY b.created_at DESC;


-- =====================================================
-- 2. LIST ALL INTERNAL ADMIN USERS
-- =====================================================
SELECT
  id,
  email,
  full_name,
  role,
  status,
  last_login_at,
  created_at
FROM admin_users
ORDER BY role, full_name;


-- =====================================================
-- 3. FIND USER BY EMAIL (SEARCHES BOTH TABLES)
-- =====================================================
-- Replace 'search@example.com' with the email to find
SELECT 'business_user' AS user_type, id, email, name AS full_name, role, status, business_id
FROM users WHERE email ILIKE '%search@example.com%'
UNION ALL
SELECT 'admin_user' AS user_type, id, email, full_name, role, status, NULL::uuid
FROM admin_users WHERE email ILIKE '%search@example.com%';


-- =====================================================
-- 4. RESET FAILED LOGIN ATTEMPTS
-- =====================================================
-- Unlock a user who has been locked out due to failed logins
UPDATE users
SET
  failed_login_attempts = 0,
  locked_until = NULL,
  updated_at = NOW()
WHERE email = 'user@example.com';  -- <-- CHANGE THIS EMAIL


-- =====================================================
-- 5. DEACTIVATE A BUSINESS USER
-- =====================================================
UPDATE users
SET
  status = 'deactivated',
  updated_at = NOW()
WHERE email = 'user@example.com';  -- <-- CHANGE THIS EMAIL


-- =====================================================
-- 6. REACTIVATE A BUSINESS USER
-- =====================================================
UPDATE users
SET
  status = 'active',
  failed_login_attempts = 0,
  locked_until = NULL,
  updated_at = NOW()
WHERE email = 'user@example.com';  -- <-- CHANGE THIS EMAIL


-- =====================================================
-- 7. LIST BUSINESSES WITH INCOMPLETE ONBOARDING
-- =====================================================
SELECT
  b.id,
  b.name AS business_name,
  u.email AS owner_email,
  b.onboarding_completed,
  b.walkthrough_completed,
  b.questionnaire_completed,
  b.created_at
FROM businesses b
JOIN users u ON u.business_id = b.id AND u.role = 'owner'
WHERE b.onboarding_completed = FALSE
   OR b.walkthrough_completed = FALSE
   OR b.questionnaire_completed = FALSE
ORDER BY b.created_at DESC;


-- =====================================================
-- 8. COUNT USERS BY ROLE AND STATUS
-- =====================================================
SELECT
  role,
  status,
  COUNT(*) as count
FROM users
GROUP BY role, status
ORDER BY role, status;


-- =====================================================
-- 9. LIST RECENTLY CREATED BUSINESSES (LAST 30 DAYS)
-- =====================================================
SELECT
  b.id,
  b.name AS business_name,
  u.email AS owner_email,
  u.name AS owner_name,
  b.onboarding_completed,
  b.created_at
FROM businesses b
JOIN users u ON u.business_id = b.id AND u.role = 'owner'
WHERE b.created_at > NOW() - INTERVAL '30 days'
ORDER BY b.created_at DESC;


-- =====================================================
-- 10. ADMIN USER ACTIVITY (LAST 7 DAYS)
-- =====================================================
SELECT
  au.email,
  au.full_name,
  au.role,
  al.action,
  al.created_at,
  al.ip_address
FROM admin_activity_log al
JOIN admin_users au ON al.admin_user_id = au.id
WHERE al.created_at > NOW() - INTERVAL '7 days'
ORDER BY al.created_at DESC
LIMIT 100;


-- =====================================================
-- 11. RESET ADMIN USER PASSWORD (REQUIRES NEW HASH)
-- =====================================================
-- First generate hash: node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('NewPassword123!', 12).then(console.log)"
-- UPDATE admin_users
-- SET
--   password_hash = '$2a$12$NEW_BCRYPT_HASH_HERE',
--   updated_at = NOW()
-- WHERE email = 'admin@tradescaptain.com';


-- =====================================================
-- 12. DISABLE 2FA FOR ADMIN USER (EMERGENCY ACCESS)
-- =====================================================
-- UPDATE admin_users
-- SET
--   two_factor_enabled = FALSE,
--   two_factor_secret = NULL,
--   updated_at = NOW()
-- WHERE email = 'admin@tradescaptain.com';
