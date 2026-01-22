                                                                                                                                                                                                                                                                                                                                                                        -- Bypass onboarding for all businesses
UPDATE businesses
SET 
  onboarding_completed = true,
  onboarding_completed_at = NOW(),
  walkthrough_completed = true,
  walkthrough_completed_at = NOW();
