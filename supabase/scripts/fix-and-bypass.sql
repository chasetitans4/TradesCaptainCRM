-- =====================================================
-- FIX ACCOUNT & BYPASS ONBOARDING (ALL-IN-ONE FIX)
-- =====================================================
-- This script fixes "User not found" errors by:
-- 1. Checking the Auth system (auth.users)
-- 2. Creating the missing public user record if needed
-- 3. Creating a business if needed
-- 4. Marking onboarding as complete
-- =====================================================

DO $$
DECLARE
  -- ---------------------------------------------------
  -- ▼▼▼ ENTER YOUR EMAIL HERE ▼▼▼
  -- ---------------------------------------------------
  v_target_email TEXT := 'user@example.com'; 
  -- ---------------------------------------------------
  
  v_auth_id UUID;
  v_user_id UUID;
  v_business_id UUID;
  v_name TEXT;
BEGIN
  -- 1. Check if user exists in Supabase Auth (the login system)
  SELECT id INTO v_auth_id FROM auth.users WHERE email = v_target_email;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION '❌ Account not found for % in auth system. You must Sign Up in the app first.', v_target_email;
  END IF;

  -- 2. Check if user exists in our public data table
  SELECT id, business_id, name INTO v_user_id, v_business_id, v_name
  FROM public.users 
  WHERE email = v_target_email;

  -- 3. Fix missing user record (Sync Issue)
  IF v_user_id IS NULL THEN
    RAISE NOTICE '⚠ User record missing in public table. Creating it now...';
    
    INSERT INTO public.users (
      id, 
      auth_user_id, 
      email, 
      name, 
      role, 
      status,
      user_type
    ) VALUES (
      gen_random_uuid(),
      v_auth_id,
      v_target_email,
      split_part(v_target_email, '@', 1), -- Use part of email as name
      'owner',
      'active',
      'technician'
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- 4. Fix missing business
  IF v_business_id IS NULL THEN
    RAISE NOTICE '⚠ User has no business. Creating one...';
    
    INSERT INTO public.businesses (
      name,
      email,
      onboarding_completed,
      walkthrough_completed,
      questionnaire_completed
    ) VALUES (
      'My Business',
      v_target_email,
      TRUE,
      TRUE,
      TRUE
    )
    RETURNING id INTO v_business_id;

    -- Link user to new business
    UPDATE public.users 
    SET business_id = v_business_id, role = 'owner' 
    WHERE id = v_user_id;
  ELSE
    -- Ensure existing business is marked complete
    UPDATE public.businesses
    SET 
      onboarding_completed = TRUE,
      walkthrough_completed = TRUE,
      questionnaire_completed = TRUE,
      updated_at = NOW()
    WHERE id = v_business_id;
  END IF;

  -- 5. Final Confirmation
  RAISE NOTICE '✅ SUCCESS! Account fixed and onboarding bypassed for %', v_target_email;
  RAISE NOTICE 'You can now log in and access the dashboard.';

END $$;
