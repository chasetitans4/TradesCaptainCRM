-- =====================================================
-- BYPASS ONBOARDING FOR A BUSINESS
-- Run in Supabase SQL Editor or via psql
-- =====================================================
--
-- USAGE:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Replace 'user@example.com' below with the business owner's email
-- 3. Run the script
-- 4. Check output for success/error messages
--
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_user_email TEXT := 'user@example.com';  -- <-- CHANGE THIS EMAIL
BEGIN
  -- Find the user and their business
  SELECT u.id, u.business_id INTO v_user_id, v_business_id
  FROM users u
  WHERE u.email = v_user_email
    AND u.role = 'owner';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', v_user_email;
  END IF;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'User % is not a business owner or has no business associated', v_user_email;
  END IF;

  -- Mark all onboarding as complete
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

  RAISE NOTICE '✓ Onboarding bypassed successfully!';
  RAISE NOTICE '  User: %', v_user_email;
  RAISE NOTICE '  Business ID: %', v_business_id;
END $$;

-- Verify the change (run this separately to see results)
-- SELECT
--   b.id,
--   b.name AS business_name,
--   b.onboarding_completed,
--   b.walkthrough_completed,
--   b.questionnaire_completed,
--   u.email AS owner_email
-- FROM businesses b
-- JOIN users u ON u.business_id = b.id AND u.role = 'owner'
-- WHERE u.email = 'user@example.com';
