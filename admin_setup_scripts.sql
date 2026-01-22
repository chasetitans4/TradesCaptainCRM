-- ============================================================================
-- ADMIN SETUP & ONBOARDING BYPASS SCRIPTS
-- ============================================================================

-- 1. BYPASS ONBOARDING FOR A SPECIFIC USER/BUSINESS
-- Replace 'YOUR_EMAIL_HERE' with the user's email address
-- This finds the business associated with the user and marks onboarding as complete.

UPDATE public.businesses
SET onboarding_completed = true
WHERE id IN (
    SELECT business_id 
    FROM public.users 
    WHERE email = 'YOUR_EMAIL_HERE'
);

-- 2. PROMOTE USER TO ADMIN
-- Replace 'YOUR_EMAIL_HERE' with the user's email address

UPDATE public.users
SET role = 'admin' -- or 'super_admin'
WHERE email = 'YOUR_EMAIL_HERE';

-- 3. VERIFY ADMIN STATUS
-- Check the user's role and business association

SELECT id, email, role, business_id 
FROM public.users 
WHERE email = 'YOUR_EMAIL_HERE';

-- 4. (OPTIONAL) RESET ONBOARDING
-- If you need to test the onboarding flow again

UPDATE public.businesses
SET onboarding_completed = false
WHERE id IN (
    SELECT business_id 
    FROM public.users 
    WHERE email = 'YOUR_EMAIL_HERE'
);
