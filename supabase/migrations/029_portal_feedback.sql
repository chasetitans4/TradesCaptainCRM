-- =====================================================
-- MIGRATION 029: Portal Feedback
-- Adds table for collecting user feedback from the portal
-- =====================================================

CREATE TABLE IF NOT EXISTS portal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  category VARCHAR(50), -- 'bug', 'feature', 'general'
  comment TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Browser info, path, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'new' -- 'new', 'reviewed', 'archived'
);

CREATE INDEX IF NOT EXISTS idx_portal_feedback_business ON portal_feedback(business_id);
CREATE INDEX IF NOT EXISTS idx_portal_feedback_created ON portal_feedback(created_at DESC);

COMMENT ON TABLE portal_feedback IS 'Feedback submissions from the customer portal';
