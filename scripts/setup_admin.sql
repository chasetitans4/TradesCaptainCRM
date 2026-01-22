-- =====================================================
-- TRADES CAPTAIN - ADMIN SETUP SCRIPT
-- =====================================================

-- 1. Create an Admin User
-- Email: admin@tradescaptain.com
-- Password: password123
-- Role: super_admin

INSERT INTO public.admin_users (
  email,
  full_name,
  role,
  password_hash,
  status,
  created_at,
  updated_at
) VALUES (
  'admin@tradescaptain.com',
  'System Admin',
  'super_admin',
  'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', -- SHA-256 for 'password123'
  'active',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  password_hash = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
  status = 'active';


-- 2. Bypass Onboarding for a User
-- Replace 'user@example.com' with the target user's email

UPDATE public.businesses
SET onboarding_completed = true
WHERE id = (
  SELECT business_id 
  FROM public.users 
  WHERE email = 'user@example.com'
);
