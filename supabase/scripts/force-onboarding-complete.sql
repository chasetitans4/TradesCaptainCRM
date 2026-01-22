-- =====================================================
-- FORCE ONBOARDING COMPLETE (ROBUST VERSION)
-- =====================================================
-- This script will:
-- 1. Find the user by email
-- 2. Create a business if one doesn't exist
-- 3. Link the user to the business as 'owner'
-- 4. Mark all onboarding steps as complete
-- =====================================================

DO $$
DECLARE
  v_user_email TEXT := 'user@example.com';  -- <-- CHANGE THIS EMAIL
  v_user_id UUID;
  v_business_id UUID;
  v_user_name TEXT;
BEGIN
  -- 1. Find the user
  SELECT id, business_id, name INTO v_user_id, v_business_id, v_user_name
  FROM users
  WHERE email = v_user_email;

  -- Check if user exists
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please sign up first.', v_user_email;
  END IF;

  RAISE NOTICE 'Found user: % (ID: %)', v_user_email, v_user_id;

  -- 2. Create business if missing
  IF v_business_id IS NULL THEN
    RAISE NOTICE 'User has no business. Creating one...';
    
    INSERT INTO businesses (
      name, 
      email, 
      phone, 
      address, 
      city, 
      state, 
      zip,
      onboarding_completed,
      walkthrough_completed,
      questionnaire_completed
    ) VALUES (
      COALESCE(v_user_name, 'My Business') || '''s Business', -- Default name
      v_user_email,
      '', -- Phone
      '', -- Address
      '', -- City
      '', -- State
      '', -- Zip
      TRUE, -- Skip onboarding
      TRUE,
      TRUE
    )
    RETURNING id INTO v_business_id;

    -- Update user with new business ID and set as owner
    UPDATE users
    SET 
      business_id = v_business_id,
      role = 'owner',
      status = 'active'
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Created new business (ID: %) and linked to user.', v_business_id;
  ELSE
    RAISE NOTICE 'User already has business (ID: %). Updating status...', v_business_id;
    
    -- Ensure user is owner
    UPDATE users
    SET role = 'owner'
    WHERE id = v_user_id AND role != 'owner';
  END IF;

  -- 3. Mark onboarding as complete (Idempotent)
  UPDATE businesses
  SET
    onboarding_completed = TRUE,
    onboarding_completed_at = NOW(),
    walkthrough_completed = TRUE,
    walkthrough_completed_at = NOW(),
    questionnaire_completed = TRUE,
    questionnaire_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_business_id;

  RAISE NOTICE '✓ SUCCESS: Onboarding bypassed for %', v_user_email;

END $$;
