-- =====================================================
-- MIGRATION 029: Portal Fixes & Missing Tables
-- Creates customer_feedback and ensures other portal needs are met
-- =====================================================

-- 1. Create customer_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  would_recommend BOOLEAN,
  
  source TEXT DEFAULT 'portal',
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'published'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_customer_feedback_job ON customer_feedback(job_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer ON customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_business ON customer_feedback(business_id);

-- Enable RLS
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Business users manage feedback" ON customer_feedback
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- 2. Ensure customer_equipment has necessary fields (already in 001, but just in case of older schemas)
-- (No changes needed if 001 is applied, but safe to leave as is)

-- 3. Grant permissions for portal service role (if using specific roles, otherwise handled by service key)
